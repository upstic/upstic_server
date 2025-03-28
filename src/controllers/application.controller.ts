import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { ApplicationStatus } from '../models/Application';
import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { CreateApplicationDto } from '../dtos/application.dto';
import { ApplicationStatusDto } from '../dtos/application-status.dto';
import { PaginationParamsDto } from '../dtos/pagination-params.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Create job application' })
  @ApiResponse({ status: 201, description: 'Application created successfully' })
  async createApplication(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateApplicationDto
  ) {
    // Convert string IDs to ObjectId if needed
    return this.applicationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all applications' })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  async getApplications(@Query() query: PaginationParamsDto) {
    return this.applicationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiResponse({ status: 200, description: 'Application retrieved successfully' })
  async getApplication(@Param('id') id: string) {
    return this.applicationService.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update application status' })
  @ApiResponse({ status: 200, description: 'Application status updated successfully' })
  async updateStatus(
    @Param('id') id: string, 
    @Body() status: ApplicationStatusDto
  ) {
    return this.applicationService.updateStatus(id, status);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw application' })
  @ApiResponse({ status: 200, description: 'Application withdrawn successfully' })
  async withdrawApplication(@Param('id') id: string) {
    return this.applicationService.withdraw(id);
  }

  @Get('worker/:workerId')
  @ApiOperation({ summary: 'Get worker applications' })
  @ApiResponse({ status: 200, description: 'Worker applications retrieved successfully' })
  async getWorkerApplications(
    @Param('workerId') workerId: string,
    @Query() query: PaginationParamsDto
  ) {
    return this.applicationService.getWorkerApplications(workerId, query);
  }

  @Get('job/:jobId')
  @ApiOperation({ summary: 'Get job applications' })
  @ApiResponse({ status: 200, description: 'Job applications retrieved successfully' })
  async getJobApplications(
    @Param('jobId') jobId: string,
    @Query() query: PaginationParamsDto
  ) {
    return this.applicationService.getJobApplications(jobId, query);
  }
} 