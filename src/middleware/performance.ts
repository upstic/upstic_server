import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Start performance measurement
  const start = performance.now();

  // Store the original end function
  const originalEnd = res.end;

  // Override the end function
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    // Calculate performance metrics
    const duration = performance.now() - start;
    const contentLength = res.get('content-length');
    const route = req.route?.path || 'unknown';

    // Log performance data
    logger.info('Performance Metrics', {
      requestId: req.headers['x-request-id'],
      route,
      method: req.method,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      contentLength,
      memoryUsage: process.memoryUsage().heapUsed
    });

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

// Memory usage monitor
export const memoryMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const memoryThreshold = 1024 * 1024 * 1024; // 1GB
  const memoryUsage = process.memoryUsage().heapUsed;

  if (memoryUsage > memoryThreshold) {
    logger.warn('High Memory Usage', {
      requestId: req.headers['x-request-id'],
      memoryUsage,
      threshold: memoryThreshold
    });
  }

  next();
}; 