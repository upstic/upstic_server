import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Stripe } from 'stripe';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { Rate } from '../models/Rate';
import { Shift } from '../models/Shift';
import { Logger } from '../utils/logger';
import { CacheService } from './cache.service';
import { EmailService } from './email.service';

@Injectable()
export class BillingService {
  private stripe: Stripe;
  private readonly PAYMENT_METHODS = ['stripe', 'bank_transfer', 'check'];
  private readonly INVOICE_STATUS = ['draft', 'pending', 'paid', 'overdue', 'cancelled'];
  private readonly CACHE_TTL = 3600;

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Rate.name) private rateModel: Model<Rate>,
    @InjectModel(Shift.name) private shiftModel: Model<Shift>,
    private configService: ConfigService,
    private cacheService: CacheService,
    private emailService: EmailService,
    private logger: Logger
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16'
    });
  }

  async generateInvoice(data: InvoiceGenerationData): Promise<Invoice> {
    try {
      const rate = await this.rateModel.findById(data.rateId);
      if (!rate) {
        throw new Error('Rate not found');
      }

      const shifts = await this.shiftModel.find({
        _id: { $in: data.shiftIds },
        status: 'completed'
      });

      if (shifts.length === 0) {
        throw new Error('No completed shifts found');
      }

      const invoiceItems = await this.calculateInvoiceItems(shifts, rate);
      const totals = this.calculateTotals(invoiceItems, rate);

      const invoice = await this.invoiceModel.create({
        clientId: data.clientId,
        workerId: data.workerId,
        rateId: rate._id,
        items: invoiceItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        dueDate: this.calculateDueDate(rate.terms.paymentTerms),
        status: 'draft',
        metadata: data.metadata
      });

      await this.sendInvoiceNotification(invoice);
      return invoice;
    } catch (error) {
      this.logger.error('Error generating invoice:', error);
      throw error;
    }
  }

  async processPayment(paymentData: PaymentProcessData): Promise<Payment> {
    try {
      const invoice = await this.invoiceModel.findById(paymentData.invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      let paymentResult;
      switch (paymentData.method) {
        case 'stripe':
          paymentResult = await this.processStripePayment(paymentData, invoice);
          break;
        case 'bank_transfer':
          paymentResult = await this.processBankTransfer(paymentData, invoice);
          break;
        case 'check':
          paymentResult = await this.processCheckPayment(paymentData, invoice);
          break;
        default:
          throw new Error('Invalid payment method');
      }

      const payment = await this.paymentModel.create({
        invoiceId: invoice._id,
        amount: paymentData.amount,
        method: paymentData.method,
        status: paymentResult.status,
        transactionId: paymentResult.transactionId,
        metadata: paymentResult.metadata
      });

      if (payment.status === 'succeeded') {
        await this.updateInvoiceStatus(invoice._id, 'paid');
      }

      await this.sendPaymentConfirmation(payment);
      return payment;
    } catch (error) {
      this.logger.error('Error processing payment:', error);
      throw error;
    }
  }

  private async calculateInvoiceItems(shifts: Shift[], rate: Rate): Promise<InvoiceItem[]> {
    return shifts.map(shift => {
      const hours = this.calculateShiftHours(shift);
      const amount = this.calculateShiftAmount(hours, rate, shift.type);

      return {
        shiftId: shift._id,
        description: `Shift on ${shift.schedule.startTime.toLocaleDateString()}`,
        hours,
        rate: amount / hours,
        amount
      };
    });
  }

  private calculateTotals(items: InvoiceItem[], rate: Rate): InvoiceTotals {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = this.calculateTax(subtotal, rate.applicableTaxes);
    
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  }

  private calculateTax(amount: number, taxes: any[]): number {
    return taxes.reduce((total, tax) => {
      const taxAmount = tax.isCompounded ?
        (amount + total) * (tax.percentage / 100) :
        amount * (tax.percentage / 100);
      return total + taxAmount;
    }, 0);
  }

  private calculateDueDate(paymentTerms: number): Date {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate;
  }

  private async processStripePayment(
    paymentData: PaymentProcessData,
    invoice: Invoice
  ): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: 'usd',
        payment_method: paymentData.stripeToken,
        confirm: true,
        metadata: {
          invoiceId: invoice._id.toString()
        }
      });

      return {
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed',
        transactionId: paymentIntent.id,
        metadata: {
          stripePaymentIntent: paymentIntent.id
        }
      };
    } catch (error) {
      this.logger.error('Stripe payment error:', error);
      throw error;
    }
  }

  private async processBankTransfer(
    paymentData: PaymentProcessData,
    invoice: Invoice
  ): Promise<PaymentResult> {
    // Implementation for bank transfer processing
    return {
      status: 'pending',
      transactionId: `BT-${Date.now()}`,
      metadata: {
        bankReference: paymentData.bankReference
      }
    };
  }

  private async processCheckPayment(
    paymentData: PaymentProcessData,
    invoice: Invoice
  ): Promise<PaymentResult> {
    // Implementation for check payment processing
    return {
      status: 'pending',
      transactionId: `CH-${Date.now()}`,
      metadata: {
        checkNumber: paymentData.checkNumber
      }
    };
  }

  private async updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
    await this.invoiceModel.findByIdAndUpdate(invoiceId, { status });
  }

  private async sendInvoiceNotification(invoice: Invoice): Promise<void> {
    await this.emailService.sendEmail({
      template: 'invoice-generated',
      to: invoice.clientEmail,
      subject: `Invoice #${invoice._id} Generated`,
      context: {
        invoice: invoice.toObject(),
        paymentLink: `${this.configService.get('APP_URL')}/invoices/${invoice._id}`
      }
    });
  }

  private async sendPaymentConfirmation(payment: Payment): Promise<void> {
    await this.emailService.sendEmail({
      template: 'payment-confirmation',
      to: payment.invoice.clientEmail,
      subject: 'Payment Confirmation',
      context: {
        payment: payment.toObject(),
        invoice: payment.invoice.toObject()
      }
    });
  }

  async getInvoiceAnalytics(clientId: string): Promise<InvoiceAnalytics> {
    const cacheKey = `invoice_analytics:${clientId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const invoices = await this.invoiceModel.find({ clientId });
    const analytics = this.calculateInvoiceAnalytics(invoices);

    await this.cacheService.set(cacheKey, JSON.stringify(analytics), this.CACHE_TTL);
    return analytics;
  }

  private calculateInvoiceAnalytics(invoices: Invoice[]): InvoiceAnalytics {
    return {
      totalInvoiced: invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: invoices.filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0),
      totalOutstanding: invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.total, 0),
      averagePaymentTime: this.calculateAveragePaymentTime(invoices),
      paymentHistory: this.generatePaymentHistory(invoices)
    };
  }

  private calculateAveragePaymentTime(invoices: Invoice[]): number {
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    if (paidInvoices.length === 0) return 0;

    const totalDays = paidInvoices.reduce((sum, inv) => {
      const paymentDate = new Date(inv.paidAt);
      const invoiceDate = new Date(inv.createdAt);
      return sum + (paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);

    return totalDays / paidInvoices.length;
  }

  private generatePaymentHistory(invoices: Invoice[]): PaymentHistoryItem[] {
    return invoices
      .filter(inv => inv.status === 'paid')
      .map(inv => ({
        date: inv.paidAt,
        amount: inv.total,
        method: inv.payment.method
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}

interface InvoiceGenerationData {
  clientId: string;
  workerId: string;
  rateId: string;
  shiftIds: string[];
  metadata?: Record<string, any>;
}

interface PaymentProcessData {
  invoiceId: string;
  amount: number;
  method: string;
  stripeToken?: string;
  bankReference?: string;
  checkNumber?: string;
  metadata?: Record<string, any>;
}

interface InvoiceItem {
  shiftId: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

interface PaymentResult {
  status: string;
  transactionId: string;
  metadata?: Record<string, any>;
}

interface InvoiceAnalytics {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  averagePaymentTime: number;
  paymentHistory: PaymentHistoryItem[];
}

interface PaymentHistoryItem {
  date: Date;
  amount: number;
  method: string;
} 