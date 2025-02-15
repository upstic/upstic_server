import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PayrollService } from '../services/payroll.service';
import { IPayroll } from '../models/Payroll';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  async createPayroll(
    @CurrentUser() user: JwtPayload,
    @Body() payrollData: Partial<IPayroll>
  ) {
    return await this.payrollService.createPayroll(
      payrollData.workerId!,
      payrollData.clientId!,
      user.sub,
      payrollData
    );
  }

  @Get('worker/:workerId')
  async getWorkerPayrolls(
    @Param('workerId') workerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    return await this.payrollService.getWorkerPayrolls(workerId, filters);
  }

  @Get('period/:periodId')
  async getPayrollByPeriodId(
    @Param('periodId') periodId: string
  ) {
    return await this.payrollService.getPayrollByPeriodId(periodId);
  }

  @Put(':payrollId')
  async updatePayroll(
    @CurrentUser() user: JwtPayload,
    @Param('payrollId') payrollId: string,
    @Body() updateData: Partial<IPayroll>
  ) {
    return await this.payrollService.updatePayroll(payrollId, user.sub, updateData);
  }

  @Post(':payrollId/process')
  async processPayroll(
    @CurrentUser() user: JwtPayload,
    @Param('payrollId') payrollId: string
  ) {
    return await this.payrollService.processPayroll(payrollId, user.sub);
  }

  @Get(':payrollId/payslip')
  async generatePayslip(
    @CurrentUser() user: JwtPayload,
    @Param('payrollId') payrollId: string
  ) {
    return await this.payrollService.generatePayslip(payrollId, user.sub);
  }

  @Get('reports')
  async getPayrollReports(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type
    };
    return await this.payrollService.getPayrollReports(filters);
  }
}