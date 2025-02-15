import * as crypto from 'crypto';

export class CryptoUtil {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly ivLength = 16;
  private static readonly saltLength = 64;
  private static readonly tagLength = 16;
  private static readonly tagPosition = CryptoUtil.saltLength + CryptoUtil.ivLength;
  private static readonly encryptedPosition = CryptoUtil.tagPosition + CryptoUtil.tagLength;

  static async hash(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(data, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  static async verify(data: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');
      crypto.scrypt(data, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  }

  static encrypt(text: string, masterKey: string): string {
    const salt = crypto.randomBytes(CryptoUtil.saltLength);
    const iv = crypto.randomBytes(CryptoUtil.ivLength);
    const key = crypto.scryptSync(masterKey, salt, 32);
    const cipher = crypto.createCipheriv(CryptoUtil.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, tag, encrypted]).toString('hex');
  }

  static decrypt(encdata: string, masterKey: string): string {
    const stringData = Buffer.from(encdata, 'hex');
    const salt = stringData.slice(0, CryptoUtil.saltLength);
    const iv = stringData.slice(CryptoUtil.saltLength, CryptoUtil.tagPosition);
    const tag = stringData.slice(CryptoUtil.tagPosition, CryptoUtil.encryptedPosition);
    const encrypted = stringData.slice(CryptoUtil.encryptedPosition);
    const key = crypto.scryptSync(masterKey, salt, 32);
    const decipher = crypto.createDecipheriv(CryptoUtil.algorithm, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
