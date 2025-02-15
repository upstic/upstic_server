import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { NotificationService } from '../../services/notification.service';
import { ReportingService } from '../../services/reporting.service';
import { CacheService } from '../../services/cache.service';
import { ValidationService } from '../../services/validation.service';
import { AnalyticsService } from '../../services/analytics.service';

@Injectable()
export class BudgetManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly ALERT_THRESHOLDS = {
    warning: 0.7, // 70%
    critical: 0.9,  // 90%
    overspend: 0.1, // 10% over budget
    underspend: 0.2  // 20% under budget
  };
  private readonly REVIEW_PERIODS = {
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    annual: 365
  };

  constructor(
    @InjectModel('Budget') private budgetModel: Model<any>,
    @InjectModel('Allocation') private allocationModel: Model<any>,
    @InjectModel('Expense') private expenseModel: Model<any>,
    @InjectModel('Transaction') private transactionModel: Model<any>,
    @InjectModel('Forecast') private forecastModel: Model<any>,
    private notificationService: NotificationService,
    private reportingService: ReportingService,
    private validationService: ValidationService,
    private analyticsService: AnalyticsService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createBudget(
    input: BudgetInput
  ): Promise<BudgetResponse> {
    try {
      // Validate budget data
      await this.validateBudgetInput(input);

      // Create budget record
      const budget = await this.budgetModel.create({
        ...input,
        status: 'active',
        utilized: 0,
        createdAt: new Date()
      });

      // Create initial allocations
      await this.createInitialAllocations(budget);

      // Set up monitoring
      await this.setupBudgetMonitoring(budget);

      return {
        success: true,
        budgetId: budget._id,
        message: 'Budget created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating budget:', error);
      throw error;
    }
  }

  async allocateBudget(
    input: AllocationInput
  ): Promise<AllocationResponse> {
    try {
      // Validate allocation
      await this.validateAllocation(input);

      // Create allocation record
      const allocation = await this.allocationModel.create({
        ...input,
        status: 'active',
        utilized: 0,
        createdAt: new Date()
      });

      // Update budget utilization
      await this.updateBudgetUtilization(input.budgetId);

      // Check allocation thresholds
      await this.checkAllocationThresholds(allocation);

      return {
        success: true,
        allocationId: allocation._id,
        message: 'Budget allocated successfully'
      };
    } catch (error) {
      this.logger.error('Error allocating budget:', error);
      throw error;
    }
  }

  async trackExpense(
    input: ExpenseInput
  ): Promise<ExpenseResponse> {
    try {
      // Validate expense
      await this.validateExpense(input);

      // Record transaction
      const transaction = await this.transactionModel.create({
        ...input,
        type: 'expense',
        timestamp: new Date()
      });

      // Update budget tracking
      await this.updateBudgetTracking(input.budgetId, transaction);

      // Check thresholds
      await this.checkBudgetThresholds(input.budgetId);

      return {
        success: true,
        transactionId: transaction._id,
        message: 'Expense tracked successfully'
      };
    } catch (error) {
      this.logger.error('Error tracking expense:', error);
      throw error;
    }
  }

  async getBudgetAnalytics(
    budgetId: string
  ): Promise<BudgetAnalytics> {
    const cacheKey = `budget:analytics:${budgetId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const [budget, allocations, expenses] = await Promise.all([
        this.budgetModel.findById(budgetId),
        this.allocationModel.find({ budgetId }),
        this.expenseModel.find({ budgetId })
      ]);

      const analytics = this.calculateBudgetAnalytics(
        budget,
        allocations,
        expenses
      );

      await this.cacheService.set(cacheKey, analytics, this.CACHE_TTL);

      return analytics;
    } catch (error) {
      this.logger.error('Error getting budget analytics:', error);
      throw error;
    }
  }

  async generateBudgetReport(
    input: ReportInput
  ): Promise<BudgetReport> {
    const cacheKey = `budget:report:${JSON.stringify(input)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const report = await this.compileBudgetReport(input);
      await this.cacheService.set(cacheKey, report, this.CACHE_TTL);

      return report;
    } catch (error) {
      this.logger.error('Error generating budget report:', error);
      throw error;
    }
  }

  async forecastBudget(
    input: ForecastInput
  ): Promise<ForecastResponse> {
    try {
      // Validate forecast parameters
      await this.validateForecast(input);

      // Generate forecast
      const forecast = await this.generateForecast(input);

      // Store forecast
      await this.forecastModel.create({
        ...forecast,
        createdAt: new Date()
      });

      return {
        success: true,
        forecast,
        message: 'Budget forecast generated successfully'
      };
    } catch (error) {
      this.logger.error('Error forecasting budget:', error);
      throw error;
    }
  }

  private async validateBudgetInput(
    input: BudgetInput
  ): Promise<void> {
    if (input.amount <= 0) {
      throw new Error('Invalid budget amount');
    }

    if (input.startDate >= input.endDate) {
      throw new Error('Invalid date range');
    }

    // Additional validation logic...
  }

  private async validateAllocation(
    input: AllocationInput
  ): Promise<void> {
    const budget = await this.budgetModel.findById(input.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const totalAllocated = await this.getTotalAllocated(input.budgetId);
    if (totalAllocated + input.amount > budget.amount) {
      throw new Error('Allocation would exceed budget');
    }
  }

  private async validateExpense(
    input: ExpenseInput
  ): Promise<void> {
    const allocation = await this.allocationModel.findById(input.allocationId);
    if (!allocation) {
      throw new Error('Allocation not found');
    }

    if (allocation.utilized + input.amount > allocation.amount) {
      throw new Error('Expense would exceed allocation');
    }
  }

  private async createInitialAllocations(
    budget: any
  ): Promise<void> {
    if (budget.initialAllocations) {
      const allocations = budget.initialAllocations.map(allocation => ({
        budgetId: budget._id,
        ...allocation,
        status: 'active',
        utilized: 0,
        createdAt: new Date()
      }));

      await this.allocationModel.insertMany(allocations);
    }
  }

  private async setupBudgetMonitoring(
    budget: any
  ): Promise<void> {
    // Set up periodic checks
    await this.schedulePeriodicChecks(budget);

    // Set up alerts
    await this.setupBudgetAlerts(budget);
  }

  private async updateBudgetUtilization(
    budgetId: string
  ): Promise<void> {
    const [budget, expenses] = await Promise.all([
      this.budgetModel.findById(budgetId),
      this.expenseModel.find({ budgetId, status: 'approved' })
    ]);

    const totalUtilized = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    await this.budgetModel.findByIdAndUpdate(
      budgetId,
      {
        utilized: totalUtilized,
        updatedAt: new Date()
      }
    );

    // Invalidate cache
    await this.cacheService.delete(`budget:analytics:${budgetId}`);
  }

  private async checkBudgetThresholds(
    budgetId: string
  ): Promise<void> {
    const budget = await this.budgetModel.findById(budgetId);
    if (!budget) return;

    const transactions = await this.getTransactions({ budgetId });
    const totalSpent = this.calculateTotalSpent(transactions);
    const spendRatio = totalSpent / budget.amount;

    if (spendRatio >= this.ALERT_THRESHOLDS.critical) {
      await this.notifyBudgetThreshold(budget, 'critical', spendRatio);
    } else if (spendRatio >= (1 + this.ALERT_THRESHOLDS.overspend)) {
      await this.notifyBudgetThreshold(budget, 'overspend', spendRatio);
    } else if (this.isPeriodNearEnd(budget) && 
               spendRatio <= (1 - this.ALERT_THRESHOLDS.underspend)) {
      await this.notifyBudgetThreshold(budget, 'underspend', spendRatio);
    }
  }

  private calculateBudgetAnalytics(
    budget: any,
    allocations: any[],
    expenses: any[]
  ): BudgetAnalytics {
    return {
      overview: {
        total: budget.amount,
        allocated: allocations.reduce((sum, a) => sum + a.amount, 0),
        utilized: expenses.reduce((sum, e) => sum + e.amount, 0),
        remaining: budget.amount - budget.utilized
      },
      allocations: this.calculateAllocationMetrics(allocations),
      expenses: this.calculateExpenseMetrics(expenses),
      trends: this.calculateTrends(expenses),
      projections: this.calculateProjections(budget, expenses)
    };
  }

  private calculateAllocationMetrics(
    allocations: any[]
  ): AllocationMetrics {
    return allocations.reduce((metrics, allocation) => {
      metrics[allocation.category] = {
        allocated: allocation.amount,
        utilized: allocation.utilized,
        remaining: allocation.amount - allocation.utilized
      };
      return metrics;
    }, {});
  }

  private calculateExpenseMetrics(
    expenses: any[]
  ): ExpenseMetrics {
    return {
      byCategory: this.groupExpensesByCategory(expenses),
      byMonth: this.groupExpensesByMonth(expenses),
      topExpenses: this.getTopExpenses(expenses)
    };
  }

  private calculateTrends(
    expenses: any[]
  ): BudgetTrends {
    return {
      daily: this.calculateDailyTrend(expenses),
      weekly: this.calculateWeeklyTrend(expenses),
      monthly: this.calculateMonthlyTrend(expenses)
    };
  }

  private calculateProjections(
    budget: any,
    expenses: any[]
  ): BudgetProjections {
    const burnRate = this.calculateBurnRate(expenses);
    const remainingBudget = budget.amount - budget.utilized;
    
    return {
      burnRate,
      estimatedDepletion: new Date(
        Date.now() + (remainingBudget / burnRate) * 24 * 60 * 60 * 1000
      ),
      projectedOverage: this.calculateProjectedOverage(
        budget,
        expenses,
        burnRate
      )
    };
  }

  private async compileBudgetReport(
    input: ReportInput
  ): Promise<BudgetReport> {
    const [budget, transactions, analytics] = await Promise.all([
      this.budgetModel.findById(input.budgetId),
      this.getTransactions(input),
      this.getAnalytics(input)
    ]);

    if (!budget) {
      throw new Error('Budget not found');
    }

    return {
      summary: {
        totalBudget: budget.amount,
        spent: this.calculateTotalSpent(transactions),
        remaining: this.calculateRemaining(budget, transactions),
        periodProgress: this.calculatePeriodProgress(budget)
      },
      breakdown: {
        byCategory: this.groupByCategory(transactions),
        byPeriod: this.groupByPeriod(transactions, input.period),
        byDepartment: this.groupByDepartment(transactions)
      },
      analysis: {
        trends: analytics.trends,
        projections: analytics.projections,
        anomalies: analytics.anomalies
      },
      recommendations: this.generateRecommendations(budget, transactions, analytics)
    };
  }

  private async generateForecast(
    input: ForecastInput
  ): Promise<BudgetForecast> {
    const historicalData = await this.getHistoricalData(input);
    const trends = await this.analyzeTrends(historicalData);
    const seasonality = this.calculateSeasonality(historicalData);

    return {
      periods: this.generateForecastPeriods(input.periods),
      projections: this.calculateProjections(trends, seasonality),
      confidence: this.calculateConfidenceIntervals(trends),
      factors: this.identifyInfluencingFactors(historicalData),
      risks: this.assessForecastRisks(trends, seasonality)
    };
  }

  private async notifyBudgetThreshold(
    budget: any,
    type: string,
    spendRatio: number
  ): Promise<void> {
    await this.notificationService.notify({
      type: `BUDGET_${type.toUpperCase()}`,
      userId: budget.managerId,
      data: {
        budgetId: budget._id,
        utilization: spendRatio,
        threshold: this.ALERT_THRESHOLDS[type]
      }
    });
  }

  private isPeriodNearEnd(
    budget: any
  ): boolean {
    const now = new Date();
    const endDate = new Date(budget.endDate);
    const period = this.REVIEW_PERIODS[budget.period];
    const periodEnd = new Date(endDate.getTime() + period * 24 * 60 * 60 * 1000);
    const daysLeft = Math.floor((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7;
  }
}

interface BudgetInput {
  name: string;
  amount: number;
  period: keyof typeof BudgetManager.prototype.REVIEW_PERIODS;
  startDate: Date;
  endDate: Date;
  categories: Array<{
    name: string;
    allocation: number;
    description?: string;
  }>;
  department?: string;
  metadata?: Record<string, any>;
}

interface AllocationInput {
  budgetId: string;
  category: string;
  amount: number;
  description?: string;
}

interface ExpenseInput {
  budgetId: string;
  allocationId: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  metadata?: Record<string, any>;
}

interface BudgetResponse {
  success: boolean;
  budgetId: string;
  message: string;
}

interface AllocationResponse {
  success: boolean;
  allocationId: string;
  message: string;
}

interface ExpenseResponse {
  success: boolean;
  transactionId: string;
  message: string;
}

interface BudgetAnalytics {
  overview: {
    total: number;
    allocated: number;
    utilized: number;
    remaining: number;
  };
  allocations: AllocationMetrics;
  expenses: ExpenseMetrics;
  trends: BudgetTrends;
  projections: BudgetProjections;
}

interface AllocationMetrics {
  [category: string]: {
    allocated: number;
    utilized: number;
    remaining: number;
  };
}

interface ExpenseMetrics {
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
  topExpenses: Array<{
    id: string;
    amount: number;
    category: string;
    date: Date;
  }>;
}

interface BudgetTrends {
  daily: Array<{
    date: string;
    amount: number;
  }>;
  weekly: Array<{
    week: string;
    amount: number;
  }>;
  monthly: Array<{
    month: string;
    amount: number;
  }>;
}

interface BudgetProjections {
  burnRate: number;
  estimatedDepletion: Date;
  projectedOverage: number;
}

interface ReportInput {
  budgetId: string;
  period: keyof typeof BudgetManager.prototype.REVIEW_PERIODS;
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  departments?: string[];
}

interface BudgetReport {
  summary: {
    totalBudget: number;
    spent: number;
    remaining: number;
    periodProgress: number;
  };
  breakdown: {
    byCategory: Record<string, number>;
    byPeriod: Array<{
      period: string;
      amount: number;
    }>;
    byDepartment: Record<string, number>;
  };
  analysis: {
    trends: Array<{
      metric: string;
      values: number[];
      change: number;
    }>;
    projections: Array<{
      period: string;
      amount: number;
      confidence: number;
    }>;
    anomalies: Array<{
      date: Date;
      category: string;
      amount: number;
      description: string;
    }>;
  };
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    potentialSavings?: number;
    actions: string[];
  }>;
}

interface ForecastInput {
  budgetId: string;
  periods: number;
  factors?: string[];
  confidence?: number;
}

interface ForecastResponse {
  success: boolean;
  forecast: BudgetForecast;
  message: string;
}

interface BudgetForecast {
  periods: Array<{
    startDate: Date;
    endDate: Date;
  }>;
  projections: Array<{
    period: string;
    amount: number;
    breakdown: Record<string, number>;
  }>;
  confidence: {
    overall: number;
    byPeriod: Record<string, number>;
  };
  factors: Array<{
    name: string;
    impact: number;
    trend: string;
  }>;
  risks: Array<{
    type: string;
    probability: number;
    impact: number;
    mitigation?: string;
  }>;
} 