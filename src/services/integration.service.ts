import { Integration, IntegrationType, IntegrationStatus, IIntegration } from '../models/Integration';
import { AppError } from '../middleware/errorHandler';
import { Queue } from 'bullmq';
import axios, { AxiosInstance } from 'axios';
import { encrypt, decrypt } from '../utils/encryption';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';

export class IntegrationService {
  private static syncQueue: Queue;
  private static readonly API_CLIENTS: Map<string, AxiosInstance> = new Map();

  static initialize() {
    this.syncQueue = new Queue('integration-sync', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
  }

  static async createIntegration(
    integrationData: Partial<IIntegration>
  ): Promise<IIntegration> {
    // Encrypt sensitive data
    if (integrationData.config?.apiKey) {
      integrationData.config.apiKey = await encrypt(integrationData.config.apiKey);
    }
    if (integrationData.config?.apiSecret) {
      integrationData.config.apiSecret = await encrypt(integrationData.config.apiSecret);
    }

    const integration = new Integration(integrationData);
    await integration.save();

    // Initialize API client
    await this.initializeApiClient(integration);

    // Schedule initial sync if needed
    if (integration.status === IntegrationStatus.ACTIVE) {
      await this.scheduleSyncJob(integration._id);
    }

    return integration;
  }

  private static async initializeApiClient(
    integration: IIntegration
  ): Promise<void> {
    const apiKey = integration.config.apiKey 
      ? await decrypt(integration.config.apiKey)
      : undefined;
    
    const apiSecret = integration.config.apiSecret
      ? await decrypt(integration.config.apiSecret)
      : undefined;

    const client = axios.create({
      baseURL: integration.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiSecret,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      response => response,
      async error => {
        await this.handleApiError(integration._id, error);
        throw error;
      }
    );

    this.API_CLIENTS.set(integration._id.toString(), client);
  }

  static async executeIntegrationAction(
    integrationId: string,
    action: string,
    payload: any
  ): Promise<any> {
    const integration = await Integration.findById(integrationId);
    if (!integration) {
      throw new AppError(404, 'Integration not found');
    }

    const client = this.API_CLIENTS.get(integration._id.toString());
    if (!client) {
      throw new AppError(500, 'API client not initialized');
    }

    try {
      const cacheKey = `integration:${integrationId}:${action}:${JSON.stringify(payload)}`;
      const cachedResult = await redisService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const result = await this.executeAction(integration, client, action, payload);
      
      // Cache successful results
      await redisService.set(cacheKey, result, 300); // 5 minutes cache
      
      return result;
    } catch (error) {
      logger.error('Integration action failed', {
        integrationId,
        action,
        error: error.message
      });
      throw new AppError(500, `Integration action failed: ${error.message}`);
    }
  }

  private static async executeAction(
    integration: IIntegration,
    client: AxiosInstance,
    action: string,
    payload: any
  ): Promise<any> {
    switch (integration.type) {
      case IntegrationType.BACKGROUND_CHECK:
        return await this.executeBackgroundCheck(client, payload);
      
      case IntegrationType.PAYROLL:
        return await this.executePayrollAction(client, action, payload);
      
      case IntegrationType.DOCUMENT_SIGNING:
        return await this.executeDocumentSigning(client, action, payload);
      
      case IntegrationType.SKILLS_ASSESSMENT:
        return await this.executeSkillsAssessment(client, action, payload);
      
      default:
        throw new AppError(400, 'Unsupported integration type');
    }
  }

  private static async executeBackgroundCheck(
    client: AxiosInstance,
    payload: any
  ): Promise<any> {
    const response = await client.post('/background-checks', payload);
    return response.data;
  }

  private static async executePayrollAction(
    client: AxiosInstance,
    action: string,
    payload: any
  ): Promise<any> {
    switch (action) {
      case 'process_payroll':
        return (await client.post('/payroll/process', payload)).data;
      case 'get_payslip':
        return (await client.get(`/payroll/payslip/${payload.id}`)).data;
      default:
        throw new AppError(400, 'Unsupported payroll action');
    }
  }

  private static async executeDocumentSigning(
    client: AxiosInstance,
    action: string,
    payload: any
  ): Promise<any> {
    switch (action) {
      case 'create_envelope':
        return (await client.post('/envelopes', payload)).data;
      case 'get_signature_status':
        return (await client.get(`/envelopes/${payload.envelopeId}`)).data;
      default:
        throw new AppError(400, 'Unsupported document signing action');
    }
  }

  private static async executeSkillsAssessment(
    client: AxiosInstance,
    action: string,
    payload: any
  ): Promise<any> {
    switch (action) {
      case 'create_assessment':
        return (await client.post('/assessments', payload)).data;
      case 'get_results':
        return (await client.get(`/assessments/${payload.assessmentId}/results`)).data;
      default:
        throw new AppError(400, 'Unsupported skills assessment action');
    }
  }

  private static async handleApiError(
    integrationId: string,
    error: any
  ): Promise<void> {
    const integration = await Integration.findById(integrationId);
    if (!integration) return;

    integration.metadata = integration.metadata || {};
    integration.metadata.errorCount = (integration.metadata.errorCount || 0) + 1;
    integration.metadata.lastError = error.message;

    if (integration.metadata.errorCount >= 5) {
      integration.status = IntegrationStatus.ERROR;
    }

    await integration.save();
  }

  static async handleWebhook(
    integrationId: string,
    event: string,
    payload: any
  ): Promise<void> {
    const integration = await Integration.findById(integrationId);
    if (!integration) {
      throw new AppError(404, 'Integration not found');
    }

    const webhook = integration.webhooks.find(w => w.event === event && w.active);
    if (!webhook) return;

    try {
      await axios.post(webhook.endpoint, payload, {
        headers: webhook.secret ? {
          'X-Webhook-Secret': webhook.secret
        } : undefined
      });
    } catch (error) {
      logger.error('Webhook delivery failed', {
        integrationId,
        event,
        error: error.message
      });
    }
  }

  private static async scheduleSyncJob(
    integrationId: string
  ): Promise<void> {
    await this.syncQueue.add(
      'sync-integration',
      { integrationId },
      {
        repeat: {
          pattern: '0 */6 * * *' // Every 6 hours
        }
      }
    );
  }
}

// Initialize the service
IntegrationService.initialize(); 