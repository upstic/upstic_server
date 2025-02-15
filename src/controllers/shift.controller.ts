import { Request, Response, NextFunction } from 'express';
import { ShiftService } from '../services/shift.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class ShiftController {
  static async createShift(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const shift = await ShiftService.createShift(
        req.user!.id,
        req.body
      );

      res.status(201).json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  }

  static async getShifts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        clientId: req.query.clientId as string,
        branchId: req.query.branchId as string,
        workerId: req.query.workerId as string,
        status: req.query.status as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const shifts = await ShiftService.getShifts(filters);

      res.status(200).json({
        success: true,
        data: shifts
      });
    } catch (error) {
      next(error);
    }
  }

  static async getShift(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const shift = await ShiftService.getShift(req.params.shiftId);

      if (!shift) {
        throw new AppError(404, 'Shift not found');
      }

      res.status(200).json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateShift(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const shift = await ShiftService.updateShift(
        req.params.shiftId,
        req.user!.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteShift(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await ShiftService.deleteShift(
        req.params.shiftId,
        req.user!.id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async assignWorker(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const shift = await ShiftService.assignWorker(
        req.params.shiftId,
        req.body.workerId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  }

  static async unassignWorker(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const shift = await ShiftService.unassignWorker(
        req.params.shiftId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkIn(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const shift = await ShiftService.checkIn(
        req.params.shiftId,
        req.user!.id,
        {
          location: req.body.location,
          notes: req.body.notes
        }
      );

      res.status(200).json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkOut(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const shift = await ShiftService.checkOut(
        req.params.shiftId,
        req.user!.id,
        {
          location: req.body.location,
          notes: req.body.notes
        }
      );

      res.status(200).json({
        success: true,
        data: shift
      });
    } catch (error) {
      next(error);
    }
  }

  static async getShiftNotes(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const notes = await ShiftService.getShiftNotes(
        req.params.shiftId
      );

      res.status(200).json({
        success: true,
        data: notes
      });
    } catch (error) {
      next(error);
    }
  }

  static async addShiftNote(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const note = await ShiftService.addShiftNote(
        req.params.shiftId,
        req.user!.id,
        req.body.content
      );

      res.status(201).json({
        success: true,
        data: note
      });
    } catch (error) {
      next(error);
    }
  }
} 