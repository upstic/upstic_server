import { IdentityVerification, VerificationType, VerificationStatus } from '../models/IdentityVerification';
import { User } from '../models/User';
import { WorkerProfile } from '../models/WorkerProfile';
import { AppError } from '../middleware/errorHandler';
import { uploadToS3 } from '../utils/s3';
import { notificationService } from './notification.service';
import { Queue } from 'bullmq';
import axios from 'axios';
import { logger } from '../utils/logger';

interface IVerificationProvider {
  name: string;
  apiKey: string;
  baseUrl: string;
}

export class IdentityVerificationService {
  private static verificationQueue: Queue;
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
  private static readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly VERIFICATION_PROVIDER: IVerificationProvider = {
    name: process.env.ID_VERIFICATION_PROVIDER || 'default',
    apiKey: process.env.ID_VERIFICATION_API_KEY || '',
    baseUrl: process.env.ID_VERIFICATION_API_URL || ''
  };

  static initialize() {
    this.verificationQueue = new Queue('identity-verification', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });
  }

  static async startVerification(
    userId: string,
    type: VerificationType,
    documentData: {
      documentNumber: string;
      issuingCountry: string;
      expiryDate: Date;
    },
    images: {
      front: Express.Multer.File;
      back?: Express.Multer.File;
      selfie?: Express.Multer.File;
    }
  ): Promise<IIdentityVerification> {
    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Validate images
    await this.validateImages(images);

    try {
      // Upload images to S3
      const imageUrls = await this.uploadVerificationImages(userId, images);

      // Create verification record
      const verification = new IdentityVerification({
        userId,
        type,
        ...documentData,
        documentImages: imageUrls,
        status: VerificationStatus.PENDING
      });

      await verification.save();

      // Queue verification check
      await this.queueVerificationCheck(verification._id);

      // Notify user
      await notificationService.send({
        userId,
        title: 'Identity Verification Started',
        body: 'Your identity verification is being processed. We\'ll notify you once complete.',
        type: 'VERIFICATION_STARTED'
      });

      return verification;
    } catch (error) {
      logger.error('Identity verification failed', { userId, error: error.message });
      throw new AppError(500, `Failed to start verification: ${error.message}`);
    }
  }

  static async processVerificationCheck(
    verificationId: string
  ): Promise<void> {
    const verification = await IdentityVerification.findById(verificationId);
    if (!verification) return;

    try {
      verification.status = VerificationStatus.IN_PROGRESS;
      await verification.save();

      // Call third-party verification API
      const response = await this.callVerificationAPI(verification);

      // Process response
      const checks = this.processVerificationResponse(response);
      
      // Update verification record
      verification.checks = checks;
      verification.verificationDetails = {
        provider: this.VERIFICATION_PROVIDER.name,
        checkId: response.checkId,
        score: response.score,
        verifiedAt: new Date()
      };

      // Determine final status
      verification.status = this.calculateVerificationStatus(checks);
      await verification.save();

      // Update worker profile
      await this.updateWorkerProfile(verification);

      // Send notification
      await this.sendVerificationNotification(verification);
    } catch (error) {
      verification.status = VerificationStatus.REJECTED;
      verification.verificationDetails.notes = error.message;
      await verification.save();

      logger.error('Verification check failed', { verificationId, error: error.message });
    }
  }

  private static async validateImages(
    images: {
      front: Express.Multer.File;
      back?: Express.Multer.File;
      selfie?: Express.Multer.File;
    }
  ): Promise<void> {
    const validateImage = (image: Express.Multer.File) => {
      if (!this.ALLOWED_IMAGE_TYPES.includes(image.mimetype)) {
        throw new AppError(400, `Invalid image type: ${image.mimetype}`);
      }
      if (image.size > this.MAX_IMAGE_SIZE) {
        throw new AppError(400, 'Image size exceeds limit');
      }
    };

    validateImage(images.front);
    if (images.back) validateImage(images.back);
    if (images.selfie) validateImage(images.selfie);
  }

  private static async uploadVerificationImages(
    userId: string,
    images: {
      front: Express.Multer.File;
      back?: Express.Multer.File;
      selfie?: Express.Multer.File;
    }
  ): Promise<{ front: string; back?: string; selfie?: string }> {
    const uploadImage = async (image: Express.Multer.File, type: string) => {
      return uploadToS3(
        image,
        `verifications/${userId}/${type}-${Date.now()}.${image.mimetype.split('/')[1]}`
      );
    };

    const [frontUrl, backUrl, selfieUrl] = await Promise.all([
      uploadImage(images.front, 'front'),
      images.back ? uploadImage(images.back, 'back') : Promise.resolve(undefined),
      images.selfie ? uploadImage(images.selfie, 'selfie') : Promise.resolve(undefined)
    ]);

    return {
      front: frontUrl,
      ...(backUrl && { back: backUrl }),
      ...(selfieUrl && { selfie: selfieUrl })
    };
  }

  private static async callVerificationAPI(
    verification: IIdentityVerification
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.VERIFICATION_PROVIDER.baseUrl}/verify`,
        {
          documentType: verification.type,
          documentNumber: verification.documentNumber,
          issuingCountry: verification.issuingCountry,
          images: verification.documentImages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.VERIFICATION_PROVIDER.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new AppError(500, `Verification API error: ${error.message}`);
    }
  }

  private static processVerificationResponse(response: any): any[] {
    // Process and normalize API response
    return [];
  }

  private static calculateVerificationStatus(checks: any[]): VerificationStatus {
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warning');

    if (hasFailures) return VerificationStatus.REJECTED;
    if (hasWarnings) return VerificationStatus.PENDING;
    return VerificationStatus.APPROVED;
  }

  private static async updateWorkerProfile(
    verification: IIdentityVerification
  ): Promise<void> {
    if (verification.status === VerificationStatus.APPROVED) {
      await WorkerProfile.findOneAndUpdate(
        { userId: verification.userId },
        {
          $set: {
            'verificationStatus.identity': true
          }
        }
      );
    }
  }

  private static async sendVerificationNotification(
    verification: IIdentityVerification
  ): Promise<void> {
    const title = verification.status === VerificationStatus.APPROVED
      ? 'Identity Verification Approved'
      : 'Identity Verification Update';

    const body = verification.status === VerificationStatus.APPROVED
      ? 'Your identity has been successfully verified.'
      : `Your identity verification status: ${verification.status}`;

    await notificationService.send({
      userId: verification.userId,
      title,
      body,
      type: 'VERIFICATION_UPDATE',
      data: { verificationId: verification._id }
    });
  }

  private static async queueVerificationCheck(
    verificationId: string
  ): Promise<void> {
    await this.verificationQueue.add(
      'process-verification',
      { verificationId }
    );
  }
}

// Initialize the service
IdentityVerificationService.initialize(); 