import { promises as fs } from 'fs';
import sharp from 'sharp';
import ssim from 'ssim.js';
import psnr from 'psnr.js';
import { logger } from '../../utils/logger';
import { createHash } from 'crypto';

export interface QualityAnalysisResult {
  ssim: number;
  psnr: number;
  fileSize: number;
  compressionRatio: number;
  qualityScore: number;
}

export class QualityAnalyzer {
  private readonly SSIM_THRESHOLD = 0.95;
  private readonly PSNR_THRESHOLD = 30;
  private readonly HASH_SIMILARITY_THRESHOLD = 0.9;

  async analyzeQuality(original: Buffer, compressed: Buffer, mimeType: string): Promise<number> {
    try {
      const [type] = mimeType.split('/');
      
      switch (type) {
        case 'image':
          return await this.analyzeImageQuality(original, compressed);
        case 'video':
          return await this.analyzeVideoQuality(original, compressed);
        case 'audio':
          return await this.analyzeAudioQuality(original, compressed);
        default:
          return await this.analyzeGenericQuality(original, compressed);
      }
    } catch (error) {
      logger.error('Error analyzing quality:', error);
      return 1; // Return maximum quality on error to prevent data loss
    }
  }

  private async analyzeImageQuality(original: Buffer, compressed: Buffer): Promise<number> {
    try {
      const [originalImage, compressedImage] = await Promise.all([
        sharp(original).raw().toBuffer({ resolveWithObject: true }),
        sharp(compressed).raw().toBuffer({ resolveWithObject: true })
      ]);

      const ssimScore = await this.calculateSSIM(
        originalImage.data,
        compressedImage.data,
        originalImage.info.width,
        originalImage.info.height
      );

      const psnrScore = this.calculatePSNR(
        originalImage.data,
        compressedImage.data
      );

      // Weighted average of quality metrics
      return (ssimScore * 0.6 + (psnrScore / 100) * 0.4);
    } catch (error) {
      logger.error('Error analyzing image quality:', error);
      return 1;
    }
  }

  private async calculateSSIM(
    original: Buffer,
    compressed: Buffer,
    width: number,
    height: number
  ): Promise<number> {
    // Simplified SSIM implementation
    // In practice, you'd want to use a more sophisticated SSIM calculation
    let ssim = 0;
    const windowSize = 8;
    const L = 255; // Maximum pixel value

    for (let i = 0; i < original.length; i += windowSize) {
      const originalWindow = original.slice(i, i + windowSize);
      const compressedWindow = compressed.slice(i, i + windowSize);

      const muX = this.mean(originalWindow);
      const muY = this.mean(compressedWindow);
      const sigmaX = this.variance(originalWindow, muX);
      const sigmaY = this.variance(compressedWindow, muY);
      const sigmaXY = this.covariance(originalWindow, compressedWindow, muX, muY);

      const c1 = (0.01 * L) ** 2;
      const c2 = (0.03 * L) ** 2;

      const numerator = (2 * muX * muY + c1) * (2 * sigmaXY + c2);
      const denominator = (muX ** 2 + muY ** 2 + c1) * (sigmaX + sigmaY + c2);

      ssim += numerator / denominator;
    }

    return ssim / (original.length / windowSize);
  }

  private calculatePSNR(original: Buffer, compressed: Buffer): number {
    const mse = this.calculateMSE(original, compressed);
    if (mse === 0) return 100;

    const maxPixelValue = 255;
    return 20 * Math.log10(maxPixelValue / Math.sqrt(mse));
  }

  private calculateMSE(original: Buffer, compressed: Buffer): number {
    let sum = 0;
    const length = Math.min(original.length, compressed.length);

    for (let i = 0; i < length; i++) {
      sum += (original[i] - compressed[i]) ** 2;
    }

    return sum / length;
  }

  private async analyzeVideoQuality(original: Buffer, compressed: Buffer): Promise<number> {
    // Implement video quality analysis
    // This would typically involve frame-by-frame analysis
    logger.info('Video quality analysis not implemented yet');
    return this.analyzeGenericQuality(original, compressed);
  }

  private async analyzeAudioQuality(original: Buffer, compressed: Buffer): Promise<number> {
    // Implement audio quality analysis
    // This would typically involve frequency analysis
    logger.info('Audio quality analysis not implemented yet');
    return this.analyzeGenericQuality(original, compressed);
  }

  private async analyzeGenericQuality(original: Buffer, compressed: Buffer): Promise<number> {
    const originalHash = this.calculateHash(original);
    const compressedHash = this.calculateHash(compressed);
    
    return this.calculateHashSimilarity(originalHash, compressedHash);
  }

  private calculateHash(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private calculateHashSimilarity(hash1: string, hash2: string): number {
    let similarity = 0;
    const length = Math.min(hash1.length, hash2.length);

    for (let i = 0; i < length; i++) {
      if (hash1[i] === hash2[i]) {
        similarity++;
      }
    }

    return similarity / length;
  }

  private mean(data: Buffer): number {
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  }

  private variance(data: Buffer, mean: number): number {
    return data.reduce((sum, value) => sum + (value - mean) ** 2, 0) / data.length;
  }

  private covariance(data1: Buffer, data2: Buffer, mean1: number, mean2: number): number {
    let sum = 0;
    const length = Math.min(data1.length, data2.length);

    for (let i = 0; i < length; i++) {
      sum += (data1[i] - mean1) * (data2[i] - mean2);
    }

    return sum / length;
  }

  static async validateQuality(
    analysis: QualityAnalysisResult,
    threshold: number = 0.8
  ): Promise<boolean> {
    return analysis.qualityScore >= threshold;
  }

  static getQualityReport(analysis: QualityAnalysisResult): string {
    const quality = analysis.qualityScore >= 0.9 ? 'Excellent' :
                   analysis.qualityScore >= 0.8 ? 'Good' :
                   analysis.qualityScore >= 0.7 ? 'Fair' :
                   'Poor';

    return `
Quality Analysis Report:
-----------------------
Quality Level: ${quality}
SSIM: ${(analysis.ssim * 100).toFixed(2)}%
PSNR: ${analysis.psnr.toFixed(2)} dB
Compression Ratio: ${analysis.compressionRatio.toFixed(2)}x
File Size: ${(analysis.fileSize / 1024).toFixed(2)} KB
Overall Score: ${(analysis.qualityScore * 100).toFixed(2)}%
    `.trim();
  }
} 