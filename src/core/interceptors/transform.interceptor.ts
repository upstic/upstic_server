import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

export class TransformInterceptor {
  intercept(req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json;
    res.json = function(body: any): Response {
      const transformedResponse: ApiResponse = {
        statusCode: res.statusCode,
        message: body.message || 'Success',
        data: body.data || body,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      };

      if (body.meta) {
        transformedResponse.meta = body.meta;
      }

      return originalJson.call(this, transformedResponse);
    };

    next();
  }
}
