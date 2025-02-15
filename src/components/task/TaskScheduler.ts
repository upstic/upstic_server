import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';
import { ValidationService } from '../../services/validation.service';
import { QueueService } from '../../services/queue.service';

@Injectable()
export class TaskScheduler {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
  private readonly TASK_TYPES = [
    'report_generation',
    'data_sync',
    'notification',
    'cleanup',
    'backup'
  ] as const;

  constructor(
    @InjectModel('Task') private taskModel: Model<any>,
    @InjectModel('Schedule') private scheduleModel: Model<any>,
    @InjectModel('Execution') private executionModel: Model<any>,
    private queueService: QueueService,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async scheduleTask(
    input: TaskInput
  ): Promise<TaskResponse> {
    try {
      // Validate task input
      await this.validateTask(input);

      // Create task record
      const task = await this.taskModel.create({
        ...input,
        status: 'scheduled',
        createdAt: new Date()
      });

      // Schedule task execution
      await this.scheduleExecution(task);

      return {
        success: true,
        taskId: task._id,
        message: 'Task scheduled successfully'
      };
    } catch (error) {
      this.logger.error('Error scheduling task:', error);
      throw error;
    }
  }

  async updateSchedule(
    input: ScheduleUpdateInput
  ): Promise<ScheduleResponse> {
    try {
      // Validate schedule update
      await this.validateScheduleUpdate(input);

      // Update schedule
      const schedule = await this.scheduleModel.findByIdAndUpdate(
        input.scheduleId,
        {
          $set: {
            ...input.updates,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Reschedule affected tasks
      await this.rescheduleAffectedTasks(schedule);

      return {
        success: true,
        scheduleId: schedule._id,
        message: 'Schedule updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating schedule:', error);
      throw error;
    }
  }

  async getTaskStatus(
    taskId: string
  ): Promise<TaskStatus> {
    try {
      const task = await this.taskModel.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const executions = await this.executionModel.find({
        taskId: task._id
      }).sort({ createdAt: -1 });

      return {
        taskId,
        status: task.status,
        schedule: task.schedule,
        lastExecution: executions[0] || null,
        nextExecution: await this.getNextExecutionTime(task),
        metadata: task.metadata
      };
    } catch (error) {
      this.logger.error('Error getting task status:', error);
      throw error;
    }
  }

  private async scheduleExecution(
    task: any
  ): Promise<void> {
    try {
      const schedule = this.parseSchedule(task.schedule);
      const executionTime = this.calculateNextExecution(schedule);

      await this.queueService.schedule(
        task.type,
        {
          taskId: task._id,
          data: task.data,
          metadata: task.metadata
        },
        {
          priority: task.priority,
          delay: executionTime.getTime() - Date.now(),
          retries: this.MAX_RETRIES,
          backoff: this.RETRY_DELAY
        }
      );

      await this.createExecutionRecord(task, executionTime);
    } catch (error) {
      throw error;
    }
  }

  private async rescheduleAffectedTasks(
    schedule: any
  ): Promise<void> {
    const tasks = await this.taskModel.find({
      'schedule.id': schedule._id
    });

    for (const task of tasks) {
      await this.scheduleExecution(task);
    }
  }

  private parseSchedule(
    schedule: any
  ): Schedule {
    if (schedule.type === 'cron') {
      return {
        type: 'cron',
        expression: schedule.expression,
        timezone: schedule.timezone
      };
    } else if (schedule.type === 'interval') {
      return {
        type: 'interval',
        interval: schedule.interval,
        unit: schedule.unit
      };
    } else {
      return {
        type: 'once',
        datetime: new Date(schedule.datetime)
      };
    }
  }

  private calculateNextExecution(
    schedule: Schedule
  ): Date {
    // Implementation depends on schedule type
    if (schedule.type === 'cron') {
      return this.calculateCronNextExecution(
        schedule.expression,
        schedule.timezone
      );
    } else if (schedule.type === 'interval') {
      return this.calculateIntervalNextExecution(
        schedule.interval,
        schedule.unit
      );
    } else {
      return new Date(schedule.datetime);
    }
  }

  private async createExecutionRecord(
    task: any,
    executionTime: Date
  ): Promise<void> {
    await this.executionModel.create({
      taskId: task._id,
      scheduledTime: executionTime,
      status: 'scheduled',
      createdAt: new Date()
    });
  }
}

interface TaskInput {
  type: typeof TaskScheduler.prototype.TASK_TYPES[number];
  schedule: {
    type: 'once' | 'interval' | 'cron';
    datetime?: Date;
    interval?: number;
    unit?: 'minutes' | 'hours' | 'days';
    expression?: string;
    timezone?: string;
  };
  data: Record<string, any>;
  priority?: typeof TaskScheduler.prototype.TASK_PRIORITIES[number];
  metadata?: Record<string, any>;
}

interface TaskResponse {
  success: boolean;
  taskId: string;
  message: string;
}

interface ScheduleUpdateInput {
  scheduleId: string;
  updates: {
    expression?: string;
    timezone?: string;
    interval?: number;
    unit?: string;
    enabled?: boolean;
  };
}

interface ScheduleResponse {
  success: boolean;
  scheduleId: string;
  message: string;
}

interface TaskStatus {
  taskId: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  schedule: {
    type: string;
    next: Date;
  };
  lastExecution: {
    time: Date;
    status: string;
    duration?: number;
    error?: string;
  } | null;
  nextExecution: Date | null;
  metadata?: Record<string, any>;
}

interface Schedule {
  type: 'once' | 'interval' | 'cron';
  datetime?: Date;
  interval?: number;
  unit?: string;
  expression?: string;
  timezone?: string;
}

interface ExecutionRecord {
  taskId: string;
  scheduledTime: Date;
  startTime?: Date;
  endTime?: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  error?: string;
  metadata?: Record<string, any>;
}

interface TaskMetrics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  averageDuration: number;
  failureRate: number;
  executionHistory: Array<{
    date: string;
    total: number;
    successful: number;
    failed: number;
  }>;
} 