import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../middleware/responseHandler';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';


export abstract class BaseController {
  protected static async execute(
    req: Request,
    res: Response,
    next: NextFunction,
    action: () => Promise<any>
  ) {
    try {
      const result = await action();
      
      if (!result) {
        throw new AppError(404, 'Resource not found');
      }

      return ResponseHandler.success(
        res,
        result.data,
        result.message || 'Operation successful',
        result.statusCode || 200,
        result.metadata
      );
    } catch (error) {
      next(error);
    }
  }

  protected static async handlePagination(
    req: Request
  ): Promise<{ page: number; limit: number }> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      throw new AppError(400, 'Invalid pagination parameters');
    }

    return { page, limit };
  }

  protected static async handleSort(
    req: Request,
    allowedFields: string[]
  ): Promise<{ [key: string]: 1 | -1 }> {
    const sort = req.query.sort as string;
    if (!sort) return { createdAt: -1 };

    const sortFields = sort.split(',').reduce((acc: any, field: string) => {
      const order = field.startsWith('-') ? -1 : 1;
      const fieldName = field.replace(/^-/, '');

      if (!allowedFields.includes(fieldName)) {
        throw new AppError(400, `Invalid sort field: ${fieldName}`);
      }

      acc[fieldName] = order;
      return acc;
    }, {});

    return sortFields;
  }

  protected static async handleFilter(
    req: Request,
    allowedFields: string[]
  ): Promise<any> {
    const filter = { ...req.query };
    const excludedFields = ['page', 'limit', 'sort', 'fields'];
    excludedFields.forEach(field => delete filter[field]);

    // Validate filter fields
    Object.keys(filter).forEach(key => {
      if (!allowedFields.includes(key)) {
        throw new AppError(400, `Invalid filter field: ${key}`);
      }
    });

    return filter;
  }

  protected static logAction(
    action: string,
    userId: string,
    details: any
  ): void {
    logger.info(`User Action: ${action}`, {
      userId,
      action,
      details,
      timestamp: new Date()
    });
  }
} 