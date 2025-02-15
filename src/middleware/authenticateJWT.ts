import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { config } from '../config';
import { UserService } from '../services/user.service';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, 'No authorization token provided');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AppError(401, 'Invalid authorization header format');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      email: string;
      role: string;
    };

    // Get fresh user data from database
    const user = await UserService.getUserById(decoded.id);
    
    if (!user) {
      throw new AppError(401, 'User no longer exists');
    }

    if (!user.isActive) {
      throw new AppError(401, 'User account is deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
}; 