import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IJobOffer, JobOfferStatus } from '../interfaces/job-offer.interface';
import { CreateJobOfferDto, UpdateJobOfferDto, JobOfferResponseDto } from '../dtos/job-offer.dto';
import { NotificationService } from './notification.service';
import { createJobOffer, updateJobOfferStatus } from '../models/JobOffer';

@Injectable()
export class JobOfferService {
  constructor(
    @InjectModel('JobOffer') private readonly jobOfferModel: Model<IJobOffer>,
    @InjectModel('Job') private readonly jobModel: any,
    @InjectModel('User') private readonly userModel: any,
    private readonly notificationService: NotificationService
  ) {}

  async createJobOffer(createJobOfferDto: CreateJobOfferDto): Promise<IJobOffer> {
    // Validate job exists
    const job = await this.jobModel.findById(createJobOfferDto.jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID ${createJobOfferDto.jobId} not found`);
    }

    // Validate candidate exists
    const candidate = await this.userModel.findById(createJobOfferDto.candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${createJobOfferDto.candidateId} not found`);
    }

    // Validate recruiter exists
    const recruiter = await this.userModel.findById(createJobOfferDto.recruiterId);
    if (!recruiter) {
      throw new NotFoundException(`Recruiter with ID ${createJobOfferDto.recruiterId} not found`);
    }

    // Check if an offer already exists for this job and candidate
    const existingOffer = await this.jobOfferModel.findOne({
      jobId: createJobOfferDto.jobId,
      candidateId: createJobOfferDto.candidateId,
      status: { $in: [JobOfferStatus.PENDING, JobOfferStatus.ACCEPTED] }
    });

    if (existingOffer) {
      throw new BadRequestException(`An active offer already exists for this job and candidate`);
    }

    // Create the job offer
    const jobOfferData: Partial<IJobOffer> = {
      jobId: new Types.ObjectId(createJobOfferDto.jobId),
      candidateId: new Types.ObjectId(createJobOfferDto.candidateId),
      recruiterId: new Types.ObjectId(createJobOfferDto.recruiterId),
      createdBy: new Types.ObjectId(createJobOfferDto.createdBy),
      offerDate: createJobOfferDto.offerDate ? new Date(createJobOfferDto.offerDate) : new Date(),
      expiryDate: new Date(createJobOfferDto.expiryDate),
      startDate: new Date(createJobOfferDto.startDate),
      endDate: createJobOfferDto.endDate ? new Date(createJobOfferDto.endDate) : undefined,
      status: createJobOfferDto.status || JobOfferStatus.PENDING,
      history: [],
      location: createJobOfferDto.location,
      hourlyRate: createJobOfferDto.hourlyRate,
      offerType: createJobOfferDto.offerType,
      contractType: createJobOfferDto.contractType,
      notes: createJobOfferDto.notes
    };

    // Handle probation period conversion
    if (createJobOfferDto.probationPeriod) {
      jobOfferData.probationPeriod = {
        duration: createJobOfferDto.probationPeriod.duration,
        endDate: new Date(createJobOfferDto.probationPeriod.endDate)
      };
    }

    // Handle documents conversion
    if (createJobOfferDto.documents && createJobOfferDto.documents.length > 0) {
      jobOfferData.documents = createJobOfferDto.documents.map(doc => ({
        type: doc.type,
        url: doc.url,
        uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : new Date()
      }));
    }

    const jobOffer = await createJobOffer(jobOfferData);

