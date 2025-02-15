import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/application.service';
import { ApplicationStatus } from '../models/Application';

export class ApplicationController {
  static async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const workerId = req.user!.userId;
      const application = await ApplicationService.apply(jobId, workerId, req.body);

      res.status(201).json({
        status: 'success',
        data: { application }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { applicationId } = req.params;
      const { status, note } = req.body;

      const application = await ApplicationService.updateStatus(
        applicationId,
        status as ApplicationStatus,
        note
      );

      res.json({
        status: 'success',
        data: { application }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkerApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const workerId = req.user!.userId;
      const { status } = req.query;

      const applications = await ApplicationService.getApplicationsByWorker(
        workerId,
        status as ApplicationStatus[]
      );

      res.json({
        status: 'success',
        data: { applications }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getJobApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      const { status } = req.query;

      const applications = await ApplicationService.getApplicationsByJob(
        jobId,
        status as ApplicationStatus[]
      );

      res.json({
        status: 'success',
        data: { applications }
      });
    } catch (error) {
      next(error);
    }
  }
} 