import { Injectable, Optional, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { IWorkerProfile } from '../interfaces/models.interface';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { uploadToS3, deleteFromS3 } from '../utils/s3';
import { NotificationService } from './notification.service';
import { validateDocument } from '../utils/document-validator';
import { processImage } from '../utils/image-processor';
import { parseCV } from '../utils/cv-parser';
import { sanitizeHtml } from '../utils/sanitizer';
import { NotificationType } from '../types/notification.types';
import { Logger } from '../utils/logger';
import { Readable } from 'stream';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  stream: Readable;
}

const logger = new Logger('WorkerProfileService');

@Injectable()
export class WorkerProfileService implements OnModuleDestroy {
  private readonly ALLOWED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'jpg', 'png'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private useQueueFallback = false;
  private pendingVerifications: Map<string, any> = new Map();
  private verificationProcessingInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel('WorkerProfile') private readonly workerProfileModel: Model<IWorkerProfile>,
    private readonly notificationService: NotificationService,
    @Optional() @InjectQueue('profile-verification') private readonly verificationQueue: Queue | null
  ) {
    // Check if queue is available, otherwise use fallback
    if (!this.verificationQueue || !(global as any).REDIS_COMPATIBLE) {
      logger.warn('BullMQ profile-verification queue not available, using fallback processing mechanism');
      this.useQueueFallback = true;
      this.setupFallbackProcessing();
    } else {
      try {
        // Check if the queue is properly initialized
        this.verificationQueue.client.ping().then(() => {
          logger.info('BullMQ profile-verification queue initialized successfully');
        }).catch(error => {
          logger.warn(`BullMQ profile-verification queue initialization error: ${error.message}`);
          this.useQueueFallback = true;
          this.setupFallbackProcessing();
        });
      } catch (error) {
        logger.warn(`BullMQ profile-verification queue error: ${error.message}, using fallback mechanism`);
        this.useQueueFallback = true;
        this.setupFallbackProcessing();
      }
    }
  }

  private setupFallbackProcessing() {
    // Set up interval to process verifications in memory when queue is not available
    this.verificationProcessingInterval = setInterval(async () => {
      if (this.pendingVerifications.size === 0) return;
      
      logger.debug(`Processing ${this.pendingVerifications.size} pending verification tasks using fallback mechanism`);
      
      for (const [id, task] of this.pendingVerifications.entries()) {
        try {
          logger.info(`Processing verification task ${id} using fallback mechanism`);
          
          // Process the task
          await this.processVerificationTask(task);
          
          // Remove from pending queue after successful processing
          this.pendingVerifications.delete(id);
        } catch (error) {
          logger.error(`Error processing verification task ${id} in fallback mode:`, error);
          
          // Increment attempt count
          task.attempts = (task.attempts || 0) + 1;
          
          // If max attempts reached, mark as failed and remove from queue
          if (task.attempts >= 3) {
            logger.warn(`Verification task ${id} failed after ${task.attempts} attempts, removing from queue`);
            this.pendingVerifications.delete(id);
            
            // Notify user of verification failure if this is a document verification task
            if (task.type === 'verify-documents' || task.type === 'verify-cv') {
              try {
                const profile = await this.workerProfileModel.findById(task.profileId);
                if (profile) {
                  await this.notificationService.send({
                    userId: profile.userId,
                    title: 'Document Verification Failed',
                    body: 'We encountered an issue verifying your documents. Please try uploading them again.',
                    type: NotificationType.SYSTEM_ALERT
                  });
                }
              } catch (notifyError) {
                logger.error(`Failed to notify user about verification failure:`, notifyError);
              }
            }
          }
        }
      }
    }, 10000); // Process every 10 seconds
  }

  private async processVerificationTask(task: any): Promise<void> {
    // Implementation depends on task type
    if (task.type === 'verify-documents') {
      await this.verifyDocuments(task.profileId);
    } else if (task.type === 'verify-cv') {
      await this.verifyCV(task.profileId, task.documentUrl);
    }
    // Add other task types as needed
  }

  private async verifyDocuments(profileId: string): Promise<void> {
    try {
      const profile = await this.workerProfileModel.findById(profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      // Simple verification logic - in a real app, this would be more complex
      const updatedDocuments = profile.documents.map(doc => ({
        ...doc,
        verified: true,
        verificationDate: new Date()
      }));

      await this.workerProfileModel.findByIdAndUpdate(profileId, {
        $set: { documents: updatedDocuments }
      });

      // Notify user
      await this.notificationService.send({
        userId: profile.userId,
        title: 'Documents Verified',
        body: 'Your documents have been successfully verified.',
        type: NotificationType.DOCUMENT_VERIFIED
      });
    } catch (error) {
      logger.error(`Error verifying documents for profile ${profileId}:`, error);
      throw error;
    }
  }

  private async verifyCV(profileId: string, documentUrl: string): Promise<void> {
    try {
      const profile = await this.workerProfileModel.findById(profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      // Find the CV document and mark it as verified
      const updatedDocuments = profile.documents.map(doc => {
        if (doc.url === documentUrl && doc.type === 'cv') {
          return {
            ...doc,
            verified: true,
            verificationDate: new Date()
          };
        }
        return doc;
      });

      await this.workerProfileModel.findByIdAndUpdate(profileId, {
        $set: { documents: updatedDocuments }
      });

      // Notify user
      await this.notificationService.send({
        userId: profile.userId,
        title: 'CV Verified',
        body: 'Your CV has been successfully verified.',
        type: NotificationType.DOCUMENT_VERIFIED
      });
    } catch (error) {
      logger.error(`Error verifying CV for profile ${profileId}:`, error);
      throw error;
    }
  }

  async createProfile(userId: string, profileData: Partial<IWorkerProfile>): Promise<IWorkerProfile> {
    const existingProfile = await this.workerProfileModel.findOne({ userId });
    if (existingProfile) {
      throw new Error('Profile already exists for this user');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Sanitize input data
    const sanitizedData = this.sanitizeProfileData(profileData);

    // Create profile with initial metrics
    const profile = new this.workerProfileModel({
      ...sanitizedData,
      userId,
      metrics: {
        profileCompleteness: this.calculateProfileCompleteness(sanitizedData),
        totalPlacements: 0,
        averageRating: 0,
        reliabilityScore: 1,
        lastActive: new Date()
      }
    });

    await profile.save();

    // Queue verification tasks if necessary
    if (profile.documents?.length) {
      await this.queueDocumentVerification(profile._id.toString());
    }

    return profile;
  }

  async updateProfile(
    userId: string,
    updates: Partial<IWorkerProfile>
  ): Promise<IWorkerProfile> {
    const profile = await this.workerProfileModel.findOne({ userId });
    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    // Sanitize update data
    const sanitizedUpdates = this.sanitizeProfileData(updates);

    // Update profile
    Object.assign(profile, sanitizedUpdates);
    
    // Recalculate metrics
    profile.metrics.profileCompleteness = this.calculateProfileCompleteness(profile);
    profile.metrics.lastActive = new Date();

    await profile.save();

    // Notify if profile completeness improved significantly
    if (profile.metrics.profileCompleteness > 0.8) {
      await this.notificationService.send({
        userId,
        title: 'Profile Update',
        body: 'Your profile is now more visible to potential employers!',
        type: NotificationType.PROFILE_UPDATE
      });
    }

    return profile;
  }

  async uploadCV(
    userId: string,
    file: MulterFile
  ): Promise<IWorkerProfile> {
    // Validate file
    if (!this.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype.split('/')[1])) {
      throw new AppError(400, 'Invalid file type');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new AppError(400, 'File size exceeds limit');
    }

    const profile = await this.workerProfileModel.findOne({ userId });
    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    try {
      // Extract text from CV
      const cvText = await parseCV(file);
      
      // Upload to S3
      const fileUrl = await uploadToS3(file, `cvs/${userId}/${Date.now()}-${file.originalname}`);

      // Add to documents
      profile.documents.push({
        type: 'cv',
        name: file.originalname,
        url: fileUrl,
        uploadDate: new Date(),
        verified: false
      });

      // Update profile with extracted information
      const extractedUpdates = await this.extractProfileDataFromCV(cvText);
      Object.assign(profile, extractedUpdates);

      // Update metrics
      profile.metrics.profileCompleteness = this.calculateProfileCompleteness(profile);
      profile.metrics.lastActive = new Date();

      await profile.save();

      // Queue CV verification
      if (!this.useQueueFallback && this.verificationQueue && (global as any).REDIS_COMPATIBLE) {
        try {
          // Use BullMQ if available
          await this.verificationQueue.add('verify-cv', {
            profileId: profile._id,
            documentUrl: fileUrl,
            attempts: 0
          }, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000
            }
          });
          logger.info(`Added CV verification task for profile ${profile._id} to BullMQ queue`);
        } catch (error) {
          logger.warn(`Failed to add CV verification task to BullMQ queue: ${error.message}, using fallback mechanism`);
          // If adding to the queue fails, use fallback mechanism
          this.useQueueFallback = true;
          const taskId = `verify-cv-${profile._id}-${Date.now()}`;
          this.pendingVerifications.set(taskId, {
            type: 'verify-cv',
            profileId: profile._id,
            documentUrl: fileUrl,
            attempts: 0
          });
          logger.info(`Added CV verification task ${taskId} to fallback queue`);
        }
      } else {
        // Use fallback mechanism
        const taskId = `verify-cv-${profile._id}-${Date.now()}`;
        this.pendingVerifications.set(taskId, {
          type: 'verify-cv',
          profileId: profile._id,
          documentUrl: fileUrl,
          attempts: 0
        });
        logger.info(`Added CV verification task ${taskId} to fallback queue`);
      }

      return profile;
    } catch (error) {
      throw new AppError(500, `Failed to process CV: ${error.message}`);
    }
  }

  async uploadProfilePhoto(
    userId: string,
    file: MulterFile
  ): Promise<string> {
    if (!file.mimetype.startsWith('image/')) {
      throw new AppError(400, 'Invalid file type. Please upload an image.');
    }

    try {
      // Generate thumbnail
      const thumbnail = await processImage(file);
      
      // Upload original and thumbnail to S3
      const [originalUrl, thumbnailUrl] = await Promise.all([
        uploadToS3(file, `photos/${userId}/original-${Date.now()}`),
        uploadToS3(thumbnail, `photos/${userId}/thumbnail-${Date.now()}`)
      ]);

      // Update profile
      await this.workerProfileModel.findOneAndUpdate(
        { userId },
        { 
          $set: {
            'personalInfo.photoUrl': originalUrl,
            'personalInfo.thumbnailUrl': thumbnailUrl
          }
        }
      );

      return originalUrl;
    } catch (error) {
      throw new AppError(500, `Failed to upload photo: ${error.message}`);
    }
  }

  private calculateProfileCompleteness(profile: Partial<IWorkerProfile>): number {
    const sections = {
      personalInfo: 0.2,
      professionalInfo: 0.2,
      skills: 0.15,
      workExperience: 0.15,
      education: 0.1,
      certifications: 0.1,
      documents: 0.1
    };

    let completeness = 0;

    // Calculate personal info completeness
    if (profile.personalInfo) {
      const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
      const filledFields = requiredFields.filter(field => profile.personalInfo[field]);
      completeness += sections.personalInfo * (filledFields.length / requiredFields.length);
    }

    // Calculate other sections...
    // Similar calculations for other sections

    return Math.min(1, completeness);
  }

  private sanitizeProfileData(data: Partial<IWorkerProfile>): Partial<IWorkerProfile> {
    if (data.personalInfo?.summary) {
      data.personalInfo.summary = sanitizeHtml(data.personalInfo.summary);
    }

    if (data.workExperience) {
      data.workExperience = data.workExperience.map(exp => ({
        ...exp,
        description: exp.description ? sanitizeHtml(exp.description) : undefined
      }));
    }

    return data;
  }

  private async queueDocumentVerification(profileId: string): Promise<void> {
    if (!this.useQueueFallback && this.verificationQueue && (global as any).REDIS_COMPATIBLE) {
      try {
        // Use BullMQ if available
        await this.verificationQueue.add('verify-documents', { 
          profileId,
          attempts: 0
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        });
        logger.info(`Added document verification task for profile ${profileId} to BullMQ queue`);
      } catch (error) {
        logger.warn(`Failed to add document verification task to BullMQ queue: ${error.message}, using fallback mechanism`);
        // If adding to the queue fails, use fallback mechanism
        this.useQueueFallback = true;
        const taskId = `verify-documents-${profileId}-${Date.now()}`;
        this.pendingVerifications.set(taskId, {
          type: 'verify-documents',
          profileId,
          attempts: 0
        });
        logger.info(`Added document verification task ${taskId} to fallback queue`);
      }
    } else {
      // Use fallback mechanism
      const taskId = `verify-documents-${profileId}-${Date.now()}`;
      this.pendingVerifications.set(taskId, {
        type: 'verify-documents',
        profileId,
        attempts: 0
      });
      logger.info(`Added document verification task ${taskId} to fallback queue`);
    }
  }

  private async extractProfileDataFromCV(cvText: string): Promise<Partial<IWorkerProfile>> {
    // Implementation of CV data extraction
    // This would typically use NLP or other text analysis tools
    return {};
  }

  async validateDocuments(file: MulterFile) {
    return validateDocument(file);
  }

  async processProfileImage(file: MulterFile) {
    return processImage(file);
  }

  async parseResume(file: MulterFile) {
    return parseCV(file);
  }

  async onModuleDestroy() {
    try {
      // Clean up interval if it exists
      if (this.verificationProcessingInterval) {
        clearInterval(this.verificationProcessingInterval);
        this.verificationProcessingInterval = null;
        logger.info('Verification processing interval cleared');
      }
      
      // Clean up queue if it exists
      if (this.verificationQueue) {
        try {
          await this.verificationQueue.close();
          logger.info('Verification queue closed successfully');
        } catch (queueError) {
          logger.warn(`Error closing verification queue: ${queueError.message}`);
        }
      }
      
      // Clear any pending verifications
      if (this.pendingVerifications.size > 0) {
        logger.info(`Clearing ${this.pendingVerifications.size} pending verification tasks`);
        this.pendingVerifications.clear();
      }
      
      logger.info('WorkerProfileService resources cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up WorkerProfileService resources:', error);
    }
  }
} 