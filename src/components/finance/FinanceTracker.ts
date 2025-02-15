import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { NotificationService } from '../../services/notification.service';
import { ValidationService } from '../../services/validation.service';
import { AnalyticsService } from '../../services/analytics.service';

@Injectable()
export class FinanceTracker {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly REPORTING_PERIODS = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    annual: 365
  };
  private readonly ALERT_THRESHOLDS = {
    revenue: 0.15,    // 15% decrease
    expenses: 0.20,   // 20% increase
    cashflow: 0.25    // 25% decrease
  };

  constructor(
    @InjectModel('Transaction') private transactionModel: Model<any>,
    @InjectModel('Revenue') private revenueModel: Model<any>,
    @InjectModel('Expense') private expenseModel: Model<any>,
    private notificationService: NotificationService,
    private validationService: ValidationService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async trackTransaction(
    input: TransactionInput
  ): Promise<TransactionResponse> {
    try {
      // Validate transaction
      await this.validateTransaction(input);

      // Record transaction
      const transaction = await this.transactionModel.create({
        ...input,
        timestamp: new Date()
      });

      // Update relevant metrics
      if (input.type === 'revenue') {
        await this.updateRevenueMetrics(transaction);
      } else {
        await this.updateExpenseMetrics(transaction);
      }

      // Check financial health
      await this.checkFinancialHealth();

      return {
        success: true,
        transactionId: transaction._id,
        message: 'Transaction recorded successfully'
      };
    } catch (error) {
      this.logger.error('Error tracking transaction:', error);
      throw error;
    }
  }

  async generateFinancialReport(
    input: ReportInput
  ): Promise<FinancialReport> {
    const cacheKey = `finance:report:${JSON.stringify(input)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const report = await this.compileFinancialReport(input);
      await this.cacheService.set(cacheKey, report, this.CACHE_TTL);

      return report;
    } catch (error) {
      this.logger.error('Error generating financial report:', error);
      throw error;
    }
  }

  async analyzeTrends(
    input: TrendInput
  ): Promise<TrendAnalysis> {
    try {
      // Validate trend parameters
      await this.validateTrendParams(input);

      // Gather historical data
      const data = await this.gatherHistoricalData(input);

      // Analyze trends
      const analysis = await this.performTrendAnalysis(data);

      // Generate insights
      const insights = this.generateTrendInsights(analysis);

      return {
        trends: analysis,
        insights,
        period: input.period,
        metadata: {
          generatedAt: new Date(),
          dataPoints: data.length
        }
      };
    } catch (error) {
      this.logger.error('Error analyzing trends:', error);
      throw error;
    }
  }

  async forecastFinancials(
    input: ForecastInput
  ): Promise<ForecastResponse> {
    try {
      // Validate forecast parameters
      await this.validateForecastParams(input);

      // Generate forecast
      const forecast = await this.generateFinancialForecast(input);

      // Calculate confidence intervals
      const confidence = this.calculateConfidenceIntervals(forecast);

      return {
        forecast,
        confidence,
        period: input.period,
        metadata: {
          generatedAt: new Date(),
          modelType: 'time-series-analysis'
        }
      };
    } catch (error) {
      this.logger.error('Error forecasting financials:', error);
      throw error;
    }
  }

  private async compileFinancialReport(
    input: ReportInput
  ): Promise<FinancialReport> {
    const [revenue, expenses, transactions] = await Promise.all([
      this.getRevenueData(input),
      this.getExpenseData(input),
      this.getTransactionData(input)
    ]);

    return {
      summary: {
        totalRevenue: this.calculateTotalRevenue(revenue),
        totalExpenses: this.calculateTotalExpenses(expenses),
        netIncome: this.calculateNetIncome(revenue, expenses),
        cashflow: this.calculateCashflow(transactions)
      },
      details: {
        revenue: this.categorizeRevenue(revenue),
        expenses: this.categorizeExpenses(expenses),
        transactions: this.groupTransactions(transactions)
      },
      analysis: {
        trends: this.analyzePeriodTrends(revenue, expenses),
        metrics: this.calculateFinancialMetrics(revenue, expenses),
        comparisons: this.generatePeriodComparisons(input.period)
      },
      projections: {
        revenue: this.projectRevenue(revenue),
        expenses: this.projectExpenses(expenses),
        cashflow: this.projectCashflow(transactions)
      }
    };
  }

  private async checkFinancialHealth(): Promise<void> {
    try {
      const metrics = await this.calculateHealthMetrics();
      
      // Check revenue trends
      if (metrics.revenueTrend < -this.ALERT_THRESHOLDS.revenue) {
        await this.notifyFinancialAlert('revenue-decrease', metrics);
      }

      // Check expense trends
      if (metrics.expenseTrend > this.ALERT_THRESHOLDS.expenses) {
        await this.notifyFinancialAlert('expense-increase', metrics);
      }

      // Check cashflow
      if (metrics.cashflowTrend < -this.ALERT_THRESHOLDS.cashflow) {
        await this.notifyFinancialAlert('cashflow-decrease', metrics);
      }
    } catch (error) {
      this.logger.error('Error checking financial health:', error);
    }
  }
}

interface TransactionInput {
  type: 'revenue' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  metadata?: Record<string, any>;
}

interface TransactionResponse {
  success: boolean;
  transactionId: string;
  message: string;
}

interface ReportInput {
  startDate: Date;
  endDate: Date;
  period: keyof typeof FinanceTracker.prototype.REPORTING_PERIODS;
  categories?: string[];
  includeProjections?: boolean;
}

interface FinancialReport {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    cashflow: number;
  };
  details: {
    revenue: Record<string, number>;
    expenses: Record<string, number>;
    transactions: Array<{
      date: string;
      type: string;
      amount: number;
    }>;
  };
  analysis: {
    trends: Array<{
      metric: string;
      values: number[];
      change: number;
    }>;
    metrics: {
      profitMargin: number;
      operatingMargin: number;
      cashflowRatio: number;
    };
    comparisons: Array<{
      period: string;
      metrics: Record<string, number>;
    }>;
  };
  projections: {
    revenue: Array<{
      period: string;
      amount: number;
      confidence: number;
    }>;
    expenses: Array<{
      period: string;
      amount: number;
      confidence: number;
    }>;
    cashflow: Array<{
      period: string;
      amount: number;
      confidence: number;
    }>;
  };
}

interface TrendInput {
  metrics: string[];
  period: keyof typeof FinanceTracker.prototype.REPORTING_PERIODS;
  startDate: Date;
  endDate: Date;
}

interface TrendAnalysis {
  trends: Array<{
    metric: string;
    data: Array<{
      date: string;
      value: number;
    }>;
    statistics: {
      mean: number;
      median: number;
      stdDev: number;
    };
  }>;
  insights: Array<{
    type: string;
    description: string;
    significance: number;
    recommendations?: string[];
  }>;
  period: string;
  metadata: {
    generatedAt: Date;
    dataPoints: number;
  };
}

interface ForecastInput {
  period: keyof typeof FinanceTracker.prototype.REPORTING_PERIODS;
  duration: number;
  metrics: string[];
  factors?: string[];
}

interface ForecastResponse {
  forecast: Array<{
    period: string;
    metrics: Record<string, number>;
  }>;
  confidence: {
    overall: number;
    byMetric: Record<string, number>;
  };
  period: string;
  metadata: {
    generatedAt: Date;
    modelType: string;
  };
} 