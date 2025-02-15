import { Payment, IPayment, PaymentStatus, PaymentType } from '../models/Payment';
import { Timesheet } from '../models/Timesheet';
import { notificationService, NotificationType } from './notification.service';
import { AppError } from '../middleware/errorHandler';
import { stripeService } from './stripe.service';
import { generateInvoice } from '../utils/invoice-generator';

export class PaymentService {
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
      payment.amount = timesheet.totalAmount;
    }

    await payment.save();

    await notificationService.queueNotification({
      userId: payment.workerId,
      type: NotificationType.PAYMENT_PROCESSED,
      data: { payment }
    });

    return payment;
  }

  static async processPayment(paymentId: string): Promise<IPayment> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    try {
      payment.status = PaymentStatus.PROCESSING;
      await payment.save();

      // Process payment through Stripe
      const stripePayment = await stripeService.createPayment({
        amount: payment.amount,
        currency: 'usd',
        description: payment.description,
        metadata: {
          paymentId: payment._id.toString(),
          workerId: payment.workerId
        }
      });

      payment.status = PaymentStatus.COMPLETED;
      payment.processedDate = new Date();
      payment.metadata.transactionId = stripePayment.id;
      await payment.save();

      // Generate and send invoice
      const invoice = await generateInvoice(payment);
      payment.metadata.invoiceNumber = invoice.number;
      await payment.save();

      await notificationService.queueNotification({
        userId: payment.workerId,
        type: NotificationType.PAYMENT_PROCESSED,
        data: { payment, invoice }
      });

      return payment;
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      await payment.save();
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
} 