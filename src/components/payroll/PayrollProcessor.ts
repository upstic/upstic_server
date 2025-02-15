import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';
import { ValidationService } from '../../services/validation.service';
import { FinanceService } from '../../services/finance.service';
import { TaxService } from '../../services/tax.service';

@Injectable()
export class PayrollProcessor {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BATCH_SIZE = 100;
  private readonly TAX_YEAR = new Date().getFullYear();
  private readonly PAYMENT_METHODS = [
    'direct_deposit',
    'check',
    'wire_transfer'
  ] as const;

  constructor(
    @InjectModel('Payroll') private payrollModel: Model<any>,
    @InjectModel('Employee') private employeeModel: Model<any>,
    @InjectModel('Timesheet') private timesheetModel: Model<any>,
    private financeService: FinanceService,
    private taxService: TaxService,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async processPayroll(
    input: PayrollInput
  ): Promise<PayrollResponse> {
    try {
      // Validate payroll input
      await this.validatePayrollInput(input);

      // Create payroll record
      const payroll = await this.payrollModel.create({
        ...input,
        status: 'processing',
        createdAt: new Date()
      });

      // Process payroll asynchronously
      this.processPayrollAsync(payroll).catch(error => {
        this.logger.error('Error processing payroll:', error);
        this.updatePayrollStatus(
          payroll._id,
          'failed',
          error.message
        );
      });

      return {
        success: true,
        payrollId: payroll._id,
        message: 'Payroll processing initiated'
      };
    } catch (error) {
      this.logger.error('Error initiating payroll:', error);
      throw error;
    }
  }

  async calculatePayroll(
    input: CalculationInput
  ): Promise<PayrollCalculation> {
    try {
      // Validate calculation input
      await this.validateCalculationInput(input);

      // Get employee data
      const employees = await this.getEmployeeData(input.employeeIds);

      // Get timesheet data
      const timesheets = await this.getTimesheetData(
        input.employeeIds,
        input.period
      );

      // Calculate payroll
      const calculations = await this.calculatePayrollData(
        employees,
        timesheets,
        input
      );

      return {
        period: input.period,
        calculations,
        summary: this.generatePayrollSummary(calculations)
      };
    } catch (error) {
      this.logger.error('Error calculating payroll:', error);
      throw error;
    }
  }

  async generatePayslips(
    input: PayslipInput
  ): Promise<PayslipResponse> {
    try {
      // Validate payslip request
      await this.validatePayslipRequest(input);

      // Generate payslips
      const payslips = await this.generatePayslipDocuments(input);

      // Store payslips
      await this.storePayslips(payslips);

      // Notify employees
      await this.notifyEmployees(payslips);

      return {
        success: true,
        payslipIds: payslips.map(p => p._id),
        message: 'Payslips generated successfully'
      };
    } catch (error) {
      this.logger.error('Error generating payslips:', error);
      throw error;
    }
  }

  private async processPayrollAsync(
    payroll: any
  ): Promise<void> {
    try {
      // Get employee data
      const employees = await this.getEmployeeData(payroll.employeeIds);

      // Process in batches
      for (let i = 0; i < employees.length; i += this.BATCH_SIZE) {
        const batch = employees.slice(i, i + this.BATCH_SIZE);
        await this.processBatch(batch, payroll);
      }

      // Generate reports
      const reports = await this.generatePayrollReports(payroll);

      // Update payroll status
      await this.updatePayrollStatus(
        payroll._id,
        'completed',
        null,
        reports
      );

      // Notify stakeholders
      await this.notifyPayrollCompletion(payroll, reports);
    } catch (error) {
      throw error;
    }
  }

  private async calculatePayrollData(
    employees: any[],
    timesheets: any[],
    input: CalculationInput
  ): Promise<PayrollCalculation[]> {
    return Promise.all(
      employees.map(async employee => {
        const employeeTimesheets = timesheets.filter(
          t => t.employeeId === employee._id
        );

        const base = this.calculateBasePay(employee, employeeTimesheets);
        const overtime = this.calculateOvertime(employeeTimesheets);
        const deductions = await this.calculateDeductions(employee);
        const taxes = await this.calculateTaxes(employee, base + overtime);
        const benefits = await this.calculateBenefits(employee);

        return {
          employeeId: employee._id,
          period: input.period,
          earnings: {
            base,
            overtime,
            allowances: benefits.allowances,
            total: base + overtime + benefits.allowances
          },
          deductions: {
            tax: taxes,
            benefits: deductions.benefits,
            other: deductions.other,
            total: taxes + deductions.benefits + deductions.other
          },
          netPay: this.calculateNetPay(
            base + overtime + benefits.allowances,
            taxes + deductions.benefits + deductions.other
          )
        };
      })
    );
  }
}

interface PayrollInput {
  period: {
    startDate: Date;
    endDate: Date;
  };
  employeeIds: string[];
  paymentMethod: typeof PayrollProcessor.prototype.PAYMENT_METHODS[number];
  metadata?: Record<string, any>;
}

interface PayrollResponse {
  success: boolean;
  payrollId: string;
  message: string;
}

interface CalculationInput {
  employeeIds: string[];
  period: {
    startDate: Date;
    endDate: Date;
  };
  includeDetails?: boolean;
}

interface PayrollCalculation {
  period: {
    startDate: Date;
    endDate: Date;
  };
  calculations: Array<{
    employeeId: string;
    earnings: {
      base: number;
      overtime: number;
      allowances: number;
      total: number;
    };
    deductions: {
      tax: number;
      benefits: number;
      other: number;
      total: number;
    };
    netPay: number;
  }>;
  summary: {
    totalEarnings: number;
    totalDeductions: number;
    totalNetPay: number;
    employeeCount: number;
  };
}

interface PayslipInput {
  payrollId: string;
  employeeIds: string[];
  format?: 'pdf' | 'html' | 'json';
  delivery?: {
    method: 'email' | 'download' | 'portal';
    options?: Record<string, any>;
  };
}

interface PayslipResponse {
  success: boolean;
  payslipIds: string[];
  message: string;
}

interface PayrollDeductions {
  benefits: number;
  other: number;
}

interface PayrollBenefits {
  allowances: number;
  benefits: Array<{
    type: string;
    amount: number;
  }>;
}

interface PayrollReport {
  summary: {
    totalPaid: number;
    totalDeductions: number;
    totalTax: number;
    employeeCount: number;
  };
  details: Array<{
    employeeId: string;
    grossPay: number;
    deductions: number;
    netPay: number;
  }>;
  compliance: {
    taxRemitted: number;
    benefitsProcessed: number;
    deductionsProcessed: number;
  };
  audit: {
    processedAt: Date;
    processedBy: string;
    verifiedBy?: string;
  };
} 