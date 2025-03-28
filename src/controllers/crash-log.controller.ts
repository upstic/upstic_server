import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CrashLogService } from '../services/crash-log.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '../interfaces/user.interface';
import { CrashLogSeverity, CrashLogStatus } from '../interfaces/crash-log.interface';

@ApiTags('Crash Logs')
@Controller('crash-logs')
@ApiBearerAuth()
export class CrashLogController {
  constructor(private readonly crashLogService: CrashLogService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Get crash logs with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of crash logs' })
  @ApiQuery({ name: 'severity', required: false, enum: ['critical', 'error', 'warning', 'info'] })
  @ApiQuery({ name: 'status', required: false, enum: ['new', 'investigating', 'resolved', 'closed'] })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'userId', required: false })
  async getCrashLogs(
    @Query('severity') severity?: CrashLogSeverity,
    @Query('status') status?: CrashLogStatus,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('userId') userId?: string,
  ) {
    return this.crashLogService.getCrashLogs({
      severity,
      status,
      startDate,
      endDate,
      userId,
    });
  }

  @Get('analytics')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Get crash log analytics' })
  @ApiResponse({ status: 200, description: 'Crash log analytics data' })
  @ApiQuery({ name: 'startDate', required: true, type: Date })
  @ApiQuery({ name: 'endDate', required: true, type: Date })
  async getAnalytics(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.crashLogService.getAnalytics(startDate, endDate);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Get a crash log by ID' })
  @ApiParam({ name: 'id', description: 'Crash log ID' })
  @ApiResponse({ status: 200, description: 'Crash log details' })
  @ApiResponse({ status: 404, description: 'Crash log not found' })
  async getCrashLogById(@Param('id') id: string) {
    // This endpoint would need to be implemented in the service
    return { message: 'Not implemented yet', id };
  }

  @Put(':id/resolve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Resolve a crash log' })
  @ApiParam({ name: 'id', description: 'Crash log ID' })
  @ApiResponse({ status: 200, description: 'Crash log resolved successfully' })
  @ApiResponse({ status: 404, description: 'Crash log not found' })
  async resolveCrashLog(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body('notes') notes: string,
    @Body('solution') solution: string,
  ) {
    return this.crashLogService.resolveCrashLog(id, userId, { notes, solution });
  }

  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a new crash' })
  @ApiResponse({ status: 201, description: 'Crash logged successfully' })
  async logCrash(
    @Body() crashData: {
      error: Error;
      req: any;
      severity?: CrashLogSeverity;
    },
  ) {
    return this.crashLogService.logCrash(
      crashData.error,
      crashData.req,
      crashData.severity,
    );
  }
} 