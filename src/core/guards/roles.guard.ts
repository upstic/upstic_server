import { Request, Response, NextFunction } from 'express';
import { ForbiddenException } from '../exceptions';

export class RolesGuard {
  constructor(private roles: string[]) {}

  canActivate(req: Request, res: Response, next: NextFunction) {
    const userRoles = (req.user as any)?.roles || [];
    const hasRole = this.roles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    next();
  }
}
