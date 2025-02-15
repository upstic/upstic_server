import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { EmailService } from '../../services/email.service';
import { TemplateService } from '../../services/template.service';
import { AnalyticsService } from '../../services/analytics.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class EmailCampaignManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BATCH_SIZE = 100;
  private readonly RATE_LIMIT = 50; // emails per second

  constructor(
    @InjectModel('Campaign') private campaignModel: Model<any>,
    @InjectModel('Recipient') private recipientModel: Model<any>,
    @InjectModel('EmailEvent') private eventModel: Model<any>,
    private emailService: EmailService,
    private templateService: TemplateService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createCampaign(
    input: CampaignInput
  ): Promise<CampaignResponse> {
    try {
      // Validate campaign data
      await this.validateCampaign(input);

      // Create campaign record
      const campaign = await this.campaignModel.create({
        ...input,
        status: 'draft',
        createdAt: new Date()
      });

      // Process recipients
      await this.processRecipients(campaign);

      // Prepare email template
      await this.prepareTemplate(campaign);

      return {
        success: true,
        campaignId: campaign._id,
        message: 'Campaign created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  async launchCampaign(
    campaignId: string,
    options?: LaunchOptions
  ): Promise<LaunchResponse> {
    try {
      const campaign = await this.campaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Validate campaign status
      if (campaign.status !== 'draft') {
        throw new Error('Campaign is not in draft status');
      }

      // Update campaign status
      await this.updateCampaignStatus(campaignId, 'launching');

      // Process campaign launch
      this.processCampaignLaunch(campaign, options).catch(error => {
        this.logger.error('Error processing campaign launch:', error);
        this.updateCampaignStatus(campaignId, 'failed', error.message);
      });

      return {
        success: true,
        campaignId,
        message: 'Campaign launch initiated'
      };
    } catch (error) {
      this.logger.error('Error launching campaign:', error);
      throw error;
    }
  }

  async getCampaignStats(
    campaignId: string
  ): Promise<CampaignStats> {
    const cacheKey = `campaign:stats:${campaignId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const [campaign, events] = await Promise.all([
        this.campaignModel.findById(campaignId),
        this.eventModel.find({ campaignId })
      ]);

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const stats = this.calculateCampaignStats(campaign, events);
      await this.cacheService.set(cacheKey, stats, this.CACHE_TTL);

      return stats;
    } catch (error) {
      this.logger.error('Error getting campaign stats:', error);
      throw error;
    }
  }

  async trackEmailEvent(
    event: EmailEvent
  ): Promise<void> {
    try {
      // Record event
      await this.eventModel.create({
        ...event,
        timestamp: new Date()
      });

      // Update campaign stats
      await this.updateCampaignStats(event.campaignId);

      // Track analytics
      await this.analyticsService.trackEmailEvent(event);

      // Process event actions
      await this.processEventActions(event);
    } catch (error) {
      this.logger.error('Error tracking email event:', error);
      throw error;
    }
  }

  private async processCampaignLaunch(
    campaign: any,
    options?: LaunchOptions
  ): Promise<void> {
    try {
      const recipients = await this.getRecipients(campaign._id);
      const template = await this.getTemplate(campaign.templateId);

      // Process recipients in batches
      for (let i = 0; i < recipients.length; i += this.BATCH_SIZE) {
        const batch = recipients.slice(i, i + this.BATCH_SIZE);
        await this.processBatch(campaign, batch, template);
        await this.delay(1000 / this.RATE_LIMIT * this.BATCH_SIZE);
      }

      // Update campaign status
      await this.updateCampaignStatus(campaign._id, 'active');

    } catch (error) {
      this.logger.error('Error processing campaign launch:', error);
      throw error;
    }
  }

  private async processBatch(
    campaign: any,
    recipients: any[],
    template: any
  ): Promise<void> {
    const emails = recipients.map(recipient => ({
      to: recipient.email,
      subject: this.personalizeSubject(campaign.subject, recipient),
      content: this.personalizeContent(template.content, recipient),
      metadata: {
        campaignId: campaign._id,
        recipientId: recipient._id
      }
    }));

    await this.emailService.sendBulk(emails);
  }

  private async processEventActions(
    event: EmailEvent
  ): Promise<void> {
    switch (event.type) {
      case 'open':
        await this.processOpenEvent(event);
        break;
      case 'click':
        await this.processClickEvent(event);
        break;
      case 'bounce':
        await this.processBounceEvent(event);
        break;
      case 'unsubscribe':
        await this.processUnsubscribeEvent(event);
        break;
    }
  }

  private calculateCampaignStats(
    campaign: any,
    events: any[]
  ): CampaignStats {
    const total = campaign.recipientCount;
    const delivered = events.filter(e => e.type === 'delivered').length;
    const opened = events.filter(e => e.type === 'open').length;
    const clicked = events.filter(e => e.type === 'click').length;
    const bounced = events.filter(e => e.type === 'bounce').length;
    const unsubscribed = events.filter(e => e.type === 'unsubscribe').length;

    return {
      total,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      rates: {
        deliveryRate: (delivered / total) * 100,
        openRate: (opened / delivered) * 100,
        clickRate: (clicked / opened) * 100,
        bounceRate: (bounced / total) * 100,
        unsubscribeRate: (unsubscribed / delivered) * 100
      },
      timeline: this.generateEventTimeline(events)
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface CampaignInput {
  name: string;
  subject: string;
  templateId: string;
  recipients: {
    type: 'list' | 'segment' | 'individual';
    data: string[] | Record<string, any>;
  };
  schedule?: {
    startDate: Date;
    timezone: string;
  };
  settings?: {
    replyTo?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
    personalizations?: Record<string, any>;
  };
}

interface LaunchOptions {
  immediate?: boolean;
  testMode?: boolean;
  validateRecipients?: boolean;
}

interface CampaignResponse {
  success: boolean;
  campaignId: string;
  message: string;
}

interface LaunchResponse {
  success: boolean;
  campaignId: string;
  message: string;
}

interface EmailEvent {
  type: 'delivered' | 'open' | 'click' | 'bounce' | 'unsubscribe';
  campaignId: string;
  recipientId: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

interface CampaignStats {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  timeline: Array<{
    timestamp: Date;
    type: string;
    count: number;
  }>;
} 