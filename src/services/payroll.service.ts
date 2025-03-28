import { Payroll, PayrollStatus, PaymentMethod, PaymentStatus, IPayroll } from '../models/Payroll';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Timesheet } from '../models/Timesheet';
import { Job } from '../models/Job';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from './notification.service';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';
import mongoose, { Document, Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

// Placeholder for payroll calculator utility
// In a real implementation, this would be imported from '../utils/payroll-calculator'
const calculatePayrollDeductions = (totalAmount: number) => {
  return {
    tax: totalAmount * 0.2,
    insurance: totalAmount * 0.05,
    other: 0,
    totalDeductions: totalAmount * 0.25
  };
};

// Create an instance of NotificationService
const notificationService = {
  send: async (notification: any) => {
    logger.info(`Sending notification: ${JSON.stringify(notification)}`);
    // In a real implementation, this would send the notification
    return true;
  }
};

// Define a type that includes the _id property from Document
interface PayrollDocument extends IPayroll, Document {}

@Injectable()
export class PayrollService {
  private static readonly OVERTIME_RATE_MULTIPLIER = 1.5;
  private static readonly MIN_PERIOD_DAYS = 7;
  private static readonly MAX_PERIOD_DAYS = 31;
  private static readonly DEFAULT_TAX_RATE = 0.2; // 20% tax rate
  private static readonly DEFAULT_NI_RATE = 0.12; // 12% National Insurance rate

  constructor(
    @InjectModel('Payroll') private readonly payrollModel: Model<PayrollDocument>,
    private readonly notificationService: NotificationService
  ) {}

  static async createPayroll(
    workerId: string,
    clientId: string,
    userId: string,
    payrollData: Partial<IPayroll>
  ): Promise<IPayroll> {
    const [worker, client] = await Promise.all([
      User.findById(workerId),
      Client.findById(clientId)
    ]);

    if (!worker || !client) {
      throw new AppError(404, 'Worker or Client not found');
    }

    // Validate job if jobId is provided
    if (payrollData.jobId) {
      const job = await Job.findById(payrollData.jobId);
      if (!job) {
        throw new AppError(404, 'Job not found');
      }
    }

    // Validate period
    this.validatePayrollPeriod(payrollData.periodStart!, payrollData.periodEnd!);

    // Get timesheets for the period
    const timesheets = await Timesheet.find({
      workerId,
      clientId,
      ...(payrollData.jobId ? { jobId: payrollData.jobId } : {}),
      weekStarting: {
        $gte: payrollData.periodStart,
        $lte: payrollData.periodEnd
      },
      status: 'approved'
    });

    if (!timesheets.length) {
      throw new AppError(400, 'No approved timesheets found for the period');
    }

    // Calculate earnings
    const earnings = this.calculateEarnings(timesheets, payrollData.earnings?.regularRate!);

    // Calculate deductions
    const deductions = calculatePayrollDeductions(earnings.totalAmount);

    // Calculate detailed tax breakdown
    const taxBreakdown = this.calculateTaxBreakdown(
      earnings.totalAmount, 
      // Access taxCode from worker's profile or from payrollData
      (worker as any).taxCode || payrollData.deductions?.taxCode
    );

    const payroll = new Payroll({
      ...payrollData,
      workerId,
      clientId,
      earnings,
      deductions: {
        ...deductions,
        taxBreakdown
      },
      netAmount: earnings.totalAmount - deductions.totalDeductions,
      status: PayrollStatus.DRAFT,
      paymentDetails: {
        method: payrollData.paymentDetails?.method || PaymentMethod.DIRECT_DEPOSIT,
        status: PaymentStatus.PENDING
      },
      metadata: {
        createdBy: userId,
        createdAt: new Date(),
        lastModifiedBy: userId,
        lastModifiedAt: new Date()
      }
    });

    await payroll.save();

    return payroll;
  }

  static async approvePayroll(
    payrollId: string,
    userId: string
  ): Promise<IPayroll> {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      throw new AppError(404, 'Payroll not found');
    }

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new AppError(400, 'Only draft payrolls can be approved');
    }

    payroll.status = PayrollStatus.APPROVED;
    payroll.metadata.approvedBy = userId;
    payroll.metadata.approvedAt = new Date();
    payroll.metadata.lastModifiedBy = userId;
    payroll.metadata.lastModifiedAt = new Date();

    await payroll.save();

    // Notify worker
    await this.notifyPayrollApproval(payroll);

    return payroll;
  }

  static async processPayment(
    payrollId: string,
    userId: string,
    paymentDetails: {
      method: PaymentMethod;
      reference?: string;
      paymentDate?: Date;
    }
  ): Promise<IPayroll> {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      throw new AppError(404, 'Payroll not found');
    }

    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new AppError(400, 'Only approved payrolls can be processed for payment');
    }

    payroll.status = PayrollStatus.PAID;
    payroll.paymentDetails = {
      ...paymentDetails,
      processedAt: new Date(),
      status: PaymentStatus.PROCESSED,
      paymentDate: paymentDetails.paymentDate || new Date()
    };
    payroll.metadata.lastModifiedBy = userId;
    payroll.metadata.lastModifiedAt = new Date();

    await payroll.save();

    // Notify worker of payment
    await this.notifyPaymentProcessed(payroll);

    return payroll;
  }

  static async recordPaymentFailure(
    payrollId: string,
    userId: string,
    failureReason: string
  ): Promise<IPayroll> {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      throw new AppError(404, 'Payroll not found');
    }

    if (payroll.status !== PayrollStatus.APPROVED && payroll.status !== PayrollStatus.PROCESSING) {
      throw new AppError(400, 'Only approved or processing payrolls can be marked as failed');
    }

    // Update payment details
    payroll.paymentDetails = {
      ...payroll.paymentDetails,
      status: PaymentStatus.FAILED,
      failureReason: sanitizeHtml(failureReason)
    };
    
    payroll.metadata.lastModifiedBy = userId;
    payroll.metadata.lastModifiedAt = new Date();

    await payroll.save();

    // Notify admin of payment failure
    await notificationService.send({
      userId,
      title: 'Payment Failed',
      body: `Payment for payroll ${payrollId} has failed: ${failureReason}`,
      type: 'PAYMENT_FAILED',
      data: { payrollId: payroll._id?.toString() || payrollId }
    });

    return payroll;
  }

  static async getWorkerPayrolls(
    workerId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: PayrollStatus[];
      jobId?: string;
      paymentStatus?: PaymentStatus[];
    }
  ): Promise<IPayroll[]> {
    const query: any = { workerId };

    if (filters.startDate || filters.endDate) {
      query.periodStart = {};
      if (filters.startDate) {
        query.periodStart.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.periodStart.$lte = filters.endDate;
      }
    }

    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }

    if (filters.jobId) {
      query.jobId = filters.jobId;
    }

    if (filters.paymentStatus?.length) {
      query['paymentDetails.status'] = { $in: filters.paymentStatus };
    }

    return Payroll.find(query).sort({ periodStart: -1 });
  }

  static async updateTaxCode(
    payrollId: string,
    taxCode: string,
    userId: string
  ): Promise<IPayroll> {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      throw new AppError(404, 'Payroll not found');
    }

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new AppError(400, 'Tax code can only be updated for draft payrolls');
    }

    // Update tax code
    if (!payroll.deductions.taxCode) {
      payroll.deductions.taxCode = taxCode;
    }

    // Recalculate tax breakdown
    const taxBreakdown = this.calculateTaxBreakdown(
      payroll.earnings.totalAmount,
      taxCode
    );

    // Update deductions
    payroll.deductions.taxBreakdown = taxBreakdown;
    
    // Update metadata
    payroll.metadata.lastModifiedBy = userId;
    payroll.metadata.lastModifiedAt = new Date();

    await payroll.save();

    return payroll;
  }

  private static validatePayrollPeriod(start: Date, end: Date): void {
    const periodDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (periodDays < this.MIN_PERIOD_DAYS || periodDays > this.MAX_PERIOD_DAYS) {
      throw new AppError(400, `Payroll period must be between ${this.MIN_PERIOD_DAYS} and ${this.MAX_PERIOD_DAYS} days`);
    }

    if (end <= start) {
      throw new AppError(400, 'Period end date must be after start date');
    }
  }

  private static calculateEarnings(
    timesheets: any[],
    regularRate: number
  ): IPayroll['earnings'] {
    let regularHours = 0;
    let overtimeHours = 0;
    let bonusAmount = 0;

    timesheets.forEach(timesheet => {
      regularHours += timesheet.totalHours.regular || 0;
      overtimeHours += timesheet.totalHours.overtime || 0;
      bonusAmount += timesheet.totalHours.bonus || 0;
    });

    const overtimeRate = regularRate * this.OVERTIME_RATE_MULTIPLIER;
    const regularAmount = regularHours * regularRate;
    const overtimeAmount = overtimeHours * overtimeRate;
    const totalAmount = regularAmount + overtimeAmount + bonusAmount;

    return {
      regularHours,
      overtimeHours,
      regularRate,
      overtimeRate,
      regularAmount,
      overtimeAmount,
      bonusAmount,
      totalAmount
    };
  }

  private static calculateTaxBreakdown(
    totalAmount: number,
    taxCode?: string
  ): IPayroll['deductions']['taxBreakdown'] {
    // This is a simplified tax calculation
    // In a real system, this would use the tax code to determine tax-free allowance
    // and apply the correct tax bands
    
    // Default tax calculation
    const incomeTax = totalAmount * this.DEFAULT_TAX_RATE;
    const nationalInsurance = totalAmount * this.DEFAULT_NI_RATE;
    
    // If we have a tax code, we could do more sophisticated calculations
    // For now, this is just a placeholder
    if (taxCode) {
      logger.info(`Calculating tax with tax code: ${taxCode}`);
      // In a real implementation, this would use the tax code
    }
    
    return {
      incomeTax,
      nationalInsurance,
      studentLoan: 0, // Would be calculated based on worker's student loan status
      pension: 0,     // Would be calculated based on worker's pension contributions
      other: 0
    };
  }

  private static async notifyPayrollApproval(payroll: PayrollDocument): Promise<void> {
    await notificationService.send({
      userId: payroll.workerId,
      title: 'Payroll Approved',
      body: `Your payroll for period ${payroll.periodStart.toLocaleDateString()} - ${payroll.periodEnd.toLocaleDateString()} has been approved`,
      type: 'PAYROLL_APPROVED',
      data: { payrollId: payroll._id?.toString() || '' }
    });
  }

  private static async notifyPaymentProcessed(payroll: PayrollDocument): Promise<void> {
    await notificationService.send({
      userId: payroll.workerId,
      title: 'Payment Processed',
      body: `Your payment of ${payroll.netAmount} has been processed`,
      type: 'PAYMENT_PROCESSED',
      data: { payrollId: payroll._id?.toString() || '' }
    });
  }
} 