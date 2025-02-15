import { Request, Response, NextFunction } from 'express';
import { MongoServerError } from 'mongodb';
import { logger } from '../utils/logger';
import { config } from '../config/config';

// Define custom user interface
interface RequestWithUser extends Request {
  user?: {
    id: string;
    userId?: string;
    [key: string]: any;
  };
}

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

interface ErrorResponse {
  status: string;
  message: string;
  error?: {
    type: string;
    field?: string;
    message?: string;
  };
  stack?: string;
  metadata?: Record<string, any>;
}

export const errorHandler = (
  err: Error | AppError | MongoServerError,
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  const response: ErrorResponse = {
    status: 'error',
    message: 'Internal server error'
  };

  // Log error
  logger.error('Error:', {
    error: err,
    path: req.path,
    method: req.method,
    user: req.user?.id,
    body: req.body,
    query: req.query
  });

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response.message = err.message;
    response.error = {
      type: 'AppError',
      message: err.message
    };
  } else if (err instanceof Error) {
    if (err.name === 'ValidationError') {
      statusCode = 400;
      response.error = {
        type: 'ValidationError',
        field: (err as any).path,
        message: err.message
      };
    } else if (err.name === 'MongoServerError' && (err as MongoServerError).code === 11000) {
      statusCode = 409;
      const field = Object.keys((err as MongoServerError & { keyValue: Record<string, any> }).keyValue)[0];
      response.error = {
        type: 'DuplicateError',
        field,
        message: `${field} already exists`
      };
    }
  }

  // Add stack trace in development
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Unhandled Rejection Handler
export const unhandledRejectionHandler = (
  reason: Error,
  promise: Promise<any>
) => {
  logger.error('Unhandled Rejection:', {
    reason: reason.message,
    stack: reason.stack,
    promise
  });
  
  // Gracefully shutdown the server
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

// Uncaught Exception Handler
export const uncaughtExceptionHandler = (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Gracefully shutdown the server
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}; 