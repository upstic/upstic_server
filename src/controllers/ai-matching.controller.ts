import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { AIMatchingService } from '../services/ai-matching.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { logger } from '../utils/logger';
import { LogMetadata } from '../interfaces/logger.interface';
import { IJob, IWorker } from '../interfaces/models.interface';
import { MatchingOptionsDto } from '../dtos/matching.dto';

@ApiTags('AI Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-matching')
export class AiMatchingController {
  constructor(private readonly aiMatchingService: AIMatchingService) {}

  // From CONTEXT.md: "AIPoweredAutomation: Enhance automation and improve processes for better results."
  // "AutomaticallyMatchJobsWithWorkers: The system identifies potential job matches based on posted requirements."
  @Get('jobs/:workerId')
  @ApiOperation({ 
    summary: 'Get matching jobs for worker',
    description: 'Find jobs that match a worker\'s profile using AI'
  })
  @ApiResponse({ status: 200, description: 'Matching jobs found successfully' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiQuery({ type: MatchingOptionsDto })
  async findMatchingJobs(
    @Param('workerId') workerId: string
  ): Promise<{ status: string; data: { jobs: IJob[] } }> {
    const jobs = await this.aiMatchingService.findMatchingJobs(workerId);
    return {
      status: 'success',
      data: { jobs }
    };
  }

  @Get('candidates/:jobId')
  @ApiOperation({ 
    summary: 'Get matching candidates for job',
    description: 'Find workers that match a job\'s requirements using AI'
  })
  @ApiResponse({ status: 200, description: 'Matching candidates found successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiQuery({ type: MatchingOptionsDto })
  async findMatchingCandidates(
    @Param('jobId') jobId: string
  ): Promise<{ status: string; data: { candidates: IWorker[] } }> {
    const candidates = await this.aiMatchingService.findMatchingCandidates(jobId);
    return {
      status: 'success',
      data: { candidates }
    };
  }

  // From CONTEXT.md: "PushNotifications: Get alerted immediately about a job alert."
  @Post('notify/:workerId')
  async notifyMatchingJobs(
    @Param('workerId') workerId: string
  ): Promise<{ status: string; message: string }> {
    try {
      await this.aiMatchingService.notifyMatchingJobs(workerId);
      logger.info('Notified matching jobs', { workerId } as LogMetadata);
      
      return {
        status: 'success',
        message: 'Notifications sent successfully'
      };
    } catch (error) {
      logger.error('Error notifying matching jobs:', { error, workerId } as LogMetadata);
      throw error;
    }
  }

  @Get('recommendations/:workerId')
  @ApiOperation({ 
    summary: 'Get personalized job recommendations',
    description: 'Get AI-powered job recommendations based on worker profile and history'
  })
  @ApiResponse({ status: 200, description: 'Recommendations generated successfully' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  async getRecommendations(@Param('workerId') workerId: string) {
    return this.aiMatchingService.getRecommendations(workerId);
  }

  @Get('insights/:jobId')
  @ApiOperation({ 
    summary: 'Get job matching insights',
    description: 'Get detailed insights about job matching criteria and scores'
  })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  async getJobInsights(@Param('jobId') jobId: string) {
    return this.aiMatchingService.getJobInsights(jobId);
  }
}