import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Compliance } from '../models/Compliance';
import { Worker } from '../models/Worker';
import { Company } from '../models/Company';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { Logger } from '../utils/logger';
import { CacheService } from './cache.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ComplianceMonitoringService {
  private readonly CACHE_TTL = 3600;
  private readonly EXPIRY_WARNING_DAYS = 30;
  private readonly CRITICAL_WARNING_DAYS = 7;

  constructor(
    @InjectModel(Compliance.name) private complianceModel: Model<Compliance>,
    @InjectModel(Worker.name) private workerModel: Model<Worker>,
    @InjectModel(Company.name) private companyModel: Model<Company>,
    private configService: ConfigService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async monitorCompliance(entityId: string, entityType: string): Promise<ComplianceStatus> {
    try {
      const cacheKey = `compliance_status:${entityType}:${entityId}`;
      const cachedStatus = await this.cacheService.get(cacheKey);

      if (cachedStatus) {
        return JSON.parse(cachedStatus);
      }

      const compliance = await this.complianceModel.findOne({ entityId, entityType });
      if (!compliance) {
        throw new Error('Compliance record not found');
      }

      const status = await this.checkComplianceStatus(compliance);
      await this.updateComplianceStatus(compliance, status);
      
      await this.cacheService.set(cacheKey, JSON.stringify(status), this.CACHE_TTL);
      return status;
    } catch (error) {
      this.logger.error('Error monitoring compliance:', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyComplianceCheck(): Promise<void> {
    try {
      const entities = await Promise.all([
        this.workerModel.find({ status: 'active' }),
        this.companyModel.find({ status: 'active' })
      ]);

      const complianceChecks = [
        ...entities[0].map(worker => this.monitorCompliance(worker._id, 'worker')),
        ...entities[1].map(company => this.monitorCompliance(company._id, 'company'))
      ];

      const results = await Promise.allSettled(complianceChecks);
      
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        this.logger.error(`${failures.length} compliance checks failed`);
      }

      await this.generateComplianceReport(results);
    } catch (error) {
      this.logger.error('Error in daily compliance check:', error);
      throw error;
    }
  }

  private async checkComplianceStatus(compliance: Compliance): Promise<ComplianceStatus> {
    const now = new Date();
    const status: ComplianceStatus = {
      overall: 'compliant',
      requirements: [],
      certifications: [],
      expiringItems: [],
      violations: [],
      lastChecked: now
    };

    // Check requirements
    for (const req of compliance.requirements) {
      const requirementStatus = this.checkRequirementStatus(req, now);
      status.requirements.push(requirementStatus);

      if (requirementStatus.status === 'expired' || requirementStatus.status === 'missing') {
        status.violations.push({
          type: 'requirement',
          item: req.name,
          severity: req.required ? 'critical' : 'warning',
          details: `${req.name} is ${requirementStatus.status}`
        });
      }

      if (requirementStatus.expiresIn && requirementStatus.expiresIn <= this.EXPIRY_WARNING_DAYS) {
        status.expiringItems.push({
          type: 'requirement',
          item: req.name,
          expiryDate: requirementStatus.expiryDate,
          daysRemaining: requirementStatus.expiresIn
        });
      }
    }

    // Check certifications
    for (const cert of compliance.certifications) {
      const certStatus = this.checkCertificationStatus(cert, now);
      status.certifications.push(certStatus);

      if (certStatus.status === 'expired') {
        status.violations.push({
          type: 'certification',
          item: cert.name,
          severity: 'critical',
          details: `${cert.name} certification has expired`
        });
      }

      if (certStatus.expiresIn && certStatus.expiresIn <= this.EXPIRY_WARNING_DAYS) {
        status.expiringItems.push({
          type: 'certification',
          item: cert.name,
          expiryDate: certStatus.expiryDate,
          daysRemaining: certStatus.expiresIn
        });
      }
    }

    // Determine overall status
    if (status.violations.some(v => v.severity === 'critical')) {
      status.overall = 'non-compliant';
    } else if (status.violations.length > 0) {
      status.overall = 'warning';
    }

    return status;
  }

  private checkRequirementStatus(requirement: any, now: Date): RequirementStatus {
    const status: RequirementStatus = {
      name: requirement.name,
      status: 'valid',
      lastVerified: requirement.verificationDate
    };

    if (!requirement.documents || requirement.documents.length === 0) {
      status.status = 'missing';
      return status;
    }

    const latestDoc = requirement.documents[requirement.documents.length - 1];
    if (latestDoc.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (latestDoc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        status.status = 'expired';
      } else {
        status.expiryDate = latestDoc.expiryDate;
        status.expiresIn = daysUntilExpiry;
      }
    }

    return status;
  }

  private checkCertificationStatus(certification: any, now: Date): CertificationStatus {
    const status: CertificationStatus = {
      name: certification.name,
      issuer: certification.issuer,
      status: certification.status
    };

    if (certification.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (certification.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        status.status = 'expired';
      } else {
        status.expiryDate = certification.expiryDate;
        status.expiresIn = daysUntilExpiry;
      }
    }

    return status;
  }

  private async updateComplianceStatus(
    compliance: Compliance,
    status: ComplianceStatus
  ): Promise<void> {
    compliance.overallStatus = status.overall;
    compliance.lastReviewDate = new Date();
    await compliance.save();

    // Send notifications for violations and expiring items
    await this.sendComplianceNotifications(compliance, status);
  }

  private async sendComplianceNotifications(
    compliance: Compliance,
    status: ComplianceStatus
  ): Promise<void> {
    // Handle critical violations
    const criticalViolations = status.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      await this.notifyComplianceViolations(compliance, criticalViolations);
    }

    // Handle expiring items
    const criticalExpirations = status.expiringItems.filter(
      item => item.daysRemaining <= this.CRITICAL_WARNING_DAYS
    );
    if (criticalExpirations.length > 0) {
      await this.notifyExpiringItems(compliance, criticalExpirations);
    }
  }

  private async notifyComplianceViolations(
    compliance: Compliance,
    violations: ComplianceViolation[]
  ): Promise<void> {
    const emailData = {
      template: 'compliance-violation',
      subject: 'Critical Compliance Violations Detected',
      context: {
        entityType: compliance.entityType,
        entityId: compliance.entityId,
        violations,
        dashboardUrl: `${this.configService.get('APP_URL')}/compliance/${compliance._id}`
      }
    };

    await Promise.all([
      this.emailService.sendEmail(emailData),
      this.notificationService.send({
        userId: compliance.entityId,
        type: 'compliance_violation',
        title: 'Compliance Violation',
        body: `${violations.length} critical compliance violations detected`,
        data: { complianceId: compliance._id }
      })
    ]);
  }

  private async notifyExpiringItems(
    compliance: Compliance,
    expiringItems: ExpiringItem[]
  ): Promise<void> {
    const emailData = {
      template: 'compliance-expiring',
      subject: 'Compliance Items Expiring Soon',
      context: {
        entityType: compliance.entityType,
        entityId: compliance.entityId,
        expiringItems,
        dashboardUrl: `${this.configService.get('APP_URL')}/compliance/${compliance._id}`
      }
    };

    await Promise.all([
      this.emailService.sendEmail(emailData),
      this.notificationService.send({
        userId: compliance.entityId,
        type: 'compliance_expiring',
        title: 'Compliance Items Expiring',
        body: `${expiringItems.length} compliance items are expiring soon`,
        data: { complianceId: compliance._id }
      })
    ]);
  }

  private async generateComplianceReport(results: PromiseSettledResult<ComplianceStatus>[]): Promise<void> {
    const report = {
      date: new Date(),
      totalChecked: results.length,
      compliant: 0,
      nonCompliant: 0,
      warnings: 0,
      failures: 0
    };

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        switch (result.value.overall) {
          case 'compliant':
            report.compliant++;
            break;
          case 'non-compliant':
            report.nonCompliant++;
            break;
          case 'warning':
            report.warnings++;
            break;
        }
      } else {
        report.failures++;
      }
    });

    // Save report to database or send to monitoring system
    this.logger.info('Daily compliance report:', report);
  }
}

interface ComplianceStatus {
  overall: 'compliant' | 'non-compliant' | 'warning';
  requirements: RequirementStatus[];
  certifications: CertificationStatus[];
  expiringItems: ExpiringItem[];
  violations: ComplianceViolation[];
  lastChecked: Date;
}

interface RequirementStatus {
  name: string;
  status: 'valid' | 'expired' | 'missing';
  lastVerified?: Date;
  expiryDate?: Date;
  expiresIn?: number;
}

interface CertificationStatus {
  name: string;
  issuer: string;
  status: string;
  expiryDate?: Date;
  expiresIn?: number;
}

interface ComplianceViolation {
  type: 'requirement' | 'certification';
  item: string;
  severity: 'warning' | 'critical';
  details: string;
}

interface ExpiringItem {
  type: 'requirement' | 'certification';
  item: string;
  expiryDate: Date;
  daysRemaining: number;
} 