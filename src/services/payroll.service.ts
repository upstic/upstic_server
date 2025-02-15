import { Payroll, PayrollStatus, PaymentMethod, IPayroll } from '../models/Payroll';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Timesheet } from '../models/Timesheet';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { calculatePayrollDeductions } from '../utils/payroll-calculator';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';

export class PayrollService {
  private static readonly OVERTIME_RATE_MULTIPLIER = 1.5;
  private static readonly MIN_PERIOD_DAYS = 7;
  private static readonly MAX_PERIOD_DAYS = 31;

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

    // Validate period
    this.validatePayrollPeriod(payrollData.periodStart!, payrollData.periodEnd!);

    // Get timesheets for the period
    const timesheets = await Timesheet.find({
      workerId,
      clientId,
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

    const payroll = new Payroll({
      ...payrollData,
      workerId,
      clientId,
      earnings,
      deductions,
      netAmount: earnings.totalAmount - deductions.totalDeductions,
      status: PayrollStatus.DRAFT,
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
      processedAt: new Date()
    };
    payroll.metadata.lastModifiedBy = userId;
    payroll.metadata.lastModifiedAt = new Date();

    await payroll.save();

    // Notify worker of payment
    await this.notifyPaymentProcessed(payroll);

    return payroll;
  }

  static async getWorkerPayrolls(
    workerId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: PayrollStatus[];
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

    return Payroll.find(query).sort({ periodStart: -1 });
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

  private static async notifyPayrollApproval(payroll: IPayroll): Promise<void> {
    await notificationService.send({
      userId: payroll.workerId,
      title: 'Payroll Approved',
      body: `Your payroll for period ${payroll.periodStart.toLocaleDateString()} - ${payroll.periodEnd.toLocaleDateString()} has been approved`,
      type: 'PAYROLL_APPROVED',
      data: { payrollId: payroll._id }
    });
  }

  private static async notifyPaymentProcessed(payroll: IPayroll): Promise<void> {
    await notificationService.send({
      userId: payroll.workerId,
      title: 'Payment Processed',
      body: `Your payment of ${payroll.netAmount} has been processed`,
      type: 'PAYMENT_PROCESSED',
      data: { payrollId: payroll._id }
    });
  }
} 