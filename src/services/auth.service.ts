import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IUserDocument, IUserTokens, IUserTokenPayload } from '../interfaces/user.interface';
import { UserService } from './user.service';
import { RedisService } from './redis.service';
import { logger } from '../utils/logger';
import { LogMetadata } from '../interfaces/logger.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService
  ) {}

  async register(registerData: any) {
    try {
      const user = await this.userService.createUser(registerData);
      const tokens = this.userService.generateTokens(user);
      
      await this.redisService.set(
        `user:${user._id}`,
        JSON.stringify(user),
        3600
      );

      logger.info('User registered successfully', { userId: user._id } as LogMetadata);
      
      return {
        status: 'success',
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          ...tokens
        }
      };
    } catch (error) {
      logger.error('Registration failed:', { error } as LogMetadata);
      throw error;
    }
  }

  async login(user: any) {
    const payload = { 
      userId: user._id.toString(),  // Make sure it's a string
      email: user.email,
      role: user.role 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout(userId: string) {
    try {
      await this.redisService.del(`user:${userId}`);
      logger.info('User logged out successfully', { userId } as LogMetadata);
      
      return {
        status: 'success',
        message: 'Successfully logged out'
      };
    } catch (error) {
      logger.error('Logout failed:', { error, userId } as LogMetadata);
      throw error;
    }
  }

  async forgotPassword(email: string) {
    try {
      await this.userService.requestPasswordReset(email);
      return {
        status: 'success',
        message: 'Password reset email sent'
      };
    } catch (error) {
      logger.error('Password reset request failed:', { error, email } as LogMetadata);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      await this.userService.resetPassword(token, newPassword);
      return {
        status: 'success',
        message: 'Password reset successful'
      };
    } catch (error) {
      logger.error('Password reset failed:', { error } as LogMetadata);
      throw error;
    }
  }

  async getProfile(userId: string) {
    try {
      const user = await this.userService.findById(userId);
      return {
        status: 'success',
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        }
      };
    } catch (error) {
      logger.error('Get profile failed:', { error, userId } as LogMetadata);
      throw error;
    }
  }

  async refreshUserToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      });

      const user = await this.userService.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: IUserDocument): IUserTokens {
    const payload: IUserTokenPayload = {
      _id: user._id,
      email: user.email,
      role: user.role
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        expiresIn: '7d'
      })
    };
  }
} 