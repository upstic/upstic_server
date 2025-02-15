import compression from 'compression';
import { Request, Response } from 'express';

export const compressionMiddleware = compression({
  level: 6, // compression level (0-9)
  threshold: 100 * 1024, // only compress responses above 100kb
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all text-based responses
    return compression.filter(req, res);
  },
}); 