import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ReportService } from '../services/report.service';
import { IReport } from '../models/Report';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  @Post()
  async requestReport(
    @CurrentUser() user: JwtPayload,
    @Body() reportData: Partial<IReport>
  ) {
    return await ReportService.requestReport(user.sub, reportData);
  }

  @Get(':id')
  async getReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    return await ReportService.getReport(reportId, user.sub);
  }

  @Get()
  async listReports(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    // Since getReports is not available, we'll use getReport for now
    // TODO: Implement proper list functionality in ReportService
    return await ReportService.getReport(user.sub);
  }

  @Delete(':id')
  async cancelReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    await ReportService.cancelReport(reportId, user.sub);
    return { message: 'Report cancelled successfully' };
  }

  @Get(':id/download')
  async downloadReport(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    const report = await ReportService.getReport(reportId, user.sub);
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
    return await ReportService.scheduleReport(user.sub, reportData);
  }

  @Put('schedule/:id')
  async updateSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string,
    @Body() updateData: Partial<IReport>
  ) {
    return await ReportService.scheduleReport(user.sub, {
      ...updateData,
      reportId
    });
  }

  @Delete('schedule/:id')
  async cancelSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('id') reportId: string
  ) {
    await ReportService.cancelReport(reportId, user.sub);
    return { message: 'Scheduled report cancelled successfully' };
  }
}