import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class SecurityManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly PASSWORD_EXPIRY_DAYS = 90;
  private readonly SENSITIVE_FIELDS = ['password', 'ssn', 'creditCard'];

  constructor(
    @InjectModel('SecurityEvent') private eventModel: Model<any>,
    @InjectModel('SecurityPolicy') private policyModel: Model<any>,
    @InjectModel('AuditLog') private auditModel: Model<any>,
    private cryptoService: CryptoService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async validateAccess(
    input: AccessValidationInput
  ): Promise<AccessValidationResponse> {
    try {
      // Check cache for quick validation
      const cacheKey = this.generateValidationCacheKey(input);
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;

      // Validate credentials
      const isValid = await this.validateCredentials(input);
      if (!isValid) {
        await this.handleFailedAccess(input);
        throw new Error('Invalid credentials');
      }

      // Check security policies
      await this.enforceSecurityPolicies(input);

      // Generate access token
      const token = await this.generateAccessToken(input);

      // Log successful access
      await this.logSecurityEvent({
        type: 'access',
        status: 'success',
        userId: input.userId,
        metadata: {
          ip: input.ip,
          userAgent: input.userAgent
        }
      });

      const response = {
        success: true,
        token,
        expiresIn: this.calculateTokenExpiry()
      };

      await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
      return response;
    } catch (error) {
      this.logger.error('Error validating access:', error);
      throw error;
    }
  }

  async encryptSensitiveData(
    input: EncryptionInput
  ): Promise<EncryptionResponse> {
    try {
      const encrypted = await this.cryptoService.encrypt(
        input.data,
        input.options
      );

      await this.logSecurityEvent({
        type: 'encryption',
        status: 'success',
        userId: input.userId,
        metadata: {
          dataType: input.dataType
        }
      });

      return {
        success: true,
        encryptedData: encrypted,
        metadata: {
          algorithm: input.options?.algorithm || 'AES-256-GCM',
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Error encrypting data:', error);
      throw error;
    }
  }

  async validateSecurityPolicy(
    input: PolicyValidationInput
  ): Promise<PolicyValidationResponse> {
    try {
      const policy = await this.policyModel.findOne({
        type: input.policyType,
        status: 'active'
      });

      if (!policy) {
        throw new Error('Security policy not found');
      }

      const isCompliant = await this.checkPolicyCompliance(
        input,
        policy
      );

      if (!isCompliant) {
        await this.handlePolicyViolation(input, policy);
        throw new Error('Security policy violation');
      }

      return {
        success: true,
        policyId: policy._id,
        details: this.generatePolicyDetails(policy)
      };
    } catch (error) {
      this.logger.error('Error validating security policy:', error);
      throw error;
    }
  }

  async getSecurityAudit(
    input: AuditQuery
  ): Promise<AuditResponse> {
    try {
      const events = await this.auditModel.find({
        timestamp: {
          $gte: input.startDate,
          $lte: input.endDate
        },
        ...(input.filters || {})
      }).sort({ timestamp: -1 });

      const analysis = await this.analyzeSecurityEvents(events);

      return {
        events,
        analysis,
        metadata: {
          timeframe: {
            start: input.startDate,
            end: input.endDate
          },
          totalEvents: events.length
        }
      };
    } catch (error) {
      this.logger.error('Error getting security audit:', error);
      throw error;
    }
  }

  private async handleFailedAccess(
    input: AccessValidationInput
  ): Promise<void> {
    const attempts = await this.incrementFailedAttempts(input.userId);

    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      await this.lockAccount(input.userId);
      await this.notifyAccountLock(input.userId);
    }

    await this.logSecurityEvent({
      type: 'access',
      status: 'failed',
      userId: input.userId,
      metadata: {
        attempts,
        ip: input.ip,
        userAgent: input.userAgent
      }
    });
  }

  private async enforceSecurityPolicies(
    input: AccessValidationInput
  ): Promise<void> {
    // Check password expiry
    await this.checkPasswordExpiry(input.userId);

    // Check IP whitelist
    await this.validateIPAccess(input.ip);

    // Check time-based access restrictions
    await this.validateTimeBasedAccess(input);

    // Check multi-factor authentication
    if (this.requiresMFA(input)) {
      await this.validateMFA(input);
    }
  }

  private async analyzeSecurityEvents(
    events: any[]
  ): Promise<SecurityAnalysis> {
    return {
      summary: this.generateEventsSummary(events),
      threats: await this.detectThreats(events),
      recommendations: this.generateSecurityRecommendations(events)
    };
  }

  private generateValidationCacheKey(
    input: AccessValidationInput
  ): string {
    return `security:validation:${input.userId}:${input.ip}`;
  }
}

interface AccessValidationInput {
  userId: string;
  credentials: {
    type: string;
    value: string;
  };
  ip: string;
  userAgent: string;
  mfaToken?: string;
}

interface AccessValidationResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

interface EncryptionInput {
  data: any;
  dataType: string;
  userId: string;
  options?: {
    algorithm?: string;
    keySize?: number;
  };
}

interface EncryptionResponse {
  success: boolean;
  encryptedData: string;
  metadata: {
    algorithm: string;
    timestamp: Date;
  };
}

interface PolicyValidationInput {
  policyType: string;
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, any>;
}

interface PolicyValidationResponse {
  success: boolean;
  policyId: string;
  details: {
    name: string;
    description: string;
    requirements: string[];
  };
}

interface AuditQuery {
  startDate: Date;
  endDate: Date;
  filters?: {
    type?: string;
    status?: string;
    userId?: string;
  };
}

interface AuditResponse {
  events: any[];
  analysis: SecurityAnalysis;
  metadata: {
    timeframe: {
      start: Date;
      end: Date;
    };
    totalEvents: number;
  };
}

interface SecurityAnalysis {
  summary: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  threats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    occurrences: number;
  }>;
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    actions: string[];
  }>;
} 