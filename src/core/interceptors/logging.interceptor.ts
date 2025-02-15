import { Request, Response, NextFunction } from 'express';

export class LoggingInterceptor {
  intercept(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, body } = req;

    // Log request
    console.log({
      timestamp: new Date().toISOString(),
      type: 'request',
      method,
      url: originalUrl,
      ip,
      body: this.sanitizeBody(body)
    });

    // Capture response using res.on('finish')
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log({
        timestamp: new Date().toISOString(),
        type: 'response',
        method,
        url: originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'creditCard'];
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    });
    
    return sanitized;
  }
}
