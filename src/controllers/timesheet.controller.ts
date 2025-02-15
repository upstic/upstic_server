import { Request, Response, NextFunction } from 'express';
import { TimesheetService } from '../services/timesheet.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class TimesheetController {
  static async createTimesheet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const timesheet = await TimesheetService.createTimesheet(
        req.user!.id,
        req.body
      );

      res.status(201).json({
        success: true,
        data: timesheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTimesheets(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        workerId: req.query.workerId as string,
        clientId: req.query.clientId as string,
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const timesheets = await TimesheetService.getTimesheets(
        req.user!.id,
        filters
      );

      res.status(200).json({
        success: true,
        data: timesheets
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTimesheet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const timesheet = await TimesheetService.getTimesheet(
        req.params.timesheetId
      );

      if (!timesheet) {
        throw new AppError(404, 'Timesheet not found');
      }

      res.status(200).json({
        success: true,
        data: timesheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTimesheet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const timesheet = await TimesheetService.updateTimesheet(
        req.params.timesheetId,
        req.user!.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: timesheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitTimesheet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const timesheet = await TimesheetService.submitTimesheet(
        req.params.timesheetId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: timesheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveTimesheet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const timesheet = await TimesheetService.approveTimesheet(
        req.params.timesheetId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: timesheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectTimesheet(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const timesheet = await TimesheetService.rejectTimesheet(
        req.params.timesheetId,
        req.user!.id,
        req.body.reason
      );

      res.status(200).json({
        success: true,
        data: timesheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTimesheetSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        workerId: req.query.workerId as string,
        clientId: req.query.clientId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const summary = await TimesheetService.getTimesheetSummary(
        req.user!.id,
        filters
      );

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
} 