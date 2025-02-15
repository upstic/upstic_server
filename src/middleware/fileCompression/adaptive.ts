import { promises as fs } from 'fs';
import sharp from 'sharp';
import fileType from 'file-type';
import { AppError } from '../errorHandler';
import { logger } from '../../utils/logger';
import { CompressionAlgorithm } from './algorithms';
import { QualityAnalyzer } from './quality';

interface CompressionResult {
  algorithm: string;
  originalSize: number;
  compressedSize: number;
  quality: number;
  duration: number;
}

export class AdaptiveCompression {
  private static instance: AdaptiveCompression;
  private qualityAnalyzer: QualityAnalyzer;
  private compressionHistory: Map<string, CompressionResult[]>;
  private readonly MIN_QUALITY_THRESHOLD = 0.8;
  private readonly MAX_COMPRESSION_TIME = 5000; // 5 seconds

  private constructor() {
    this.qualityAnalyzer = new QualityAnalyzer();
    this.compressionHistory = new Map();
  }

  static getInstance(): AdaptiveCompression {
    if (!AdaptiveCompression.instance) {
      AdaptiveCompression.instance = new AdaptiveCompression();
    }
    return AdaptiveCompression.instance;
  }

  async compress(file: Buffer, mimeType: string): Promise<Buffer> {
    try {
      const fileType = this.getFileType(mimeType);
      const algorithm = await this.selectOptimalAlgorithm(fileType, file.length);
      
      const startTime = Date.now();
      const compressedData = await algorithm.compress(file);
      const duration = Date.now() - startTime;

      const quality = await this.qualityAnalyzer.analyzeQuality(file, compressedData, mimeType);
      
      this.updateCompressionHistory(fileType, {
        algorithm: algorithm.name,
        originalSize: file.length,
        compressedSize: compressedData.length,
        quality,
        duration
      });

      if (quality < this.MIN_QUALITY_THRESHOLD) {
        logger.warn(`Low compression quality detected for ${fileType}. Using original file.`);
        return file;
      }

      return compressedData;
    } catch (error) {
      logger.error('Error in adaptive compression:', error);
      return file;
    }
  }

  private async selectOptimalAlgorithm(fileType: string, fileSize: number): Promise<CompressionAlgorithm> {
    const history = this.compressionHistory.get(fileType) || [];
    
    if (history.length === 0) {
      return this.getDefaultAlgorithm(fileType);
    }

    const recentResults = history.slice(-10);
    const bestResult = recentResults.reduce((best, current) => {
      const score = this.calculateAlgorithmScore(current);
      const bestScore = this.calculateAlgorithmScore(best);
      return score > bestScore ? current : best;
    });

    return new CompressionAlgorithm(bestResult.algorithm);
  }

  private calculateAlgorithmScore(result: CompressionResult): number {
    const compressionRatio = result.compressedSize / result.originalSize;
    const normalizedDuration = Math.min(result.duration / this.MAX_COMPRESSION_TIME, 1);
    
    // Weight factors
    const qualityWeight = 0.4;
    const ratioWeight = 0.4;
    const speedWeight = 0.2;

    return (
      result.quality * qualityWeight +
      (1 - compressionRatio) * ratioWeight +
      (1 - normalizedDuration) * speedWeight
    );
  }

  private getFileType(mimeType: string): string {
    const [type] = mimeType.split('/');
    return type;
  }

  private getDefaultAlgorithm(fileType: string): CompressionAlgorithm {
    switch (fileType) {
      case 'image':
        return new CompressionAlgorithm('imageCompression');
      case 'video':
        return new CompressionAlgorithm('videoCompression');
      case 'audio':
        return new CompressionAlgorithm('audioCompression');
      default:
        return new CompressionAlgorithm('genericCompression');
    }
  }

  private updateCompressionHistory(fileType: string, result: CompressionResult): void {
    const history = this.compressionHistory.get(fileType) || [];
    history.push(result);
    
    // Keep only last 100 compression results
    if (history.length > 100) {
      history.shift();
    }
    
    this.compressionHistory.set(fileType, history);
  }

  getCompressionStats(fileType: string): object {
    const history = this.compressionHistory.get(fileType) || [];
    if (history.length === 0) {
      return {
        totalCompressions: 0,
        averageQuality: 0,
        averageCompressionRatio: 0,
        averageDuration: 0
      };
    }

    const stats = history.reduce((acc, curr) => {
      return {
        totalCompressions: acc.totalCompressions + 1,
        averageQuality: acc.averageQuality + curr.quality,
        averageCompressionRatio: acc.averageCompressionRatio + (curr.compressedSize / curr.originalSize),
        averageDuration: acc.averageDuration + curr.duration
      };
    }, {
      totalCompressions: 0,
      averageQuality: 0,
      averageCompressionRatio: 0,
      averageDuration: 0
    });

    return {
      totalCompressions: stats.totalCompressions,
      averageQuality: stats.averageQuality / history.length,
      averageCompressionRatio: stats.averageCompressionRatio / history.length,
      averageDuration: stats.averageDuration / history.length
    };
  }

  static async analyzeContent(filePath: string) {
    const stats = await fs.stat(filePath);
    const fileInfo = await fileType.fromFile(filePath);
    const sampleBuffer = await fs.readFile(filePath, { length: 4096 });

    return {
      size: stats.size,
      mimeType: fileInfo?.mime,
      entropy: this.calculateEntropy(sampleBuffer),
      isCompressible: this.isLikelyCompressible(sampleBuffer)
    };
  }

  private static calculateEntropy(buffer: Buffer): number {
    const frequencies = new Array(256).fill(0);
    buffer.forEach(byte => frequencies[byte]++);
    
    return frequencies.reduce((entropy, freq) => {
      if (freq === 0) return entropy;
      const p = freq / buffer.length;
      return entropy - p * Math.log2(p);
    }, 0);
  }

  private static isLikelyCompressible(buffer: Buffer): boolean {
    // Check for repeated patterns
    const entropy = this.calculateEntropy(buffer);
    return entropy < 6.5; // Threshold based on empirical testing
  }

  static async determineOptimalCompression(filePath: string) {
    const analysis = await this.analyzeContent(filePath);
    
    // Default compression settings
    const settings = {
      algorithm: 'brotli',
      level: 4,
      quality: 80
    };

    if (!analysis.isCompressible) {
      logger.info('File detected as not highly compressible, using light compression');
      return { ...settings, level: 1 };
    }

    if (analysis.mimeType?.startsWith('image/')) {
      return this.determineImageCompression(analysis);
    }

    return this.determineDocumentCompression(analysis);
  }

  private static determineImageCompression(analysis: any) {
    const settings = {
      quality: 80,
      format: 'webp' as const
    };

    if (analysis.size > 5 * 1024 * 1024) { // 5MB
      settings.quality = 70;
    } else if (analysis.size < 100 * 1024) { // 100KB
      settings.quality = 90;
    }

    if (analysis.entropy < 5) {
      settings.format = 'png' as const;
    } else if (analysis.entropy > 7) {
      settings.format = 'avif' as const;
    }

    return settings;
  }

  private static determineDocumentCompression(analysis: any) {
    const settings = {
      algorithm: 'brotli',
      level: 4
    };

    if (analysis.entropy < 4) {
      settings.algorithm = 'lzma';
      settings.level = 9;
    } else if (analysis.entropy > 7) {
      settings.algorithm = 'gzip';
      settings.level = 6;
    }

    return settings;
  }
} 