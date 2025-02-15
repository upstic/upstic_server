import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

interface ImageCompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  progressive?: boolean;
  withMetadata?: boolean;
}

interface DocumentCompressionOptions {
  algorithm?: 'gzip' | 'brotli';
  level?: number;
}

interface CompressionOptions {
  image?: ImageCompressionOptions;
  document?: DocumentCompressionOptions;
  skipIfSizeBelow?: number;
  preserveOriginal?: boolean;
  outputDir?: string;
}

const defaultOptions: CompressionOptions = {
  image: {
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'webp',
    progressive: true,
    withMetadata: false
  },
  document: {
    algorithm: 'brotli',
    level: 4
  },
  skipIfSizeBelow: 10 * 1024, // 10KB
  preserveOriginal: false,
  outputDir: 'compressed'
};

export class FileCompressor {
  private options: CompressionOptions;

  constructor(options: CompressionOptions = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
      image: { ...defaultOptions.image, ...options.image },
      document: { ...defaultOptions.document, ...options.document }
    };
  }

  private async ensureOutputDir(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async compressImage(
    inputPath: string,
    outputPath: string,
    options: ImageCompressionOptions
  ): Promise<void> {
    try {
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      // Resize if needed while maintaining aspect ratio
      if (options.maxWidth || options.maxHeight) {
        image.resize(options.maxWidth, options.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Apply format-specific optimizations
      switch (options.format) {
        case 'jpeg':
          image.jpeg({
            quality: options.quality,
            progressive: options.progressive,
            mozjpeg: true
          });
          break;
        case 'png':
          image.png({
            progressive: options.progressive,
            compressionLevel: 9,
            palette: true
          });
          break;
        case 'webp':
          image.webp({
            quality: options.quality,
            effort: 6,
            nearLossless: true
          });
          break;
        case 'avif':
          image.avif({
            quality: options.quality,
            effort: 9,
            chromaSubsampling: '4:2:0'
          });
          break;
      }

      if (!options.withMetadata) {
        image.removeAlpha().removeMetadata();
      }

      await image.toFile(outputPath);

      // Log compression results
      const inputSize = (await fs.stat(inputPath)).size;
      const outputSize = (await fs.stat(outputPath)).size;
      const savings = ((inputSize - outputSize) / inputSize * 100).toFixed(2);

      logger.info('Image compression complete', {
        originalSize: inputSize,
        compressedSize: outputSize,
        savings: `${savings}%`,
        format: options.format
      });
    } catch (error) {
      throw new AppError(500, `Image compression failed: ${error.message}`);
    }
  }

  private async compressDocument(
    inputPath: string,
    outputPath: string,
    options: DocumentCompressionOptions
  ): Promise<void> {
    try {
      const input = await fs.readFile(inputPath);
      let compressed: Buffer;

      if (options.algorithm === 'brotli') {
        compressed = await brotli(input, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: options.level
          }
        });
      } else {
        compressed = await gzip(input, {
          level: options.level
        });
      }

      await fs.writeFile(outputPath, compressed);

      // Log compression results
      const inputSize = (await fs.stat(inputPath)).size;
      const outputSize = (await fs.stat(outputPath)).size;
      const savings = ((inputSize - outputSize) / inputSize * 100).toFixed(2);

      logger.info('Document compression complete', {
        originalSize: inputSize,
        compressedSize: outputSize,
        savings: `${savings}%`,
        algorithm: options.algorithm
      });
    } catch (error) {
      throw new AppError(500, `Document compression failed: ${error.message}`);
    }
  }

  private async shouldCompress(filePath: string): Promise<boolean> {
    if (!this.options.skipIfSizeBelow) return true;
    const stats = await fs.stat(filePath);
    return stats.size > this.options.skipIfSizeBelow;
  }

  private getOutputPath(file: Express.Multer.File): string {
    const outputDir = this.options.outputDir || 'compressed';
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    
    // For images, use the specified format extension
    if (this.isImage(file.mimetype)) {
      return path.join(outputDir, `${basename}.${this.options.image?.format}`);
    }
    
    // For documents, append compression algorithm
    if (this.isDocument(file.mimetype)) {
      return path.join(outputDir, `${basename}${ext}.${this.options.document?.algorithm}`);
    }

    return path.join(outputDir, file.originalname);
  }

  private isImage(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  private isDocument(mimetype: string): boolean {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ].includes(mimetype);
  }

  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file && !req.files) {
          return next();
        }

        await this.ensureOutputDir(this.options.outputDir!);

        const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [];
        if (req.file) files.push(req.file);

        for (const file of files) {
          if (!(await this.shouldCompress(file.path))) {
            continue;
          }

          const outputPath = this.getOutputPath(file);

          if (this.isImage(file.mimetype)) {
            await this.compressImage(file.path, outputPath, this.options.image!);
          } else if (this.isDocument(file.mimetype)) {
            await this.compressDocument(file.path, outputPath, this.options.document!);
          }

          // Update file information
          if (!this.options.preserveOriginal) {
            await fs.unlink(file.path);
          }
          file.path = outputPath;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

// Create instances with different configurations
export const imageCompressor = new FileCompressor({
  image: {
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'webp',
    progressive: true
  },
  skipIfSizeBelow: 50 * 1024 // 50KB
});

export const documentCompressor = new FileCompressor({
  document: {
    algorithm: 'brotli',
    level: 6
  },
  skipIfSizeBelow: 100 * 1024 // 100KB
});

export const highQualityImageCompressor = new FileCompressor({
  image: {
    quality: 90,
    maxWidth: 3840,
    maxHeight: 2160,
    format: 'avif',
    progressive: true,
    withMetadata: true
  }
}); 