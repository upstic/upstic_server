import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';
import { WorkflowEngine } from '../../services/workflow.service';
import { SchedulerService } from '../../services/scheduler.service';

@Injectable()
export class AutomationManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  constructor(
    @InjectModel('Automation') private automationModel: Model<any>,
    @InjectModel('Workflow') private workflowModel: Model<any>,
    @InjectModel('Task') private taskModel: Model<any>,
    private workflowEngine: WorkflowEngine,
    private schedulerService: SchedulerService,
    private notificationService: NotificationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createAutomation(
    input: AutomationInput
  ): Promise<AutomationResponse> {
    try {
      // Validate automation configuration
      await this.validateAutomation(input);

      // Create automation record
      const automation = await this.automationModel.create({
        ...input,
        status: 'active',
        createdAt: new Date()
      });

      // Set up workflow
      await this.setupWorkflow(automation);

      // Schedule automation if needed
      if (input.schedule) {
        await this.scheduleAutomation(automation);
      }

      return {
        success: true,
        automationId: automation._id,
        message: 'Automation created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating automation:', error);
      throw error;
    }
  }

  async executeAutomation(
    automationId: string,
    context?: Record<string, any>
  ): Promise<ExecutionResponse> {
    try {
      const automation = await this.automationModel.findById(automationId);
      if (!automation) {
        throw new Error('Automation not found');
      }

      // Create execution record
      const execution = await this.createExecutionRecord(automation, context);

      // Execute workflow
      const result = await this.workflowEngine.execute(
        automation.workflow,
        context
      );

      // Update execution record
      await this.updateExecutionRecord(execution._id, result);

      return {
        success: true,
        executionId: execution._id,
        result
      };
    } catch (error) {
      this.logger.error('Error executing automation:', error);
      throw error;
    }
  }

  async getAutomationStatus(
    automationId: string
  ): Promise<AutomationStatus> {
    const cacheKey = `automation:status:${automationId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const automation = await this.automationModel.findById(automationId);
    if (!automation) {
      throw new Error('Automation not found');
    }

    const status = await this.calculateAutomationStatus(automation);
    await this.cacheService.set(cacheKey, status, this.CACHE_TTL);

    return status;
  }

  async updateAutomation(
    automationId: string,
    updates: Partial<AutomationInput>
  ): Promise<AutomationResponse> {
    try {
      const automation = await this.automationModel.findById(automationId);
      if (!automation) {
        throw new Error('Automation not found');
      }

      // Validate updates
      await this.validateAutomation({ ...automation, ...updates });

      // Update automation
      const updated = await this.automationModel.findByIdAndUpdate(
        automationId,
        {
          ...updates,
          updatedAt: new Date()
        },
        { new: true }
      );

      // Update workflow if needed
      if (updates.workflow) {
        await this.updateWorkflow(updated);
      }

      // Update schedule if needed
      if (updates.schedule) {
        await this.updateSchedule(updated);
      }

      return {
        success: true,
        automationId: updated._id,
        message: 'Automation updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating automation:', error);
      throw error;
    }
  }

  private async validateAutomation(
    input: AutomationInput | any
  ): Promise<void> {
    // Validate workflow
    if (!input.workflow || !input.workflow.steps?.length) {
      throw new Error('Workflow must contain at least one step');
    }

    // Validate triggers
    if (input.triggers) {
      await this.validateTriggers(input.triggers);
    }

    // Validate schedule
    if (input.schedule) {
      this.validateSchedule(input.schedule);
    }

    // Validate conditions
    if (input.conditions) {
      this.validateConditions(input.conditions);
    }
  }

  private async setupWorkflow(
    automation: any
  ): Promise<void> {
    const workflow = await this.workflowModel.create({
      automationId: automation._id,
      steps: automation.workflow.steps,
      status: 'active',
      createdAt: new Date()
    });

    await this.automationModel.findByIdAndUpdate(
      automation._id,
      { workflowId: workflow._id }
    );
  }

  private async scheduleAutomation(
    automation: any
  ): Promise<void> {
    const schedule = {
      id: `automation:${automation._id}`,
      type: 'automation',
      schedule: automation.schedule,
      action: {
        type: 'executeAutomation',
        payload: {
          automationId: automation._id
        }
      }
    };

    await this.schedulerService.schedule(schedule);
  }

  private async createExecutionRecord(
    automation: any,
    context?: Record<string, any>
  ): Promise<any> {
    return this.taskModel.create({
      automationId: automation._id,
      status: 'running',
      context,
      startTime: new Date(),
      metadata: {
        triggeredBy: context?.triggeredBy || 'system',
        environment: process.env.NODE_ENV
      }
    });
  }

  private async updateExecutionRecord(
    executionId: string,
    result: any
  ): Promise<void> {
    await this.taskModel.findByIdAndUpdate(
      executionId,
      {
        status: result.success ? 'completed' : 'failed',
        result,
        endTime: new Date()
      }
    );
  }

  private async calculateAutomationStatus(
    automation: any
  ): Promise<AutomationStatus> {
    const executions = await this.taskModel.find({
      automationId: automation._id
    }).sort({ startTime: -1 }).limit(100);

    return {
      status: automation.status,
      lastExecution: executions[0],
      statistics: this.calculateStatistics(executions),
      nextScheduledRun: await this.getNextScheduledRun(automation),
      health: this.calculateHealth(executions)
    };
  }

  private calculateStatistics(
    executions: any[]
  ): AutomationStatistics {
    return {
      total: executions.length,
      successful: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      averageDuration: this.calculateAverageDuration(executions),
      successRate: this.calculateSuccessRate(executions)
    };
  }

  private calculateHealth(
    executions: any[]
  ): AutomationHealth {
    const recentExecutions = executions.slice(0, 10);
    const failureRate = 
      recentExecutions.filter(e => e.status === 'failed').length / 
      recentExecutions.length;

    return {
      status: this.determineHealthStatus(failureRate),
      failureRate,
      lastError: this.getLastError(executions),
      recommendations: this.generateHealthRecommendations(executions)
    };
  }
}

interface AutomationInput {
  name: string;
  description?: string;
  workflow: {
    steps: Array<{
      type: string;
      action: string;
      config: Record<string, any>;
      conditions?: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
    }>;
  };
  triggers?: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  schedule?: {
    type: 'once' | 'recurring';
    startDate: Date;
    frequency?: string;
    interval?: number;
    endDate?: Date;
  };
  conditions?: Array<{
    type: string;
    config: Record<string, any>;
  }>;
}

interface AutomationResponse {
  success: boolean;
  automationId: string;
  message: string;
}

interface ExecutionResponse {
  success: boolean;
  executionId: string;
  result: Record<string, any>;
}

interface AutomationStatus {
  status: string;
  lastExecution: any;
  statistics: AutomationStatistics;
  nextScheduledRun: Date | null;
  health: AutomationHealth;
}

interface AutomationStatistics {
  total: number;
  successful: number;
  failed: number;
  averageDuration: number;
  successRate: number;
}

interface AutomationHealth {
  status: 'healthy' | 'warning' | 'critical';
  failureRate: number;
  lastError?: {
    message: string;
    timestamp: Date;
  };
  recommendations: string[];
} 