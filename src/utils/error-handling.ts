import { HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from './logger';

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly data?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  handleError(error: Error | AppError | HttpException): HttpException {
    if (error instanceof AppError) {
      this.logger.error(`[${error.code}] ${error.message}`, {
        stack: error.stack,
        data: error.data
      });
      return new HttpException(
        {
          code: error.code,
          message: error.message,
          data: error.data
        },
        error.status
      );
    }

    if (error instanceof HttpException) {
      this.logger.error(`[HTTP_ERROR] ${error.message}`, {
        stack: error.stack
      });
      return error;
    }

    this.logger.error(`[UNEXPECTED_ERROR] ${error.message}`, {
      stack: error.stack
    });
    return new HttpException(
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  handleDatabaseError(error: any): AppError {
    if (error.code === 11000) {
      return new AppError(
        'DUPLICATE_ENTRY',
        'A record with this data already exists',
        HttpStatus.CONFLICT
      );
    }

    if (error.name === 'ValidationError') {
      return new AppError(
        'VALIDATION_ERROR',
        'Invalid data provided',
        HttpStatus.BAD_REQUEST,
        this.formatValidationError(error)
      );
    }

    return new AppError(
      'DATABASE_ERROR',
      'Database operation failed',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  handleAuthenticationError(error: any): AppError {
    const errorMap = {
      'invalid_credentials': {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        status: HttpStatus.UNAUTHORIZED
      },
      'token_expired': {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
        status: HttpStatus.UNAUTHORIZED
      },
      'invalid_token': {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
        status: HttpStatus.UNAUTHORIZED
      }
    };

    const defaultError = {
      code: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed',
      status: HttpStatus.UNAUTHORIZED
    };

    const errorConfig = errorMap[error.code] || defaultError;

    return new AppError(
      errorConfig.code,
      errorConfig.message,
      errorConfig.status,
      error.data
    );
  }

  private formatValidationError(error: any): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    for (const field in error.errors) {
      formatted[field] = [error.errors[field].message];
    }

    return formatted;
  }

  async wrapAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(errorMessage, { error });
      throw this.handleError(error);
    }
  }

  isOperationalError(error: Error): boolean {
    return error instanceof AppError || error instanceof HttpException;
  }
}

export const errorCodes = {
  VALIDATION: {
    INVALID_INPUT: 'INVALID_INPUT',
    REQUIRED_FIELD: 'REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT'
  },
  AUTH: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN'
  },
  DATABASE: {
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION'
  },
  BUSINESS: {
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    RESOURCE_LOCKED: 'RESOURCE_LOCKED',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED'
  }
} as const; 