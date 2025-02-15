import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IJob, IWorkerProfile, JobStatus } from '../interfaces/models.interface';

@Injectable()
export class MatchingService {
  constructor(
    @InjectModel('Job') private readonly jobModel: Model<IJob>,
    @InjectModel('WorkerProfile') private readonly workerProfileModel: Model<IWorkerProfile>
  ) {}

  async findMatchingJobs(workerId: string): Promise<IJob[]> {
    const workerProfile = await this.workerProfileModel.findOne({ userId: workerId });
    if (!workerProfile) return [];

    return this.jobModel.find({
      status: 'open',
      skills: { $in: workerProfile.personalInfo?.skills || [] },
      'salary.min': { 
        $gte: workerProfile.personalInfo?.salary?.expected || 0 
      },
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: workerProfile.personalInfo?.location?.coordinates || [0, 0]
          },
          $maxDistance: 50000
        }
      }
    })
    .sort({ 'metadata.lastModified': -1 })
    .limit(20)
    .lean();
  }

  async findMatchingWorkers(jobId: string): Promise<IWorkerProfile[]> {
    const job = await this.jobModel.findById(jobId).lean();
    if (!job) {
      throw new Error('Job not found');
    }

    return this.workerProfileModel.find({
      $and: [
        {
          'personalInfo.salary.expected': {
            $lte: job.salary.max
          }
        },
        {
          'personalInfo.location.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: job.location.coordinates
              },
              $maxDistance: 50000
            }
          }
        },
        {
          'personalInfo.skills': { 
            $in: job.skills 
          }
        }
      ]
    }).lean();
  }
} 