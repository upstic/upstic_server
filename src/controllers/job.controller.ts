import { Controller, Get, Post, Put, Delete, Query, Body, Param, Req } from '@nestjs/common';
import { JobService } from '../services/job.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { JobSearchParams } from '../interfaces/models.interface';
import { CreateJobDto, UpdateJobDto, JobSearchParamsDto, JobResponseDto } from '../dtos/job.dto';
import { IJob } from '../interfaces/models.interface';
import { PaginationParamsDto, SortingParamsDto, PaginatedResponseDto, FilteringParamsDto } from '../dtos/common.dto';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AIMatchingService } from '../services/ai-matching.service';

@ApiTags('Jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly aiMatchingService: AIMatchingService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiResponse({ 
    status: 200, 
    description: 'Jobs retrieved successfully',
    type: PaginatedResponseDto
  })
  async getAllJobs(
    @Query() paginationParams: PaginationParamsDto,
    @Query() sortingParams: SortingParamsDto,
    @Query() filteringParams: FilteringParamsDto
  ): Promise<PaginatedResponseDto<JobResponseDto>> {
    return this.jobService.findAll(paginationParams, sortingParams, filteringParams);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid job data' })
  @ApiBody({ type: CreateJobDto })
  async createJob(@Body() jobData: CreateJobDto) {
    return this.jobService.create(jobData);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search jobs' })
  @ApiResponse({ status: 200, description: 'Jobs found successfully' })
  async searchJobs(@Query() query: JobSearchParamsDto) {
    return this.jobService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job found' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async getJob(@Param('id') id: string) {
    return this.jobService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update job' })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiBody({ type: UpdateJobDto })
  async updateJob(@Param('id') id: string, @Body() updateData: UpdateJobDto) {
    return this.jobService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete job' })
  @ApiResponse({ status: 200, description: 'Job deleted' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async deleteJob(@Param('id') id: string) {
    return this.jobService.remove(id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish job' })
  @ApiResponse({ status: 200, description: 'Job published successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async publishJob(@Param('id') id: string) {
    return this.jobService.publish(id);
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'Get job applications' })
  @ApiParam({ name: 'id', required: true })
  async getJobApplications(@Param('id') id: string) {
    return this.jobService.getApplications(id);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'Get job matches' })
  @ApiResponse({ status: 200, description: 'Job matches found successfully' })
  @ApiParam({ name: 'id', required: true })
  async getJobMatches(@Param('id') id: string) {
    return this.aiMatchingService.findMatchingCandidates(id);
  }

  @Get(':id/recommended')
  @ApiOperation({ summary: 'Get recommended workers' })
  @ApiResponse({ status: 200, description: 'Recommended workers found successfully' })
  @ApiParam({ name: 'id', required: true })
  async getRecommendedWorkers(@Param('id') id: string) {
    return this.aiMatchingService.getRecommendations(id);
  }

  @Put(':jobId/applications/:applicationId')
  @ApiOperation({ summary: 'Update application status' })
  @ApiParam({ name: 'jobId', required: true })
  @ApiParam({ name: 'applicationId', required: true })
  async updateApplicationStatus(
    @Param('jobId') jobId: string,
    @Param('applicationId') applicationId: string,
    @Body('status') status: string,
    @Body('notes') notes?: string
  ) {
    return this.jobService.updateApplicationStatus(jobId, applicationId, status, notes);
  }
}