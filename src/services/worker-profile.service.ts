import { Injectable } from '@nestjs/common';
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

@Injectable()
export class WorkerProfileService {
  private readonly ALLOWED_DOCUMENT_TYPES = ['pdf', 'doc', 'docx', 'jpg', 'png'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    @InjectModel('WorkerProfile') private readonly workerProfileModel: Model<IWorkerProfile>,
    private readonly notificationService: NotificationService,
    @InjectQueue('profile-verification') private readonly verificationQueue: Queue
  ) {}

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
    file: Express.Multer.File
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
      await this.verificationQueue.add('verify-cv', {
        profileId: profile._id,
        documentUrl: fileUrl
      });

      return profile;
    } catch (error) {
      throw new AppError(500, `Failed to process CV: ${error.message}`);
    }
  }

  async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File
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
    await this.verificationQueue.add('verify-documents', { profileId });
  }

  private async extractProfileDataFromCV(cvText: string): Promise<Partial<IWorkerProfile>> {
    // Implementation of CV data extraction
    // This would typically use NLP or other text analysis tools
    return {};
  }

  async validateDocuments(file: Express.Multer.File) {
    return validateDocument(file);
  }

  async processProfileImage(file: Express.Multer.File) {
    return processImage(file);
  }

  async parseResume(file: Express.Multer.File) {
    return parseCV(file);
  }
} 