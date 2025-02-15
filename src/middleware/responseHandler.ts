import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  metadata?: {
    pagination?: PaginationMetadata;
    timestamp: number;
    requestId: string;
    processingTime?: number;
  };
  errors?: any[];
}

export class ResponseHandler {
  static success<T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    statusCode: number = 200,
    metadata?: Partial<PaginationMetadata>
  ): Response {
    const startTime = res.locals.startTime || Date.now();
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      metadata: {
        timestamp: Date.now(),
        requestId: res.locals.requestId,
        processingTime: Date.now() - startTime
      }
    };

    if (metadata) {
      response.metadata!.pagination = {
        total: metadata.total || 0,
        page: metadata.page || 1,
        limit: metadata.limit || 10,
        totalPages: metadata.totalPages || 1,
        hasNext: metadata.hasNext || false,
        hasPrev: metadata.hasPrev || false
      };
    }

    // Log successful response
    logger.info('API Response', {
      requestId: res.locals.requestId,
      statusCode,
      processingTime: response.metadata?.processingTime,
      path: res.locals.path
    });

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500,
    errors?: any[]
  ): Response {
    const startTime = res.locals.startTime || Date.now();
    const response: ApiResponse<null> = {
      success: false,
      message,
      metadata: {
        timestamp: Date.now(),
        requestId: res.locals.requestId,
        processingTime: Date.now() - startTime
      }
    };

    if (errors) {
      response.errors = errors;
    }

    // Log error response
    logger.error('API Error Response', {
      requestId: res.locals.requestId,
      statusCode,
      message,
      errors,
      processingTime: response.metadata?.processingTime,
      path: res.locals.path
    });

    return res.status(statusCode).json(response);
  }

  static stream(
    res: Response,
    data: NodeJS.ReadableStream,
    filename: string,
    mimetype: string
  ): void {
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    data.pipe(res);
  }
}

// Middleware to initialize response handling
export const initializeResponse = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.locals.startTime = Date.now();
  res.locals.requestId = req.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.locals.path = req.path;

  // Override res.json to ensure consistent response format
  const originalJson = res.json;
  res.json = function(body: any): Response {
    if (body && typeof body === 'object' && !body.success) {
      body = {
        success: true,
        data: body,
        metadata: {
          timestamp: Date.now(),
          requestId: res.locals.requestId,
          processingTime: Date.now() - res.locals.startTime
        }
      };
    }
    return originalJson.call(this, body);
  };

  next();
};

// Example usage in controllers:
/*
export class UserController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const users = await UserService.getUsers(page, limit);
      
      return ResponseHandler.success(
        res,
        users.data,
        'Users retrieved successfully',
        200,
        {
          total: users.total,
          page: users.page,
          limit: users.limit,
          totalPages: users.totalPages,
          hasNext: users.hasNext,
          hasPrev: users.hasPrev
        }
      );
    } catch (error) {
      next(error);
    }
  }
}
*/ 