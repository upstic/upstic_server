import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailLog } from '../models/EmailLog';
import { logger } from '../utils/logger';
import { emailConfig } from '../config/email.config';
import { IInterview } from '../interfaces/models.interface';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private templateCache: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(
    @InjectModel('EmailLog') private emailLogModel: Model<EmailLog>,
    private configService: ConfigService
  ) {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      auth: emailConfig.auth
    });
  }

  async sendEmail(to: string | string[], subject: string, template: string, data: any) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        html: await this.getTemplate(template, data)
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { messageId: info.messageId });
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  private getTemplate(template: string, data: any): string {
    switch (template) {
      case 'welcome-template':
        return `
          <h1>Welcome ${data.name}!</h1>
          <p>Thank you for joining our platform.</p>
        `;
      default:
        return `<p>Default email content</p>`;
    }
  }

  async sendBulkEmails(emails: EmailOptions[]): Promise<BulkEmailResult> {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email.to, email.subject, email.template, email.context))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      totalSent: emails.length,
      successful,
      failed,
      results: results.map((result, index) => ({
        to: emails[index].to,
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? (result as PromiseRejectedResult).reason : undefined
      }))
    };
  }

  private async generateEmailContent(
    templateName: string,
    context: any
  ): Promise<string> {
    try {
      let template = this.templateCache.get(templateName);

      if (!template) {
        const templatePath = path.join(
          __dirname,
          '../templates/email',
          `${templateName}.hbs`
        );
        
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        template = handlebars.compile(templateContent);
        this.templateCache.set(templateName, template);
      }

      return template(context);
    } catch (error) {
      logger.error('Error generating email content:', error);
      throw error;
    }
  }

  private async logEmail(logData: EmailLogData): Promise<void> {
    try {
      await this.emailLogModel.create({
        ...logData,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error logging email:', error);
    }
  }

  async getEmailLogs(filters: EmailLogFilters): Promise<EmailLog[]> {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.to) query.to = filters.to;
    if (filters.template) query.template = filters.template;
    if (filters.dateRange) {
      query.timestamp = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    return this.emailLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100);
  }

  async sendInterviewScheduled(interview: IInterview): Promise<void> {
    // Implementation
  }

  async sendInterviewRescheduled(interview: IInterview): Promise<void> {
    // Implementation
  }

  async sendInterviewFeedbackSubmitted(interview: IInterview): Promise<void> {
    // Implementation
  }
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: any;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface BulkEmailResult {
  totalSent: number;
  successful: number;
  failed: number;
  results: Array<{
    to: string | string[];
    success: boolean;
    error?: string;
  }>;
}

interface EmailLogData {
  to: string | string[];
  subject: string;
  template: string;
  messageId?: string;
  status: 'sent' | 'failed';
  error?: string;
}

interface EmailLogFilters {
  status?: 'sent' | 'failed';
  to?: string;
  template?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
} 