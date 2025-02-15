import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class SearchController {
  static async searchWorkers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        skills: req.query.skills as string[],
        experience: req.query.experience as string,
        availability: req.query.availability as string,
        location: req.query.location as string,
        radius: parseFloat(req.query.radius as string),
        rate: {
          min: parseFloat(req.query.minRate as string),
          max: parseFloat(req.query.maxRate as string)
        },
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const workers = await SearchService.searchWorkers(filters);

      res.status(200).json({
        success: true,
        data: workers
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        title: req.query.title as string,
        skills: req.query.skills as string[],
        location: req.query.location as string,
        radius: parseFloat(req.query.radius as string),
        type: req.query.type as string,
        rate: {
          min: parseFloat(req.query.minRate as string),
          max: parseFloat(req.query.maxRate as string)
        },
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const jobs = await SearchService.searchJobs(filters);

      res.status(200).json({
        success: true,
        data: jobs
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchClients(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        name: req.query.name as string,
        industry: req.query.industry as string,
        location: req.query.location as string,
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const clients = await SearchService.searchClients(filters);

      res.status(200).json({
        success: true,
        data: clients
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchShifts(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        location: req.query.location as string,
        type: req.query.type as string,
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const shifts = await SearchService.searchShifts(filters);

      res.status(200).json({
        success: true,
        data: shifts
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSearchProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const profile = await SearchService.createSearchProfile(
        req.user!.id,
        req.body
      );

      res.status(201).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSearchProfiles(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const profiles = await SearchService.getSearchProfiles(req.user!.id);

      res.status(200).json({
        success: true,
        data: profiles
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSearchProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const profile = await SearchService.updateSearchProfile(
        req.params.profileId,
        req.user!.id,
        req.body
      );

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSearchProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      await SearchService.deleteSearchProfile(
        req.params.profileId,
        req.user!.id
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getProfileMatches(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const matches = await SearchService.getProfileMatches(
        req.params.profileId,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: matches
      });
    } catch (error) {
      next(error);
    }
  }

  static async saveSearch(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const savedSearch = await SearchService.saveSearch(
        req.user!.id,
        req.body
      );

      res.status(201).json({
        success: true,
        data: savedSearch
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSavedSearches(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const savedSearches = await SearchService.getSavedSearches(req.user!.id);

      res.status(200).json({
        success: true,
        data: savedSearches
      });
    } catch (error) {
      next(error);
    }
  }
} 