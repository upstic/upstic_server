import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../models/User';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class TwoFactorAuthComponent {
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 10;
  private readonly MAX_VERIFICATION_ATTEMPTS = 3;
  private readonly VERIFICATION_WINDOW = 1; // 30 seconds window

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
    private cacheService: CacheService,
    private logger: Logger
  ) {
    authenticator.options = {
      window: this.VERIFICATION_WINDOW
    };
  }

  async generateSecret(userId: string): Promise<TwoFactorSetupData> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(
        user.email,
        this.configService.get('APP_NAME'),
        secret
      );

      const qrCode = await toDataURL(otpauth);
      const backupCodes = this.generateBackupCodes();

      // Store temporarily until verified
      await this.cacheService.set(
        `2fa_setup:${userId}`,
        JSON.stringify({ secret, backupCodes }),
        300 // 5 minutes
      );

      return {
        secret,
        qrCode,
        backupCodes,
        otpauth
      };
    } catch (error) {
      this.logger.error('Error generating 2FA secret:', error);
      throw error;
    }
  }

  async verifyAndEnable(
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      const setupData = await this.cacheService.get(`2fa_setup:${userId}`);
      if (!setupData) {
        throw new Error('2FA setup data expired or not found');
      }

      const { secret, backupCodes } = JSON.parse(setupData);
      const isValid = authenticator.verify({
        token,
        secret
      });

      if (isValid) {
        await this.userModel.findByIdAndUpdate(userId, {
          twoFactorAuth: {
            enabled: true,
            secret,
            backupCodes,
            lastVerified: new Date()
          }
        });

        await this.cacheService.del(`2fa_setup:${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error verifying 2FA setup:', error);
      throw error;
    }
  }

  async verify(userId: string, token: string): Promise<VerificationResult> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user?.twoFactorAuth?.enabled) {
        throw new Error('2FA not enabled for user');
      }

      const attemptsKey = `2fa_attempts:${userId}`;
      const attempts = parseInt(await this.cacheService.get(attemptsKey) || '0');

      if (attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
        return {
          verified: false,
          error: 'Too many attempts. Please try again later.'
        };
      }

      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorAuth.secret
      });

      if (isValid) {
        await this.cacheService.del(attemptsKey);
        await this.userModel.findByIdAndUpdate(userId, {
          'twoFactorAuth.lastVerified': new Date()
        });

        return { verified: true };
      }

      // Track failed attempts
      await this.cacheService.set(
        attemptsKey,
        (attempts + 1).toString(),
        300 // 5 minutes
      );

      return {
        verified: false,
        error: 'Invalid verification code'
      };
    } catch (error) {
      this.logger.error('Error verifying 2FA token:', error);
      throw error;
    }
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user?.twoFactorAuth?.enabled) {
        throw new Error('2FA not enabled for user');
      }

      const backupCodes = user.twoFactorAuth.backupCodes;
      const codeIndex = backupCodes.indexOf(code);

      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await this.userModel.findByIdAndUpdate(userId, {
          'twoFactorAuth.backupCodes': backupCodes,
          'twoFactorAuth.lastVerified': new Date()
        });

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error verifying backup code:', error);
      throw error;
    }
  }

  async disable(userId: string, token: string): Promise<boolean> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user?.twoFactorAuth?.enabled) {
        throw new Error('2FA not enabled for user');
      }

      const isValid = authenticator.verify({
        token,
        secret: user.twoFactorAuth.secret
      });

      if (isValid) {
        await this.userModel.findByIdAndUpdate(userId, {
          $unset: { twoFactorAuth: 1 }
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      let code = '';
      for (let j = 0; j < this.BACKUP_CODE_LENGTH; j++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      codes.push(code);
    }

    return codes;
  }
}

interface TwoFactorSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  otpauth: string;
}

interface VerificationResult {
  verified: boolean;
  error?: string;
} 