import { Request, Response, NextFunction } from 'express';
import { BranchService } from '../services/branch.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class BranchController {
  static async createBranch(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const branch = await BranchService.createBranch(
        req.user!.id,
        req.body
      );

      res.status(201).json({
        success: true,
        data: branch
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBranches(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        region: req.query.region as string,
        status: req.query.status as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const branches = await BranchService.getBranches(filters);

      res.status(200).json({
        success: true,
        data: branches
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBranch(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const branch = await BranchService.getBranch(req.params.branchId);

      if (!branch) {
        throw new AppError(404, 'Branch not found');
      }

      res.status(200).json({
        success: true,
        data: branch
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBranch(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const branch = await BranchService.updateBranch(
        req.params.branchId,
        req.user!.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: branch
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBranch(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await BranchService.deleteBranch(
        req.params.branchId,
        req.user!.id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getBranchStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const statistics = await BranchService.getBranchStatistics(
        req.params.branchId,
        filters
      );

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const branch = await BranchService.assignManager(
        req.params.branchId,
        req.body.managerId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: branch
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeManager(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const branch = await BranchService.removeManager(
        req.params.branchId,
        req.params.managerId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: branch
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBranchWorkers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        status: req.query.status as string,
        skillset: req.query.skillset as string[],
        availability: req.query.availability as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const workers = await BranchService.getBranchWorkers(
        req.params.branchId,
        filters
      );

      res.status(200).json({
        success: true,
        data: workers
      });
    } catch (error) {
      next(error);
    }
  }
} 