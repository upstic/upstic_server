import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { IUserDocument, IUserTokens, IUserBase } from '../interfaces/user.interface';
import { UserRole } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { RedisService } from './redis.service';
import { hashPassword } from '../utils/auth';
import { sendEmail } from '../utils/email';
import { ClientService } from './client.service';
import { WorkerService } from './worker.service';
import { compare, hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service';

@Injectable()
export class UserService {
  private readonly CACHE_PREFIX = 'user:';
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly RESET_TOKEN_TTL = 3600; // 1 hour
  private readonly PASSWORD_RESET_PREFIX = 'password-reset:';

  constructor(
    @InjectModel('User') private readonly userModel: Model<IUserDocument>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly clientService: ClientService,
    private readonly workerService: WorkerService,
    private readonly emailService: EmailService
  ) {}

  private getUserName(user: IUserDocument): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  async createUser(userData: Partial<IUserBase>): Promise<IUserDocument> {
    try {
      const user = new this.userModel({
        ...userData,
        loginCount: 0,
        permissions: [],
      });
      await user.save();
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async validateUser(credentials: { email: string; password: string }): Promise<{ user: IUserDocument, tokens: IUserTokens }> {
    const user = await this.userModel.findOne({ email: credentials.email });
    if (!user || !(await compare(credentials.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.updateLastLogin(user._id.toHexString());
    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = uuidv4();
    await this.redisService.set(
      `${this.PASSWORD_RESET_PREFIX}${resetToken}`,
      user._id.toString(),
      this.RESET_TOKEN_TTL
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail(email, 'Password Reset', 'password-reset-template', {
      name: user.name,
      resetLink
    });

    logger.info('Password reset requested', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redisService.get(`${this.PASSWORD_RESET_PREFIX}${token}`);
    if (!userId) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const hashedPassword = await hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { password: hashedPassword }
    });

    await this.redisService.del(`${this.PASSWORD_RESET_PREFIX}${token}`);
    logger.info('Password reset successful', { userId });
  }

  async findById(id: string): Promise<IUserDocument> {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundException('Invalid user ID format');
      }
      throw error;
    }
  }

  async refreshUserToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async searchUsers(query: string, role?: UserRole, page: number = 1, limit: number = 10) {
    try {
      const searchCriteria: any = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      };

      if (role) {
        searchCriteria.role = role;
      }

      const [users, total] = await Promise.all([
        this.userModel.find(searchCriteria)
          .select('-password')
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 }),
        this.userModel.countDocuments(searchCriteria)
      ]);

      return {
        users,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  public generateTokens(user: IUserDocument) {
    const payload = { 
      userId: user._id.toHexString(), 
      email: user.email, 
      role: user.role 
    };
    
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' })
    };
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        $set: { lastLogin: new Date() },
        $inc: { loginCount: 1 }
      });
    } catch (error) {
      logger.error('Error updating last login:', error);
    }
  }

  async getUserByEmail(email: string) {
    try {
      return await this.userModel.findOne({ email });
    } catch (error) {
      logger.error('Error fetching user by email:', error);
      throw error;
    }
  }
} 