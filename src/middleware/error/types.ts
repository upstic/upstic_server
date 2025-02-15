export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Example usage to ensure AppError is used
export const createError = (statusCode: number, message: string) => {
  return new AppError(statusCode, message);
}; 