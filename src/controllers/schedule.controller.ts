import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class ScheduleController {
  static async createSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const schedule = await ScheduleService.createSchedule(
        req.user!.id,
        {
          branchId: req.body.branchId,
          clientId: req.body.clientId,
          startDate: new Date(req.body.startDate),
          endDate: new Date(req.body.endDate),
          shifts: req.body.shifts,
          notes: req.body.notes
        }
      );

      res.status(201).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSchedules(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        branchId: req.query.branchId as string,
        clientId: req.query.clientId as string,
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const schedules = await ScheduleService.getSchedules(filters);

      res.status(200).json({
        success: true,
        data: schedules
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const schedule = await ScheduleService.getSchedule(req.params.scheduleId);

      if (!schedule) {
        throw new AppError(404, 'Schedule not found');
      }

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const schedule = await ScheduleService.updateSchedule(
        req.params.scheduleId,
        req.user!.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await ScheduleService.deleteSchedule(
        req.params.scheduleId,
        req.user!.id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getWorkerSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        status: req.query.status as string
      };

      const schedule = await ScheduleService.getWorkerSchedule(
        req.params.workerId,
        filters
      );

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async getClientSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        status: req.query.status as string,
        branchId: req.query.branchId as string
      };

      const schedule = await ScheduleService.getClientSchedule(
        req.params.clientId,
        filters
      );

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async addShift(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const schedule = await ScheduleService.addShift(
        req.params.scheduleId,
        req.user!.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeShift(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const schedule = await ScheduleService.removeShift(
        req.params.scheduleId,
        req.params.shiftId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduleConflicts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const conflicts = await ScheduleService.getScheduleConflicts(
        req.params.scheduleId
      );

      res.status(200).json({
        success: true,
        data: conflicts
      });
    } catch (error) {
      next(error);
    }
  }

  static async publishSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const schedule = await ScheduleService.publishSchedule(
        req.params.scheduleId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }
} 