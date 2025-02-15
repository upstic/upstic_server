import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';
import { ValidationService } from '../../services/validation.service';
import { QueueService } from '../../services/queue.service';

@Injectable()
export class WorkflowEngine {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly WORKFLOW_TYPES = [
    'onboarding',
    'offboarding',
    'recruitment',
    'approval',
    'review'
  ] as const;
  private readonly STATE_TRANSITIONS = {
    draft: ['active'],
    active: ['completed', 'failed', 'suspended'],
    suspended: ['active', 'terminated'],
    completed: [],
    failed: ['active'],
    terminated: []
  };

  constructor(
    @InjectModel('Workflow') private workflowModel: Model<any>,
    @InjectModel('Step') private stepModel: Model<any>,
    @InjectModel('Execution') private executionModel: Model<any>,
    private queueService: QueueService,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createWorkflow(
    input: WorkflowInput
  ): Promise<WorkflowResponse> {
    try {
      // Validate workflow input
      await this.validateWorkflow(input);

      // Create workflow record
      const workflow = await this.workflowModel.create({
        ...input,
        status: 'draft',
        createdAt: new Date()
      });

      // Initialize workflow steps
      await this.initializeWorkflowSteps(workflow);

      return {
        success: true,
        workflowId: workflow._id,
        message: 'Workflow created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  async executeWorkflow(
    input: ExecutionInput
  ): Promise<ExecutionResponse> {
    try {
      // Validate execution request
      await this.validateExecution(input);

      // Create execution record
      const execution = await this.executionModel.create({
        ...input,
        status: 'pending',
        createdAt: new Date()
      });

      // Start workflow execution
      this.processWorkflow(execution).catch(error => {
        this.logger.error('Error processing workflow:', error);
        this.updateExecutionStatus(
          execution._id,
          'failed',
          error.message
        );
      });

      return {
        success: true,
        executionId: execution._id,
        message: 'Workflow execution initiated'
      };
    } catch (error) {
      this.logger.error('Error executing workflow:', error);
      throw error;
    }
  }

  async getWorkflowStatus(
    workflowId: string
  ): Promise<WorkflowStatus> {
    try {
      const workflow = await this.workflowModel.findById(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const steps = await this.stepModel.find({
        workflowId: workflow._id
      }).sort({ sequence: 1 });

      const executions = await this.executionModel.find({
        workflowId: workflow._id
      }).sort({ createdAt: -1 });

      return {
        workflowId,
        status: workflow.status,
        progress: this.calculateProgress(steps),
        currentStep: this.getCurrentStep(steps),
        lastExecution: executions[0] || null,
        metrics: await this.getWorkflowMetrics(workflow._id)
      };
    } catch (error) {
      this.logger.error('Error getting workflow status:', error);
      throw error;
    }
  }

  private async processWorkflow(
    execution: any
  ): Promise<void> {
    try {
      // Get workflow definition
      const workflow = await this.workflowModel.findById(
        execution.workflowId
      );

      // Get workflow steps
      const steps = await this.stepModel.find({
        workflowId: workflow._id
      }).sort({ sequence: 1 });

      // Execute steps sequentially
      for (const step of steps) {
        await this.executeStep(step, execution);
      }

      // Complete workflow execution
      await this.completeExecution(execution);

      // Notify completion
      await this.notifyWorkflowCompletion(execution);
    } catch (error) {
      throw error;
    }
  }

  private async executeStep(
    step: any,
    execution: any
  ): Promise<void> {
    try {
      // Update step status
      await this.updateStepStatus(step._id, 'running');

      // Execute step action
      const result = await this.executeStepAction(step, execution);

      // Process step result
      await this.processStepResult(step, result);

      // Update step status
      await this.updateStepStatus(step._id, 'completed');
    } catch (error) {
      await this.handleStepError(step, error);
      throw error;
    }
  }

  private async executeStepAction(
    step: any,
    execution: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queueService.add(
        step.action,
        {
          stepId: step._id,
          executionId: execution._id,
          data: step.data
        },
        {
          priority: step.priority,
          retries: this.MAX_RETRIES,
          backoff: this.RETRY_DELAY,
          timeout: step.timeout
        }
      ).then(resolve).catch(reject);
    });
  }

  private calculateProgress(
    steps: any[]
  ): number {
    const completed = steps.filter(s => s.status === 'completed').length;
    return (completed / steps.length) * 100;
  }

  private getCurrentStep(
    steps: any[]
  ): any {
    return steps.find(s => s.status === 'running') ||
           steps.find(s => s.status === 'pending');
  }
}

interface WorkflowInput {
  type: typeof WorkflowEngine.prototype.WORKFLOW_TYPES[number];
  name: string;
  description?: string;
  steps: Array<{
    name: string;
    action: string;
    sequence: number;
    data?: Record<string, any>;
    timeout?: number;
    retries?: number;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  }>;
  metadata?: Record<string, any>;
}

interface WorkflowResponse {
  success: boolean;
  workflowId: string;
  message: string;
}

interface ExecutionInput {
  workflowId: string;
  trigger: string;
  data: Record<string, any>;
  options?: {
    priority?: string;
    timeout?: number;
    async?: boolean;
  };
}

interface ExecutionResponse {
  success: boolean;
  executionId: string;
  message: string;
}

interface WorkflowStatus {
  workflowId: string;
  status: string;
  progress: number;
  currentStep: {
    name: string;
    sequence: number;
    status: string;
  } | null;
  lastExecution: {
    id: string;
    status: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
  } | null;
  metrics: WorkflowMetrics;
}

interface WorkflowMetrics {
  executions: {
    total: number;
    successful: number;
    failed: number;
    running: number;
  };
  performance: {
    averageDuration: number;
    successRate: number;
    failureRate: number;
  };
  steps: Array<{
    name: string;
    averageDuration: number;
    failureRate: number;
    lastExecuted: Date;
  }>;
}

interface StepResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

interface WorkflowDefinition {
  id: string;
  type: string;
  name: string;
  description?: string;
  version: number;
  steps: Array<{
    id: string;
    name: string;
    action: string;
    sequence: number;
    required: boolean;
    timeout?: number;
    retries?: number;
    conditions?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    onSuccess?: Array<{
      action: string;
      data?: Record<string, any>;
    }>;
    onFailure?: Array<{
      action: string;
      data?: Record<string, any>;
    }>;
  }>;
  metadata?: Record<string, any>;
} 