import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ReportService } from '../services/report.service';
import { IReport } from '../models/Report';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  async requestReport(
    @CurrentUser() user: JwtPayload,
    @Body() reportData: Partial<IReport>
  ) {
    return await this.reportService.requestReport(user.sub, reportData);
  }

  @Get(':id')
  async getReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    return await this.reportService.getReport(reportId, user.sub);
  }

  @Get()
  async listReports(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    // Since there's no dedicated method to list reports, we'll implement a basic solution
    // TODO: Implement proper list functionality in ReportService
    
    // For now, we'll return an empty array with a message
    // This should be replaced with actual implementation when available
    return {
      reports: [],
      message: 'Report listing functionality is not yet implemented',
      filters: { status, type, startDate, endDate }
    };
  }

  @Delete(':id')
  async cancelReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    await this.reportService.cancelReport(reportId, user.sub);
    return { message: 'Report cancelled successfully' };
  }

  @Get(':id/download')
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

  @Post('schedule')
  async scheduleReport(
    @CurrentUser() user: JwtPayload,
    @Body() reportData: Partial<IReport>
  ) {
    if (!reportData.schedule) {
      throw new Error('Schedule parameters are required');
    }
    return await this.reportService.scheduleReport(user.sub, reportData);
  }

  @Put('schedule/:id')
  async updateSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string,
    @Body() updateData: Partial<IReport>
  ) {
    // First get the existing report to update it properly
    const existingReport = await this.reportService.getReport(reportId, user.sub);
    
    // Create a new report data object with the existing report ID
    // We don't add reportId to updateData since it's not part of IReport
    return await this.reportService.scheduleReport(user.sub, {
      ...updateData,
      // Use the existing report's type and name if not provided in the update
      type: updateData.type || existingReport.type,
      name: updateData.name || existingReport.name
    });
  }

  @Delete('schedule/:id')
  async cancelSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    await this.reportService.cancelReport(reportId, user.sub);
    return { message: 'Scheduled report cancelled successfully' };
  }
}