import { Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RedisService } from '../../services/redis.service';
import { config } from '../../config/config';
import { AppError } from '../errorHandler';
import { logger } from '../../utils/logger';
import { UserService } from '../../services/user.service';
import { JwtPayload } from '../../interfaces/jwt.interface';
import { UserRole } from '../../interfaces/user.interface';

interface DecodedToken {
  id: string;
  email: string;
  role: UserRole;
  version: string;
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class AuthHandler {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService
  ) {}

  private static readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private static readonly USER_SESSIONS_PREFIX = 'user:sessions:';

  async authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        logger.warn('Authentication failed: No token provided');
        throw new AppError(401, 'No token provided');
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AppError(401, 'Token has been invalidated');
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;

      // Get user and check if exists
      const user = await this.userService.findById(decoded.id);
      if (!user) {
        throw new AppError(401, 'User no longer exists');
      }

      const now = Math.floor(Date.now() / 1000);
      
      // Add user to request with required JWT fields
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        permissions: user.permissions || [],
        exp: now + 24 * 60 * 60, // 24 hours from now
        iat: now,
        sub: user.id
      };

      // Update last activity
      await this.updateLastActivity(user.id);

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      next(error);
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return null;
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const value = await this.redisService.get(
      `${AuthHandler.TOKEN_BLACKLIST_PREFIX}${token}`
    );
    return value !== null;
  }

  private async updateLastActivity(userId: string): Promise<void> {
    const activityTimeout = 3600; // 1 hour in seconds
    await this.redisService.set(
      `${AuthHandler.USER_SESSIONS_PREFIX}${userId}:lastActivity`,
      Date.now().toString(),
      activityTimeout
    );
  }

  async blacklistToken(token: string): Promise<void> {
    await this.redisService.set(
      `${AuthHandler.TOKEN_BLACKLIST_PREFIX}${token}`,
      '1',
      parseInt(config.jwt.expiresIn)
    );
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (user) {
      user.tokenVersion = (parseInt(user.tokenVersion) + 1).toString();
      await user.save();
    }
  }

  async checkPermissions(
    req: AuthenticatedRequest,
    permissions: string[]
  ): Promise<boolean> {
    if (!req.user?.permissions) return false;
    return permissions.every(permission => 
      req.user!.permissions.includes(permission)
    );
  }
} 