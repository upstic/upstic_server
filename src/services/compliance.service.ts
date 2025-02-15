import { ComplianceRequirement, RequirementType } from '../models/ComplianceRequirement';
import { Document, DocumentStatus } from '../models/Document';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { AppError } from '../middleware/errorHandler';
import { notificationService, NotificationType } from './notification.service';
import { uploadToS3, deleteFromS3 } from '../utils/s3';
import { Queue } from 'bullmq';

export class ComplianceService {
  private static expiryCheckQueue: Queue;

  static initialize() {
    this.expiryCheckQueue = new Queue('compliance-checks', {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false
      }
    });
  }

  static async getWorkerRequirements(
    workerId: string,
    jobId?: string
  ): Promise<{
    required: any[];
    missing: any[];
    expiring: any[];
    valid: any[];
  }> {
    const worker = await User.findById(workerId);
    if (!worker) {
      throw new AppError(404, 'Worker not found');
    }

    let requirements;
    if (jobId) {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new AppError(404, 'Job not found');
      }
      requirements = await ComplianceRequirement.find({
        applicableJobTypes: job.type
      });
    } else {
      requirements = await ComplianceRequirement.find({
        isRequired: true
      });
    }

    const documents = await Document.find({ workerId });
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = {
      required: requirements,
      missing: [] as any[],
      expiring: [] as any[],
      valid: [] as any[]
    };

    requirements.forEach(req => {
      const doc = documents.find(d => 
        d.type === req.type && 
        d.status === DocumentStatus.APPROVED
      );

      if (!doc) {
        result.missing.push(req);
      } else if (doc.expiryDate && doc.expiryDate <= thirtyDaysFromNow) {
        result.expiring.push({
          requirement: req,
          document: doc,
          daysUntilExpiry: Math.ceil(
            (doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        });
      } else {
        result.valid.push({
          requirement: req,
          document: doc
        });
      }
    });

    return result;
  }

  static async uploadDocument(
    workerId: string,
    requirementId: string,
    file: Express.Multer.File,
    metadata: any
  ): Promise<Document> {
    const requirement = await ComplianceRequirement.findById(requirementId);
    if (!requirement) {
      throw new AppError(404, 'Compliance requirement not found');
    }

    // Validate file
    if (requirement.documentFormat && 
        !requirement.documentFormat.includes(file.mimetype)) {
      throw new AppError(400, 'Invalid file format');
    }

    if (requirement.maxFileSize && file.size > requirement.maxFileSize) {
      throw new AppError(400, 'File size exceeds maximum allowed');
    }

    const fileUrl = await uploadToS3(file);

    const document = new Document({
      workerId,
      type: requirement.type,
      fileUrl,
      metadata,
      status: requirement.verificationProcess?.autoVerify 
        ? DocumentStatus.APPROVED 
        : DocumentStatus.PENDING,
      expiryDate: requirement.validityPeriod 
        ? new Date(Date.now() + requirement.validityPeriod * 24 * 60 * 60 * 1000)
        : null
    });

    await document.save();

    // Schedule expiry check if needed
    if (document.expiryDate) {
      await this.scheduleExpiryCheck(document._id, document.expiryDate);
    }

    // Notify recruiters if manual verification is needed
    if (!requirement.verificationProcess?.autoVerify) {
      await notificationService.queueNotification({
        type: NotificationType.DOCUMENT_VERIFICATION_NEEDED,
        data: { document, requirement }
      });
    }

    return document;
  }

  private static async scheduleExpiryCheck(
    documentId: string,
    expiryDate: Date
  ): Promise<void> {
    const document = await Document.findById(documentId);
    if (!document) return;

    const requirement = await ComplianceRequirement.findOne({
      type: document.type
    });
    if (!requirement) return;

    // Schedule notifications for each notification day
    requirement.notificationDays.forEach(days => {
      const notificationDate = new Date(
        expiryDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      if (notificationDate > new Date()) {
        this.expiryCheckQueue.add(
          'document-expiry-notification',
          {
            documentId,
            workerId: document.workerId,
            daysUntilExpiry: days
          },
          {
            delay: notificationDate.getTime() - Date.now()
          }
        );
      }
    });
  }

  static async verifyDocument(
    documentId: string,
    status: DocumentStatus,
    verifierNotes?: string
  ): Promise<Document> {
    const document = await Document.findById(documentId);
    if (!document) {
      throw new AppError(404, 'Document not found');
    }

    document.status = status;
    document.verifierNotes = verifierNotes;
    document.verifiedAt = new Date();

    await document.save();

    await notificationService.queueNotification({
      userId: document.workerId,
      type: NotificationType.DOCUMENT_VERIFIED,
      data: { document, status, notes: verifierNotes }
    });

    return document;
  }
}

// Initialize the service
ComplianceService.initialize(); 