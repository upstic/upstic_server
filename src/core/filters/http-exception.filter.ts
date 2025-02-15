import { Request, Response } from 'express';
import { HttpException } from '../exceptions/http.exception';

export class HttpExceptionFilter {
  catch(error: Error, req: Request, res: Response) {
    if (error instanceof HttpException) {
      return res.status(error.statusCode).json({
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
    }

    // Handle unexpected errors
    console.error(error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