    // Send notification to candidate - using getNotification instead of createNotification
    // Note: You may need to implement a proper notification method in your service
    // This is a placeholder based on the error message
    try {
      // If you have a notification creation method, use it here
      // For now, we'll log the notification details
      console.log('Notification to candidate:', {
        title: 'New Job Offer',
        description: `You have received a job offer for ${job.title}`,
        createdFor: createJobOfferDto.candidateId,
        createdBy: createJobOfferDto.createdBy,
        notificationType: 'job_offer',
        objectId: jobOffer._id.toString()
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return jobOffer;
  }

  async findAll(filters: any = {}): Promise<IJobOffer[]> {
    return this.jobOfferModel.find(filters)
      .populate('jobId', 'title company location')
      .populate('candidateId', 'firstName lastName email')
      .populate('recruiterId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IJobOffer> {
    const jobOffer = await this.jobOfferModel.findById(id)
      .populate('jobId', 'title company location salary')
      .populate('candidateId', 'firstName lastName email phone')
      .populate('recruiterId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!jobOffer) {
      throw new NotFoundException(`Job offer with ID ${id} not found`);
    }

    return jobOffer;
  }

  async findByCandidate(candidateId: string): Promise<IJobOffer[]> {
    return this.jobOfferModel.find({ candidateId })
      .populate('jobId', 'title company location')
      .populate('recruiterId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async findByJob(jobId: string): Promise<IJobOffer[]> {
    return this.jobOfferModel.find({ jobId })
      .populate('candidateId', 'firstName lastName email')
      .populate('recruiterId', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async update(id: string, updateJobOfferDto: UpdateJobOfferDto): Promise<IJobOffer> {
    const jobOffer = await this.jobOfferModel.findById(id);
    
    if (!jobOffer) {
      throw new NotFoundException(`Job offer with ID ${id} not found`);
    }

    // Don't allow updates to accepted/rejected offers unless it's an admin action
    if (
      (jobOffer.status === JobOfferStatus.ACCEPTED || jobOffer.status === JobOfferStatus.REJECTED) && 
      updateJobOfferDto.status && 
      updateJobOfferDto.status !== jobOffer.status
    ) {
      throw new BadRequestException(`Cannot update a ${jobOffer.status} job offer`);
    }

    // Update fields
    if (updateJobOfferDto.status && updateJobOfferDto.status !== jobOffer.status) {
      return updateJobOfferStatus(
        id, 
        updateJobOfferDto.status, 
        updateJobOfferDto.updatedBy,
        updateJobOfferDto.notes
      );
    }

    // Update other fields
    Object.keys(updateJobOfferDto).forEach(key => {
      if (key !== 'status' && key !== 'updatedBy') {
        jobOffer[key] = updateJobOfferDto[key];
      }
    });

    jobOffer.updatedBy = new Types.ObjectId(updateJobOfferDto.updatedBy);
    
    return jobOffer.save();
  }

  async respondToOffer(id: string, response: JobOfferResponseDto): Promise<IJobOffer> {
    const jobOffer = await this.jobOfferModel.findById(id);
    
    if (!jobOffer) {
      throw new NotFoundException(`Job offer with ID ${id} not found`);
    }

    if (jobOffer.status !== JobOfferStatus.PENDING) {
      throw new BadRequestException(`Cannot respond to a ${jobOffer.status} job offer`);
    }

    // Check if offer has expired
    if (new Date() > jobOffer.expiryDate) {
      throw new BadRequestException('This job offer has expired');
    }

    // Update the offer status
    const updatedOffer = await updateJobOfferStatus(
      id,
      response.status,
      response.updatedBy,
      response.notes
    );

    if (!updatedOffer) {
      throw new NotFoundException(`Job offer with ID ${id} not found`);
    }

    // If rejected, save the rejection reason
    if (response.status === JobOfferStatus.REJECTED && response.rejectionReason) {
      updatedOffer.rejectionReason = response.rejectionReason;
      await updatedOffer.save();
    }

    // Send notification to recruiter - using getNotification instead of createNotification
    try {
      // If you have a notification creation method, use it here
      // For now, we'll log the notification details
      console.log('Notification to recruiter:', {
        title: `Job Offer ${response.status === JobOfferStatus.ACCEPTED ? 'Accepted' : 'Rejected'}`,
        description: `Candidate has ${response.status === JobOfferStatus.ACCEPTED ? 'accepted' : 'rejected'} the job offer`,
        createdFor: updatedOffer.recruiterId.toString(),
        createdBy: response.updatedBy,
        notificationType: 'job_offer_response',
        objectId: updatedOffer._id.toString()
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return updatedOffer;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const result = await this.jobOfferModel.deleteOne({ _id: id });
    return { deleted: result.deletedCount === 1 };
  }

  async checkExpiredOffers(): Promise<void> {
    const now = new Date();
    const expiredOffers = await this.jobOfferModel.find({
      status: JobOfferStatus.PENDING,
      expiryDate: { $lt: now }
    });

    for (const offer of expiredOffers) {
      await updateJobOfferStatus(
        offer._id.toString(),
        JobOfferStatus.EXPIRED,
        offer.recruiterId.toString(),
        'Offer expired automatically'
      );

      // Notify candidate and recruiter - using getNotification instead of createNotification
      try {
        // If you have a notification creation method, use it here
        // For now, we'll log the notification details
        console.log('Notification to candidate:', {
          title: 'Job Offer Expired',
          description: 'Your job offer has expired',
          createdFor: offer.candidateId.toString(),
          createdBy: offer.recruiterId.toString(),
          notificationType: 'job_offer_expired',
          objectId: offer._id.toString()
        });

        console.log('Notification to recruiter:', {
          title: 'Job Offer Expired',
          description: `Job offer for candidate has expired`,
          createdFor: offer.recruiterId.toString(),
          createdBy: offer.recruiterId.toString(),
          notificationType: 'job_offer_expired',
          objectId: offer._id.toString()
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }
} 