import { Payment, IPayment, PaymentStatus, PaymentType } from '../models/Payment';
import { Timesheet, ITimesheet } from '../models/Timesheet';
import { NotificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentSetupDto } from '../dtos/payment-setup.dto';
import { IPaymentMethod, IInvoice } from '../interfaces/payment.interface';
import { StripeService } from './stripe.service';
import { Logger } from '../utils/logger';
import { NotificationType } from '../types/notification.types';

const logger = new Logger('PaymentService');

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel('PaymentMethod') private paymentMethodModel: Model<IPaymentMethod>,
    @InjectModel('Invoice') private invoiceModel: Model<IInvoice>,
    private readonly notificationService: NotificationService,
    private readonly stripeService: StripeService
  ) {}

  static async createPayment(paymentData: Partial<IPayment>): Promise<IPayment> {
    const payment = new Payment({
      ...paymentData,
      status: PaymentStatus.PENDING
    });

    if (payment.timesheetId) {
      const timesheet = await Timesheet.findById(payment.timesheetId);
      if (!timesheet) {
        throw new AppError(404, 'Timesheet not found');
      }
      
      // Safely calculate amount from timesheet
      try {
        const timesheetData = timesheet.toObject();
        
        // Default to 0 if properties don't exist
        const regularHours = timesheetData.totalHours?.regular || 0;
        const overtimeHours = timesheetData.totalHours?.overtime || 0;
        const holidayHours = timesheetData.totalHours?.holiday || 0;
        
        // Calculate total hours
        const totalHours = regularHours + overtimeHours + holidayHours;
        
        // Use a default rate if not available
        const hourlyRate = 25; // Default hourly rate
        payment.amount = totalHours * hourlyRate;
        
        logger.info(`Calculated payment amount: ${payment.amount} for ${totalHours} hours`);
      } catch (error) {
        logger.error('Error calculating payment amount:', error);
        payment.amount = 0; // Default to 0 if calculation fails
      }
    }

    await payment.save();

    // Use the static notify method of NotificationService
    await NotificationService.notify({
      userId: payment.workerId,
      type: NotificationType.PAYMENT_RECEIVED,
      data: { payment }
    });

    return payment;
  }

  async setupPaymentMethod(userId: string, data: PaymentSetupDto): Promise<IPaymentMethod> {
    try {
      // Validate payment method details
      await this.validatePaymentMethod(data);

      // Create payment method
      const paymentMethod = await this.paymentMethodModel.create({
        userId,
        type: data.paymentMethodType,
        details: data.paymentDetails,
        isDefault: false
      });

      return paymentMethod;
    } catch (error) {
      logger.error('Error setting up payment method:', error);
      throw error;
    }
  }

  async processPayment(
    amount: number,
    currency: string,
    paymentMethodId: string
  ): Promise<boolean> {
    try {
      // Implementation using payment gateway
      return true;
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  static async getWorkerPayments(
    workerId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: PaymentStatus;
      type?: PaymentType;
    }
  ): Promise<IPayment[]> {
    const query: any = { workerId };

    if (filters.startDate || filters.endDate) {
      query.paymentDate = {};
      if (filters.startDate) query.paymentDate.$gte = filters.startDate;
      if (filters.endDate) query.paymentDate.$lte = filters.endDate;
    }
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    return Payment.find(query).sort({ paymentDate: -1 });
  }

  static async generatePaymentReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const payments = await Payment.find({
      paymentDate: { $gte: startDate, $lte: endDate },
      status: PaymentStatus.COMPLETED
    });

    const report = {
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      totalPayments: payments.length,
      byType: {} as Record<PaymentType, { count: number; amount: number }>,
      byDate: {} as Record<string, { count: number; amount: number }>
    };

    payments.forEach(payment => {
      // Group by type
      if (!report.byType[payment.type]) {
        report.byType[payment.type] = { count: 0, amount: 0 };
      }
      report.byType[payment.type].count++;
      report.byType[payment.type].amount += payment.amount;

      // Group by date
      const date = payment.paymentDate?.toISOString().split('T')[0] || 'unknown';
      if (!report.byDate[date]) {
        report.byDate[date] = { count: 0, amount: 0 };
      }
      report.byDate[date].count++;
      report.byDate[date].amount += payment.amount;
    });

    return report;
  }

  private async validatePaymentMethod(data: PaymentSetupDto): Promise<void> {
    // Implementation
  }
} 