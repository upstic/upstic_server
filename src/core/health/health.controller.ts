import { Request, Response } from 'express';

export class HealthController {
  async check(req: Request, res: Response) {
    const healthcheck = {
      uptime: process.uptime(),
      message: 'OK' as const,
      timestamp: Date.now()
    };
    try {
      res.send(healthcheck);
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      healthcheck.message = 'ERROR';
      res.status(503).send({ ...healthcheck, error });
    }
  }

  async detailed(req: Request, res: Response) {
    const healthcheck = {
      uptime: process.uptime(),
      message: 'OK' as const,
      timestamp: Date.now(),
      services: {
        database: 'OK',
        cache: 'OK',
        queue: 'OK'
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
    try {
      // Add checks for database, cache, and queue services here
      res.send(healthcheck);
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      healthcheck.message = 'ERROR';
      res.status(503).send({ ...healthcheck, error });
    }
  }
}
