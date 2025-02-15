import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { AppError } from './error-handling';
import { Logger } from './logger';

const logger = new Logger('SecurityUtils');

@Injectable()
export class SecurityUtils {
  private static readonly SALT_ROUNDS = 10;
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;
  private static readonly TOKEN_LENGTH = 48;

  constructor(private configService: ConfigService) {}

  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Error hashing password:', { error });
      throw error;
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error comparing passwords:', { error });
      throw error;
    }
  }

  generateToken(payload: any, expiresIn: string = '1d'): string {
    const secret = this.configService.get('JWT_SECRET');
    return jwt.sign(payload, secret, { expiresIn });
  }

  verifyToken(token: string): any {
    try {
      const secret = this.configService.get('JWT_SECRET');
      return jwt.verify(token, secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('TOKEN_EXPIRED', 'Token has expired', 401);
      }
      throw new AppError('INVALID_TOKEN', 'Invalid token', 401);
    }
  }

  static encrypt(text: string, key: string): { encrypted: string; iv: string; authTag: string } {
    try {
      const iv = crypto.randomBytes(SecurityUtils.IV_LENGTH);
      const cipher = crypto.createCipheriv(
        SecurityUtils.ENCRYPTION_ALGORITHM,
        Buffer.from(key, 'hex'),
        iv
      );

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Error encrypting data:', { error });
      throw error;
    }
  }

  static decrypt(encrypted: string, key: string, iv: string, authTag: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        SecurityUtils.ENCRYPTION_ALGORITHM,
        Buffer.from(key, 'hex'),
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Error decrypting data:', { error });
      throw error;
    }
  }

  static generateSecureKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }

  static generateRandomString(length: number = 32): string {
    try {
      return crypto.randomBytes(length)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, length);
    } catch (error) {
      logger.error('Error generating random string:', { error });
      throw error;
    }
  }

  static generateToken(): string {
    try {
      return crypto.randomBytes(this.TOKEN_LENGTH)
        .toString('base64')
        .replace(/[+/=]/g, '')
        .substring(0, this.TOKEN_LENGTH);
    } catch (error) {
      logger.error('Error generating token:', { error });
      throw error;
    }
  }

  static generateApiKey(): string {
    try {
      return crypto.randomBytes(this.KEY_LENGTH)
        .toString('base64')
        .replace(/[+/=]/g, '')
        .substring(0, this.KEY_LENGTH);
    } catch (error) {
      logger.error('Error generating API key:', { error });
      throw error;
    }
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  maskSensitiveData(data: string): string {
    if (!data) return data;
    const visibleChars = 4;
    return '*'.repeat(data.length - visibleChars) + 
           data.slice(-visibleChars);
  }

  hashData(data: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  generateCSRFToken(): string {
    return SecurityUtils.generateRandomString(32);
  }

  verifyCSRFToken(token: string, storedToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken)
    );
  }
}

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}