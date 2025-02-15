import { TwoFactorAuth, TwoFactorMethod, BackupCodeStatus, ITwoFactorAuth } from '../models/TwoFactorAuth';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { generateTOTP, verifyTOTP } from '../utils/totp';
import { encrypt, decrypt } from '../utils/encryption';
import { generateRandomCode } from '../utils/code-generator';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';
import QRCode from 'qrcode';

export class TwoFactorAuthService {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly BACKUP_CODES_COUNT = 10;
  private static readonly CODE_EXPIRY = 10 * 60; // 10 minutes

  static async setup2FA(
    userId: string,
    method: TwoFactorMethod
  ): Promise<{ secret?: string; qrCode?: string; backupCodes?: string[] }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    let twoFactorAuth = await TwoFactorAuth.findOne({ userId });
    if (!twoFactorAuth) {
      twoFactorAuth = new TwoFactorAuth({
        userId,
        preferredMethod: method
      });
    }

    const result: any = {};

    switch (method) {
      case TwoFactorMethod.APP:
        const { secret, qrCode } = await this.setupAuthenticatorApp(user.email);
        twoFactorAuth.secret = await encrypt(secret);
        result.secret = secret;
        result.qrCode = qrCode;
        break;

      case TwoFactorMethod.SMS:
        await this.validatePhoneNumber(user.phone);
        twoFactorAuth.phoneNumber = user.phone;
        break;

      case TwoFactorMethod.EMAIL:
        twoFactorAuth.recoveryEmail = user.email;
        break;
    }

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes();
    twoFactorAuth.backupCodes = backupCodes.map(code => ({
      code: encrypt(code),
      status: BackupCodeStatus.UNUSED
    }));

    await twoFactorAuth.save();
    result.backupCodes = backupCodes;

    return result;
  }

  static async verify2FA(
    userId: string,
    code: string,
    requestInfo: {
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<boolean> {
    const twoFactorAuth = await TwoFactorAuth.findOne({ userId }).select('+secret +backupCodes.code');
    if (!twoFactorAuth) {
      throw new AppError(404, '2FA not set up');
    }

    // Check for too many attempts
    if (await this.hasExceededAttempts(userId)) {
      throw new AppError(429, 'Too many attempts. Please try again later.');
    }

    let isValid = false;

    try {
      switch (twoFactorAuth.preferredMethod) {
        case TwoFactorMethod.APP:
          isValid = await this.verifyAuthenticatorCode(
            await decrypt(twoFactorAuth.secret!),
            code
          );
          break;

        case TwoFactorMethod.SMS:
        case TwoFactorMethod.EMAIL:
          isValid = await this.verifyTemporaryCode(userId, code);
          break;
      }

      // Check backup codes if regular verification fails
      if (!isValid) {
        isValid = await this.verifyBackupCode(twoFactorAuth, code);
      }

      // Record attempt
      await this.recordAttempt(twoFactorAuth, isValid, requestInfo);

      if (isValid) {
        twoFactorAuth.lastVerified = new Date();
        await twoFactorAuth.save();
      }

      return isValid;
    } catch (error) {
      logger.error('2FA verification error', { userId, error: error.message });
      throw new AppError(500, 'Verification failed');
    }
  }

  static async sendTemporaryCode(
    userId: string,
    method: TwoFactorMethod
  ): Promise<void> {
    const twoFactorAuth = await TwoFactorAuth.findOne({ userId });
    if (!twoFactorAuth) {
      throw new AppError(404, '2FA not set up');
    }

    const code = generateRandomCode(6);
    const expiresAt = new Date(Date.now() + this.CODE_EXPIRY * 1000);

    // Store temporary code
    twoFactorAuth.temporarySecrets.push({
      secret: await encrypt(code),
      expiresAt
    });
    await twoFactorAuth.save();

    // Send code via preferred method
    switch (method) {
      case TwoFactorMethod.SMS:
        await notificationService.send({
          userId,
          title: '2FA Code',
          body: `Your verification code is: ${code}`,
          type: '2FA_CODE',
          channels: ['SMS']
        });
        break;

      case TwoFactorMethod.EMAIL:
        await notificationService.send({
          userId,
          title: '2FA Code',
          body: `Your verification code is: ${code}`,
          type: '2FA_CODE',
          channels: ['EMAIL']
        });
        break;
    }
  }

  private static async setupAuthenticatorApp(
    email: string
  ): Promise<{ secret: string; qrCode: string }> {
    const secret = generateTOTP();
    const otpauth = `otpauth://totp/${encodeURIComponent(email)}?secret=${secret}&issuer=YourApp`;
    const qrCode = await QRCode.toDataURL(otpauth);

    return { secret, qrCode };
  }

  private static async generateBackupCodes(): Promise<string[]> {
    const codes = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      codes.push(generateRandomCode(10));
    }
    return codes;
  }

  private static async verifyAuthenticatorCode(
    secret: string,
    code: string
  ): Promise<boolean> {
    return verifyTOTP(secret, code);
  }

  private static async verifyTemporaryCode(
    userId: string,
    code: string
  ): Promise<boolean> {
    const twoFactorAuth = await TwoFactorAuth.findOne({
      userId,
      'temporarySecrets.expiresAt': { $gt: new Date() }
    });

    if (!twoFactorAuth) return false;

    const temporarySecret = twoFactorAuth.temporarySecrets.find(
      async secret => await decrypt(secret.secret) === code
    );

    if (temporarySecret) {
      // Remove used temporary secret
      await TwoFactorAuth.updateOne(
        { userId },
        { $pull: { temporarySecrets: { secret: temporarySecret.secret } } }
      );
      return true;
    }

    return false;
  }

  private static async verifyBackupCode(
    twoFactorAuth: ITwoFactorAuth,
    code: string
  ): Promise<boolean> {
    const backupCode = twoFactorAuth.backupCodes.find(
      async bc => await decrypt(bc.code) === code && bc.status === BackupCodeStatus.UNUSED
    );

    if (backupCode) {
      backupCode.status = BackupCodeStatus.USED;
      backupCode.usedAt = new Date();
      await twoFactorAuth.save();
      return true;
    }

    return false;
  }

  private static async hasExceededAttempts(
    userId: string
  ): Promise<boolean> {
    const recentAttempts = await TwoFactorAuth.aggregate([
      { $match: { userId } },
      { $unwind: '$attempts' },
      {
        $match: {
          'attempts.timestamp': {
            $gte: new Date(Date.now() - this.ATTEMPT_WINDOW)
          }
        }
      },
      { $count: 'total' }
    ]);

    return recentAttempts[0]?.total >= this.MAX_ATTEMPTS;
  }

  private static async recordAttempt(
    twoFactorAuth: ITwoFactorAuth,
    success: boolean,
    requestInfo: {
      ipAddress: string;
      userAgent: string;
    }
  ): Promise<void> {
    twoFactorAuth.attempts.push({
      timestamp: new Date(),
      success,
      method: twoFactorAuth.preferredMethod,
      ...requestInfo
    });

    // Keep only recent attempts
    twoFactorAuth.attempts = twoFactorAuth.attempts.filter(
      attempt => attempt.timestamp.getTime() > Date.now() - this.ATTEMPT_WINDOW
    );

    await twoFactorAuth.save();
  }

  private static async validatePhoneNumber(phone: string): Promise<void> {
    // Implement phone number validation logic
    if (!phone) {
      throw new AppError(400, 'Valid phone number required for SMS 2FA');
    }
  }
} 