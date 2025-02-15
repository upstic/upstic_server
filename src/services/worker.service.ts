import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IWorker, IApplication } from '../interfaces/models.interface';
import { logger } from '../utils/logger';
import { PaginationParamsDto, SortingParamsDto, FilteringParamsDto, PaginatedResponseDto, WorkerResponseDto } from '../interfaces/dto.interface';

@Injectable()
export class WorkerService {
  constructor(
    @InjectModel('Worker') private readonly workerModel: Model<IWorker>,
    @InjectModel('Application') private readonly applicationModel: Model<IApplication>
  ) {}

  async findAll(
    pagination: PaginationParamsDto,
    sorting: SortingParamsDto,
    filtering: FilteringParamsDto
  ): Promise<PaginatedResponseDto<WorkerResponseDto>> {
    const { page, limit } = pagination;
    const { sortBy, sortOrder } = sorting;
    const { filters, search, searchFields } = filtering;

    const skip = (page - 1) * limit;
    const sort = { [sortBy || 'createdAt']: sortOrder };

    const [items, total] = await Promise.all([
      this.workerModel
        .find()
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.workerModel.countDocuments()
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async create(workerData: any): Promise<IWorker> {
    const worker = new this.workerModel(workerData);
    return worker.save();
  }

  async findOne(id: string): Promise<IWorker | null> {
    return this.workerModel.findById(id).lean();
  }

  async update(id: string, workerData: any): Promise<IWorker | null> {
    return this.workerModel.findByIdAndUpdate(
      id,
      { $set: workerData },
      { new: true }
    ).lean();
  }

  async getAvailability(id: string): Promise<any> {
    const worker = await this.workerModel.findById(id)
      .select('availability')
      .lean();
    return worker?.availability || null;
  }

  async getApplications(id: string): Promise<IApplication[]> {
    return this.applicationModel.find({ workerId: id })
      .populate('jobId')
      .lean();
  }

  async delete(id: string): Promise<IWorker | null> {
    return this.workerModel.findByIdAndDelete(id).lean();
  }

  async createProfile(userId: string, userData?: any): Promise<IWorker> {
    try {
      if (!userData) {
        throw new Error('User data is required for worker profile creation');
      }

      const workerData = {
        userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone || '',
        skills: [],
        experience: 0,
        availability: 'available',
        preferredLocation: '',
        location: '',
        salary: {
          expected: 0,
          currency: 'USD'
        }
      };

      const worker = new this.workerModel(workerData);
      await worker.save();
      logger.info('Worker profile created', { userId });
      return worker;
    } catch (error) {
      logger.error('Error creating worker profile:', error);
      throw error;
    }
  }

  async deleteProfile(userId: string) {
    try {
      await this.workerModel.findOneAndDelete({ userId });
      logger.info('Worker profile deleted', { userId });
    } catch (error) {
      logger.error('Error deleting worker profile:', error);
      throw error;
    }
  }
} 