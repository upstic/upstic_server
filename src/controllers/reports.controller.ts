import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../interfaces/user.interface';
import { DateRangeDto } from '../dtos/date-range.dto';
import { ReportService } from '../services/report.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { IReport } from '../interfaces/report.interface';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECRUITER)
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  // Analytics Endpoints
  @Get('analytics/jobs')
  @ApiOperation({ summary: 'Get job posting analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getJobAnalytics(@Query() query: DateRangeDto) {
    return this.reportService.generateJobAnalytics(query);
  }

  @Get('analytics/workers')
  @ApiOperation({ summary: 'Get worker analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getWorkerAnalytics(@Query() query: DateRangeDto) {
    return this.reportService.generateWorkerAnalytics(query);
  }

  @Get('analytics/applications')
  @ApiOperation({ summary: 'Get application analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getApplicationAnalytics(@Query() query: DateRangeDto) {
    return this.reportService.generateApplicationAnalytics(query);
  }

  @Get('analytics/placements')
  @ApiOperation({ summary: 'Get placement analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getPlacementAnalytics(@Query() query: DateRangeDto) {
    return this.reportService.generatePlacementAnalytics(query);
  }

  // Report Management Endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new report' })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  async createReport(
    @CurrentUser() user: JwtPayload,
    @Body() reportData: Partial<IReport>
  ) {
    return this.reportService.createReport(user.sub, reportData);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  async getReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    return this.reportService.getReport(reportId, user.sub);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download report' })
  @ApiResponse({ status: 200, description: 'Report download URL generated' })
  async downloadReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    const report = await this.reportService.getReport(reportId, user.sub);
    if (!report.result?.fileUrl) {
      throw new Error('Report file not available');
    }
    return { downloadUrl: report.result.fileUrl };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel report' })
  @ApiResponse({ status: 200, description: 'Report cancelled successfully' })
  async cancelReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    await this.reportService.cancelReport(reportId, user.sub);
    return { message: 'Report cancelled successfully' };
  }

  // Scheduled Reports
  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a recurring report' })
  @ApiResponse({ status: 201, description: 'Report scheduled successfully' })
  async scheduleReport(
    @CurrentUser() user: JwtPayload,
    @Body() reportData: Partial<IReport>
  ) {
    if (!reportData.schedule) {
      throw new Error('Schedule parameters are required');
    }
    return this.reportService.scheduleReport(user.sub, reportData);
  }

  @Delete('schedule/:id')
  @ApiOperation({ summary: 'Cancel scheduled report' })
  @ApiResponse({ status: 200, description: 'Scheduled report cancelled' })
  async cancelScheduledReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    await this.reportService.cancelReport(reportId, user.sub);
    return { message: 'Scheduled report cancelled successfully' };
  }
} 