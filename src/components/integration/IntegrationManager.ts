import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { AuthService } from '../../services/auth.service';
import { WebhookService } from '../../services/webhook.service';
import { ValidationService } from '../../services/validation.service';

@Injectable()
export class IntegrationManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT = 30000; // 30 seconds
  private readonly SUPPORTED_AUTH_TYPES = [
    'oauth2',
    'api_key',
    'basic',
    'jwt'
  ];

  constructor(
    @InjectModel('Integration') private integrationModel: Model<any>,
    @InjectModel('Connection') private connectionModel: Model<any>,
    @InjectModel('Event') private eventModel: Model<any>,
    private authService: AuthService,
    private webhookService: WebhookService,
    private validationService: ValidationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createIntegration(
    input: IntegrationInput
  ): Promise<IntegrationResponse> {
    try {
      // Validate integration config
      await this.validateIntegrationConfig(input);

      // Create integration record
      const integration = await this.integrationModel.create({
        ...input,
        status: 'inactive',
        createdAt: new Date()
      });

      // Set up authentication
      await this.setupAuthentication(integration);

      // Configure webhooks if needed
      if (input.webhooks) {
        await this.configureWebhooks(integration);
      }

      return {
        success: true,
        integrationId: integration._id,
        message: 'Integration created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating integration:', error);
      throw error;
    }
  }

  async establishConnection(
    input: ConnectionInput
  ): Promise<ConnectionResponse> {
    try {
      // Validate connection parameters
      await this.validateConnectionParams(input);

      // Create connection record
      const connection = await this.connectionModel.create({
        ...input,
        status: 'connecting',
        createdAt: new Date()
      });

      // Establish connection asynchronously
      this.connectAsync(connection).catch(error => {
        this.logger.error('Error establishing connection:', error);
        this.updateConnectionStatus(connection._id, 'failed', error.message);
      });

      return {
        success: true,
        connectionId: connection._id,
        message: 'Connection establishment initiated'
      };
    } catch (error) {
      this.logger.error('Error initiating connection:', error);
      throw error;
    }
  }

  async processWebhook(
    input: WebhookInput
  ): Promise<WebhookResponse> {
    try {
      // Validate webhook
      const isValid = await this.validateWebhook(input);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook event
      const event = await this.processWebhookEvent(input);

      // Store event
      await this.storeEvent(event);

      // Trigger actions
      await this.triggerWebhookActions(event);

      return {
        success: true,
        eventId: event._id,
        message: 'Webhook processed successfully'
      };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  async getIntegrationStatus(
    integrationId: string
  ): Promise<IntegrationStatus> {
    const cacheKey = `integration:status:${integrationId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const integration = await this.integrationModel.findById(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const status = await this.calculateIntegrationStatus(integration);
      await this.cacheService.set(cacheKey, status, this.CACHE_TTL);

      return status;
    } catch (error) {
      this.logger.error('Error getting integration status:', error);
      throw error;
    }
  }

  private async connectAsync(
    connection: any
  ): Promise<void> {
    try {
      // Update connection status
      await this.updateConnectionStatus(connection._id, 'connecting');

      // Get integration config
      const integration = await this.integrationModel.findById(
        connection.integrationId
      );

      // Establish connection
      const client = await this.createClient(integration, connection);

      // Test connection
      await this.testConnection(client);

      // Store connection details
      await this.storeConnectionDetails(connection._id, client);

      // Update connection status
      await this.updateConnectionStatus(connection._id, 'connected');

    } catch (error) {
      this.logger.error('Error in async connection:', error);
      await this.handleConnectionError(connection._id, error);
    }
  }

  private async processWebhookEvent(
    input: WebhookInput
  ): Promise<any> {
    // Transform webhook data
    const transformedData = await this.transformWebhookData(
      input.data,
      input.type
    );

    // Validate transformed data
    await this.validateWebhookData(transformedData, input.type);

    // Create event record
    return this.eventModel.create({
      type: input.type,
      data: transformedData,
      metadata: {
        source: input.source,
        timestamp: new Date()
      }
    });
  }

  private async triggerWebhookActions(
    event: any
  ): Promise<void> {
    const actions = await this.getWebhookActions(event.type);
    
    for (const action of actions) {
      try {
        await this.executeWebhookAction(action, event);
      } catch (error) {
        this.logger.error('Error executing webhook action:', error);
        // Continue with other actions even if one fails
      }
    }
  }

  private generateStatusCacheKey(
    integrationId: string
  ): string {
    return `integration:status:${integrationId}`;
  }
}

interface IntegrationInput {
  name: string;
  type: string;
  config: {
    auth: {
      type: string;
      credentials: Record<string, any>;
    };
    endpoints: Record<string, string>;
    headers?: Record<string, string>;
  };
  webhooks?: Array<{
    type: string;
    url: string;
    events: string[];
    secret?: string;
  }>;
  metadata?: Record<string, any>;
}

interface IntegrationResponse {
  success: boolean;
  integrationId: string;
  message: string;
}

interface ConnectionInput {
  integrationId: string;
  params: Record<string, any>;
  options?: {
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      backoff: number;
    };
  };
}

interface ConnectionResponse {
  success: boolean;
  connectionId: string;
  message: string;
}

interface WebhookInput {
  type: string;
  source: string;
  data: any;
  signature?: string;
  timestamp: number;
}

interface WebhookResponse {
  success: boolean;
  eventId: string;
  message: string;
}

interface IntegrationStatus {
  status: 'active' | 'inactive' | 'error';
  connections: {
    total: number;
    active: number;
    error: number;
  };
  webhooks: {
    configured: number;
    active: number;
  };
  lastSync?: {
    timestamp: Date;
    status: string;
  };
  health: {
    status: string;
    message?: string;
    lastCheck: Date;
  };
  metrics: {
    requestsTotal: number;
    requestsSuccess: number;
    requestsError: number;
    averageLatency: number;
  };
}

interface WebhookAction {
  type: string;
  config: Record<string, any>;
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  retryPolicy?: {
    maxRetries: number;
    backoff: number;
  };
} 