import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { 
  IDocument, 
  DocumentStatus, 
  DocumentType, 
  VerificationLevel, 
  ComplianceStatus,
  Document as DocumentModel
} from '../models/Document';
import { NotificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';
import { DocumentNotificationType } from '../types/notification.types';
import type { Multer } from 'multer';
import { Readable } from 'stream';

// Define MulterFile interface to replace Express.Multer.File
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
  stream: Readable;
}

// Define the extended document type with methods
interface DocumentWithMethods extends IDocument {
  _id: Types.ObjectId;
  trackView(): Promise<DocumentWithMethods>;
  trackDownload(): Promise<DocumentWithMethods>;
  shareWith(userId: string, accessLevel: string, expiryDate?: Date): Promise<DocumentWithMethods>;
  verify(verifiedBy: string, level: VerificationLevel, method?: string, notes?: string): Promise<DocumentWithMethods>;
  reject(rejectedBy: string, reason: string): Promise<DocumentWithMethods>;
  save(): Promise<DocumentWithMethods>;
  deleteOne(): Promise<any>;
}

@Injectable()
export class DocumentService {
  private readonly ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    @InjectModel('Document') private readonly documentModel: Model<DocumentWithMethods>,
    private readonly notificationService: NotificationService
  ) {}

  async verifyDocuments(userId: string): Promise<boolean> {
    try {
      const documents = await this.documentModel.find({ userId });
      return documents.every(doc => doc.status === DocumentStatus.VERIFIED);
    } catch (error) {
      logger.error('Error verifying documents:', error);
      return false;
    }
  }

  private validateFile(file: MulterFile): void {
    if (!this.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new AppError(400, 'Invalid file type');
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new AppError(400, 'File size exceeds limit');
    }
  }

  private sanitizeDocumentData(data: Pick<IDocument, 'description' | 'tags'>): Pick<IDocument, 'description' | 'tags'> {
    const sanitized = { ...data };
    if (sanitized.description) {
      sanitized.description = sanitizeHtml(sanitized.description);
    }
    if (sanitized.tags) {
      sanitized.tags = sanitized.tags.map(tag => sanitizeHtml(tag));
    }
    return sanitized;
  }

  private async notifyUser(document: DocumentWithMethods, type: DocumentNotificationType, title: string, body: string): Promise<void> {
    await this.notificationService.send({
      userId: document.userId.toString(),
      type,
      title,
      body,
      data: { documentId: document._id.toString() }
    });
  }

  async getUserDocuments(
    userId: string,
    filters: {
      type?: string[];
      status?: string[];
      tags?: string[];
      complianceStatus?: string[];
      verificationLevel?: string[];
      expiryDateFrom?: Date;
      expiryDateTo?: Date;
    } = {}
  ): Promise<IDocument[]> {
    const query: any = { userId };

    if (filters.type?.length) {
      query.type = { $in: filters.type };
    }
    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }
    if (filters.tags?.length) {
      query.tags = { $all: filters.tags };
    }
    if (filters.complianceStatus?.length) {
      query['compliance.status'] = { $in: filters.complianceStatus };
    }
    if (filters.verificationLevel?.length) {
      query['verification.level'] = { $in: filters.verificationLevel };
    }
    if (filters.expiryDateFrom || filters.expiryDateTo) {
      query.expiryDate = {};
      if (filters.expiryDateFrom) {
        query.expiryDate.$gte = filters.expiryDateFrom;
      }
      if (filters.expiryDateTo) {
        query.expiryDate.$lte = filters.expiryDateTo;
      }
    }

    return this.documentModel
      .find(query)
      .sort({ 'metadata.createdAt': -1 })
      .lean();
  }

  async checkDocumentExpiry(): Promise<void> {
    const now = new Date();
    
    // Find documents that are about to expire in the next 30 days
    const expiringDocs = await this.documentModel.find({
      status: { $ne: DocumentStatus.EXPIRED },
      expiryDate: { 
        $lt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        $gt: now
      },
      'tracking.expiryNotificationSent': false
    });

    // Find documents that have expired
    const expiredDocs = await this.documentModel.find({
      status: { $ne: DocumentStatus.EXPIRED },
      expiryDate: { $lt: now }
    });

    // Send notifications for expiring documents
    for (const doc of expiringDocs) {
      await this.documentModel.findByIdAndUpdate(doc._id, {
        'tracking.expiryNotificationSent': true,
        'tracking.reminderSent': true,
        $push: { 'tracking.reminderDates': now }
      });

      await this.notifyUser(
        doc,
        DocumentNotificationType.DOCUMENT_EXPIRING,
        'Document Expiring Soon',
        `Your document ${doc.title} will expire on ${doc.expiryDate?.toLocaleDateString()}`
      );
    }

    // Update expired documents
    for (const doc of expiredDocs) {
      await this.documentModel.findByIdAndUpdate(doc._id, {
        status: DocumentStatus.EXPIRED,
        'compliance.status': ComplianceStatus.EXPIRED
      });

      await this.notifyUser(
        doc,
        DocumentNotificationType.DOCUMENT_EXPIRED,
        'Document Expired',
        `Your document ${doc.title} has expired`
      );
    }
  }

  async uploadDocument(
    documentData: {
      title: string;
      type: DocumentType;
      description?: string;
      tags?: string[];
      issuedBy?: string;
      issuedDate?: Date;
      expiryDate?: Date;
      requiredFor?: string[];
    }, 
    userId: string, 
    file: MulterFile, 
    metadata: {
      createdBy: string;
      originalFilename: string;
      notes?: string;
    }
  ): Promise<IDocument> {
    try {
      if (file) {
        this.validateFile(file);
      }
      
      const sanitizedData = this.sanitizeDocumentData({
        description: documentData.description,
        tags: documentData.tags
      });
      
      const document = await this.documentModel.create({
        userId,
        type: documentData.type,
        title: documentData.title,
        description: sanitizedData.description,
        tags: sanitizedData.tags || [],
        fileUrl: '', // This would be set after file upload
        fileKey: '', // This would be set after file upload
        fileType: file.mimetype,
        fileSize: file.size,
        issuedBy: documentData.issuedBy,
        issuedDate: documentData.issuedDate,
        expiryDate: documentData.expiryDate,
        status: DocumentStatus.PENDING,
        compliance: {
          status: ComplianceStatus.PENDING_REVIEW,
          requiredFor: documentData.requiredFor || []
        },
        verification: {
          level: VerificationLevel.NONE
        },
        tracking: {
          reminderSent: false,
          reminderDates: [],
          expiryNotificationSent: false,
          viewCount: 0,
          downloadCount: 0,
          shareCount: 0,
          sharedWith: []
        },
        metadata: {
          createdBy: metadata.createdBy,
          createdAt: new Date(),
          lastModifiedBy: metadata.createdBy,
          lastModifiedAt: new Date(),
          version: 1,
          originalFilename: metadata.originalFilename,
          notes: metadata.notes
        }
      });
      
      await this.notificationService.send({
        userId,
        type: DocumentNotificationType.DOCUMENT_UPLOADED,
        title: 'Document Uploaded',
        body: `Your document ${document.title} has been uploaded successfully.`,
        data: { documentId: document._id }
      });
      
      return document;
    } catch (error) {
      logger.error('Error uploading document:', error);
      throw error;
    }
  }
  
  async getAllDocuments(
    userId: string,
    filters: {
      type?: DocumentType[];
      status?: DocumentStatus[];
      complianceStatus?: ComplianceStatus[];
      verificationLevel?: VerificationLevel[];
      expiryDateFrom?: Date;
      expiryDateTo?: Date;
      tags?: string[];
    } = {}
  ): Promise<IDocument[]> {
    try {
      const query: any = { userId };
      
      if (filters.type?.length) {
        query.type = { $in: filters.type };
      }
      
      if (filters.status?.length) {
        query.status = { $in: filters.status };
      }
      
      if (filters.complianceStatus?.length) {
        query['compliance.status'] = { $in: filters.complianceStatus };
      }
      
      if (filters.verificationLevel?.length) {
        query['verification.level'] = { $in: filters.verificationLevel };
      }
      
      if (filters.expiryDateFrom || filters.expiryDateTo) {
        query.expiryDate = {};
        if (filters.expiryDateFrom) {
          query.expiryDate.$gte = filters.expiryDateFrom;
        }
        if (filters.expiryDateTo) {
          query.expiryDate.$lte = filters.expiryDateTo;
        }
      }
      
      if (filters.tags?.length) {
        query.tags = { $all: filters.tags };
      }
      
      return await this.documentModel.find(query).sort({ 'metadata.createdAt': -1 });
    } catch (error) {
      logger.error('Error getting all documents:', error);
      throw error;
    }
  }
  
  async getDocument(documentId: string, userId: string): Promise<IDocument> {
    try {
      const document = await this.documentModel.findOne({ 
        _id: documentId,
        userId
      });
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Track document view
      await document.trackView();
      
      return document;
    } catch (error) {
      logger.error('Error getting document:', error);
      throw error;
    }
  }
  
  async updateDocument(
    documentId: string, 
    updateData: Partial<IDocument>, 
    userId: string,
    updatedBy: string
  ): Promise<IDocument> {
    try {
      const document = await this.documentModel.findOne({
        _id: documentId,
        userId
      });
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Don't allow updating verified documents unless it's just tags or description
      if (document.status === DocumentStatus.VERIFIED && 
          (updateData.fileUrl || updateData.fileKey || updateData.type)) {
        throw new AppError(400, 'Cannot update core properties of a verified document');
      }
      
      const sanitizedData = this.sanitizeDocumentData({
        description: updateData.description,
        tags: updateData.tags
      });
      
      // Update allowed fields
      if (updateData.title) document.title = updateData.title;
      if (sanitizedData.description) document.description = sanitizedData.description;
      if (sanitizedData.tags) document.tags = sanitizedData.tags;
      if (updateData.issuedBy) document.issuedBy = updateData.issuedBy;
      if (updateData.issuedDate) document.issuedDate = updateData.issuedDate;
      if (updateData.expiryDate) document.expiryDate = updateData.expiryDate;
      
      // Update metadata
      document.metadata.lastModifiedBy = updatedBy;
      document.metadata.lastModifiedAt = new Date();
      document.metadata.version += 1;
      if (updateData.metadata?.notes) document.metadata.notes = updateData.metadata.notes;
      
      // Update compliance if provided
      if (updateData.compliance) {
        if (updateData.compliance.requiredFor) document.compliance.requiredFor = updateData.compliance.requiredFor;
        if (updateData.compliance.exemptionReason) document.compliance.exemptionReason = updateData.compliance.exemptionReason;
        if (updateData.compliance.exemptionExpiryDate) document.compliance.exemptionExpiryDate = updateData.compliance.exemptionExpiryDate;
        if (updateData.compliance.notes) document.compliance.notes = updateData.compliance.notes;
      }
      
      await document.save();
      
      await this.notificationService.send({
        userId,
        type: DocumentNotificationType.DOCUMENT_UPDATED,
        title: 'Document Updated',
        body: `Your document ${document.title} has been updated.`,
        data: { documentId: document._id }
      });
      
      return document;
    } catch (error) {
      logger.error('Error updating document:', error);
      throw error;
    }
  }
  
  async deleteDocument(documentId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const document = await this.documentModel.findOne({
        _id: documentId,
        userId
      });
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Don't allow deleting verified compliance documents
      if (document.status === DocumentStatus.VERIFIED && 
          document.compliance.requiredFor?.length > 0) {
        throw new AppError(400, 'Cannot delete a verified compliance document');
      }
      
      await document.deleteOne();
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }
  
  async shareDocument(
    documentId: string, 
    recipientId: string, 
    accessLevel: string, 
    userId: string,
    expiryDate?: Date
  ): Promise<{ success: boolean }> {
    try {
      const document = await this.documentModel.findOne({
        _id: documentId,
        userId
      });
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Share the document
      await document.shareWith(recipientId, accessLevel, expiryDate);
      
      // Notify the recipient
      await this.notificationService.send({
        userId: recipientId,
        type: DocumentNotificationType.DOCUMENT_SHARED,
        title: 'Document Shared With You',
        body: `${userId} has shared a document with you: ${document.title}`,
        data: { documentId: document._id, sharedBy: userId }
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error sharing document:', error);
      throw error;
    }
  }
  
  async revokeAccess(documentId: string, recipientId: string, userId: string): Promise<{ success: boolean }> {
    try {
      const document = await this.documentModel.findOne({
        _id: documentId,
        userId
      });
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Remove the recipient from sharedWith array
      const sharedWithIndex = document.tracking.sharedWith.findIndex(
        share => share.userId.toString() === recipientId
      );
      
      if (sharedWithIndex === -1) {
        throw new AppError(404, 'Recipient not found in document sharing list');
      }
      
      document.tracking.sharedWith.splice(sharedWithIndex, 1);
      await document.save();
      
      // Notify the recipient
      await this.notificationService.send({
        userId: recipientId,
        type: DocumentNotificationType.DOCUMENT_ACCESS_REVOKED,
        title: 'Document Access Revoked',
        body: `Your access to document ${document.title} has been revoked`,
        data: { documentId: document._id }
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error revoking document access:', error);
      throw error;
    }
  }
  
  async getDocumentVersions(documentId: string, userId: string): Promise<any[]> {
    try {
      // This would typically connect to a version control system or retrieve from a versions collection
      // For now, we'll return a placeholder
      const document = await this.documentModel.findOne({
        _id: documentId,
        userId
      });
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      return [{
        version: document.metadata.version,
        modifiedBy: document.metadata.lastModifiedBy,
        modifiedAt: document.metadata.lastModifiedAt
      }];
    } catch (error) {
      logger.error('Error getting document versions:', error);
      throw error;
    }
  }
  
  async getDocumentAccessLog(documentId: string, userId: string): Promise<any[]> {
    try {
      const document = await this.documentModel.findOne({
        _id: documentId,
        userId
      });
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Return the sharing history
      return document.tracking.sharedWith.map(share => ({
        userId: share.userId,
        sharedAt: share.sharedAt,
        accessLevel: share.accessLevel,
        expiryDate: share.expiryDate
      }));
    } catch (error) {
      logger.error('Error getting document access log:', error);
      throw error;
    }
  }
  
  async verifyDocument(
    documentId: string, 
    verificationData: {
      level: VerificationLevel;
      method?: string;
      notes?: string;
    }, 
    verifiedBy: string
  ): Promise<IDocument> {
    try {
      const document = await this.documentModel.findById(documentId);
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Verify the document
      await document.verify(
        verifiedBy, 
        verificationData.level, 
        verificationData.method, 
        verificationData.notes
      );
      
      // Notify the document owner
      await this.notifyUser(
        document,
        DocumentNotificationType.DOCUMENT_VERIFIED,
        'Document Verified',
        `Your document ${document.title} has been verified`
      );
      
      return document;
    } catch (error) {
      logger.error('Error verifying document:', error);
      throw error;
    }
  }
  
  async rejectDocument(
    documentId: string, 
    rejectionReason: string, 
    rejectedBy: string
  ): Promise<IDocument> {
    try {
      const document = await this.documentModel.findById(documentId);
      
      if (!document) {
        throw new AppError(404, 'Document not found');
      }
      
      // Reject the document
      await document.reject(rejectedBy, rejectionReason);
      
      // Notify the document owner
      await this.notifyUser(
        document,
        DocumentNotificationType.DOCUMENT_REJECTED,
        'Document Rejected',
        `Your document ${document.title} has been rejected: ${rejectionReason}`
      );
      
      return document;
    } catch (error) {
      logger.error('Error rejecting document:', error);
      throw error;
    }
  }
  
  async getComplianceDocuments(
    userId: string,
    requiredFor: string[]
  ): Promise<IDocument[]> {
    try {
      return await this.documentModel.find({
        userId,
        'compliance.requiredFor': { $in: requiredFor },
        'compliance.status': ComplianceStatus.COMPLIANT
      });
    } catch (error) {
      logger.error('Error getting compliance documents:', error);
      throw error;
    }
  }
  
  async checkComplianceStatus(
    userId: string,
    requiredDocumentTypes: { type: DocumentType; requiredFor: string }[]
  ): Promise<{ 
    isCompliant: boolean; 
    missingDocuments: { type: DocumentType; requiredFor: string }[];
    expiredDocuments: { type: DocumentType; requiredFor: string; expiryDate: Date }[];
  }> {
    try {
      const result = {
        isCompliant: true,
        missingDocuments: [],
        expiredDocuments: []
      };
      
      for (const requirement of requiredDocumentTypes) {
        const document = await this.documentModel.findOne({
          userId,
          type: requirement.type,
          'compliance.requiredFor': requirement.requiredFor,
          'compliance.status': ComplianceStatus.COMPLIANT
        });
        
        if (!document) {
          result.isCompliant = false;
          result.missingDocuments.push(requirement);
          continue;
        }
        
        if (document.expiryDate && document.expiryDate < new Date()) {
          result.isCompliant = false;
          result.expiredDocuments.push({
            type: requirement.type,
            requiredFor: requirement.requiredFor,
            expiryDate: document.expiryDate
          });
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error checking compliance status:', error);
      throw error;
    }
  }
} 