import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Logger } from '../utils/logger';

const logger = new Logger('StripeService');

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-02-24.acacia'
    });
  }

  async createPaymentMethod(data: any): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.create(data);
    } catch (error) {
      logger.error('Error creating payment method:', error);
      throw error;
    }
  }

  async processPayment(amount: number, currency: string, paymentMethodId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: paymentMethodId,
        confirm: true
      });
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService(new ConfigService()); 