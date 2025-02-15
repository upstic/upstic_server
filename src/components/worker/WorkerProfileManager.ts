import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileUploadService } from '../../services/file-upload.service';
import { DocumentService } from '../../services/document.service';
import { Logger } from '../../utils/logger';
import { SecurityUtils } from '../../utils/security';

@Injectable()
export class WorkerProfileManager {
  constructor(
    @InjectModel('WorkerProfile') private profileModel: Model<any>,
    @InjectModel('Document') private documentModel: Model<any>,
    private fileUploadService: FileUploadService,
    private documentService: DocumentService,
    private securityUtils: SecurityUtils,
    private logger: Logger
  ) {}

  async createProfile(
    workerId: string,
    profileData: WorkerProfileInput
  ): Promise<WorkerProfileResponse> {
    try {
      // Validate profile data
      await this.validateProfileData(profileData);

      // Handle document uploads
      const documents = await this.processDocuments(
        workerId,
        profileData.documents
      );

      // Create profile
      const profile = await this.profileModel.create({
        workerId,
        ...profileData,
        documents,
        status: 'pending_verification',
        createdAt: new Date()
      });

      // Process skills and experience
      await this.processSkillsAndExperience(profile._id, profileData);

      return {
        success: true,
        profileId: profile._id,
        status: profile.status,
        message: 'Profile created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating worker profile:', error);
      throw error;
    }
  }

  async updateProfile(
    profileId: string,
    updates: Partial<WorkerProfileInput>
  ): Promise<WorkerProfileResponse> {
    try {
      // Validate updates
      await this.validateProfileData(updates, true);

      // Process document updates if any
      let documents;
      if (updates.documents) {
        const profile = await this.profileModel.findById(profileId);
        documents = await this.processDocuments(
          profile.workerId,
          updates.documents
        );
      }

      // Update profile
      const updatedProfile = await this.profileModel.findByIdAndUpdate(
        profileId,
        {
          ...updates,
          ...(documents && { documents }),
          updatedAt: new Date()
        },
        { new: true }
      );

      // Update skills and experience if provided
      if (updates.skills || updates.experience) {
        await this.processSkillsAndExperience(profileId, updates);
      }

      return {
        success: true,
        profileId: updatedProfile._id,
        status: updatedProfile.status,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating worker profile:', error);
      throw error;
    }
  }

  private async validateProfileData(
    data: Partial<WorkerProfileInput>,
    isUpdate: boolean = false
  ): Promise<void> {
    const requiredFields = isUpdate ? [] : [
      'firstName',
      'lastName',
      'email',
      'phone',
      'address'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    if (data.email && !this.securityUtils.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.phone && !this.securityUtils.isValidPhone(data.phone)) {
      throw new Error('Invalid phone format');
    }
  }

  private async processDocuments(
    workerId: string,
    documents: DocumentInput[]
  ): Promise<ProcessedDocument[]> {
    const processedDocs: ProcessedDocument[] = [];

    for (const doc of documents) {
      const uploadResult = await this.fileUploadService.uploadFile(doc.file);
      
      const documentRecord = await this.documentModel.create({
        workerId,
        type: doc.type,
        url: uploadResult.url,
        filename: doc.file.originalname,
        mimeType: doc.file.mimetype,
        size: doc.file.size,
        status: 'pending_verification',
        metadata: doc.metadata
      });

      processedDocs.push({
        documentId: documentRecord._id,
        type: doc.type,
        url: uploadResult.url,
        status: 'pending_verification'
      });
    }

    return processedDocs;
  }

  private async processSkillsAndExperience(
    profileId: string,
    data: Partial<WorkerProfileInput>
  ): Promise<void> {
    if (data.skills) {
      await this.profileModel.findByIdAndUpdate(profileId, {
        $set: {
          'skills': data.skills.map(skill => ({
            ...skill,
            verified: false
          }))
        }
      });
    }

    if (data.experience) {
      await this.profileModel.findByIdAndUpdate(profileId, {
        $set: {
          'experience': data.experience.map(exp => ({
            ...exp,
            verified: false
          }))
        }
      });
    }
  }
}

interface WorkerProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  documents: DocumentInput[];
  skills?: Array<{
    name: string;
    level: 'beginner' | 'intermediate' | 'expert';
    yearsOfExperience: number;
    certifications?: string[];
  }>;
  experience?: Array<{
    company: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    description: string;
    skills: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationDate: Date;
  }>;
  preferences?: {
    jobTypes: string[];
    industries: string[];
    locations: string[];
    salary: {
      minimum: number;
      preferred: number;
      currency: string;
    };
  };
}

interface DocumentInput {
  file: Express.Multer.File;
  type: string;
  metadata?: Record<string, any>;
}

interface ProcessedDocument {
  documentId: string;
  type: string;
  url: string;
  status: string;
}

interface WorkerProfileResponse {
  success: boolean;
  profileId: string;
  status: string;
  message: string;
} 