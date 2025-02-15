import { promises as fs } from 'fs';
import sharp from 'sharp';
import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminGifsicle from 'imagemin-gifsicle';
import imageminSvgo from 'imagemin-svgo';
import zlib from 'zlib';
import { promisify } from 'util';
import { AppError } from '../errorHandler';
import { logger } from '../../utils/logger';
import { createBrotliCompress, createGzip, createDeflate } from 'zlib';
import { pipeline } from 'stream';

const deflate = promisify(zlib.deflate);
const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);
const lzma = require('lzma-native');
const pipe = promisify(pipeline);

export interface CompressionResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  duration: number;
}

export class CompressionAlgorithm {
  name: string;
  private readonly BROTLI_QUALITY = 11;
  private readonly GZIP_LEVEL = 9;
  private readonly DEFLATE_LEVEL = 9;
  private readonly IMAGE_QUALITY = 80;

  constructor(name: string) {
    this.name = name;
  }

  async compress(data: Buffer): Promise<Buffer> {
    try {
      switch (this.name) {
        case 'brotli':
          return await this.brotliCompress(data);
        case 'gzip':
          return await this.gzipCompress(data);
        case 'deflate':
          return await this.deflateCompress(data);
        case 'imageCompression':
          return await this.imageCompress(data);
        case 'videoCompression':
          return await this.videoCompress(data);
        case 'audioCompression':
          return await this.audioCompress(data);
        default:
          return await this.genericCompress(data);
      }
    } catch (error) {
      logger.error(`Compression error with algorithm ${this.name}:`, error);
      throw error;
    }
  }

  private async brotliCompress(data: Buffer): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const brotli = createBrotliCompress({
      params: {
        [Symbol.for('BROTLI_PARAM_QUALITY')]: this.BROTLI_QUALITY
      }
    });

    brotli.on('data', chunk => chunks.push(chunk));
    brotli.write(data);
    brotli.end();

    return Buffer.concat(chunks);
  }

  private async gzipCompress(data: Buffer): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const gzip = createGzip({ level: this.GZIP_LEVEL });

    gzip.on('data', chunk => chunks.push(chunk));
    gzip.write(data);
    gzip.end();

    return Buffer.concat(chunks);
  }

  private async deflateCompress(data: Buffer): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const deflate = createDeflate({ level: this.DEFLATE_LEVEL });

    deflate.on('data', chunk => chunks.push(chunk));
    deflate.write(data);
    deflate.end();

    return Buffer.concat(chunks);
  }

  private async imageCompress(data: Buffer): Promise<Buffer> {
    try {
      const image = sharp(data);
      const metadata = await image.metadata();

      if (!metadata.format) {
        throw new Error('Unknown image format');
      }

      switch (metadata.format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          return await image
            .jpeg({ quality: this.IMAGE_QUALITY })
            .toBuffer();
        case 'png':
          return await image
            .png({ quality: this.IMAGE_QUALITY })
            .toBuffer();
        case 'webp':
          return await image
            .webp({ quality: this.IMAGE_QUALITY })
            .toBuffer();
        default:
          return data;
      }
    } catch (error) {
      logger.error('Image compression error:', error);
      return data;
    }
  }

  private async videoCompress(data: Buffer): Promise<Buffer> {
    // Implement video compression logic
    // This would typically involve using ffmpeg or similar
    logger.info('Video compression not implemented yet');
    return data;
  }

  private async audioCompress(data: Buffer): Promise<Buffer> {
    // Implement audio compression logic
    // This would typically involve using ffmpeg or similar
    logger.info('Audio compression not implemented yet');
    return data;
  }

  private async genericCompress(data: Buffer): Promise<Buffer> {
    // For unknown file types, use Brotli as default
    return await this.brotliCompress(data);
  }
}

export class CompressionAlgorithms {
  // Advanced image compression using multiple algorithms
  static async compressImage(
    inputPath: string,
    outputPath: string,
    options: any
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = (await fs.stat(inputPath)).size;

    try {
      let buffer = await fs.readFile(inputPath);

      // Apply different compression techniques based on image type
      if (options.format === 'jpeg' || options.format === 'jpg') {
        buffer = await imagemin.buffer(buffer, {
          plugins: [
            imageminMozjpeg({
              quality: options.quality,
              progressive: true
            })
          ]
        });
      } else if (options.format === 'png') {
        buffer = await imagemin.buffer(buffer, {
          plugins: [
            imageminPngquant({
              quality: [options.quality / 100, Math.min((options.quality + 10) / 100, 1)],
              speed: 1
            })
          ]
        });
      } else if (options.format === 'gif') {
        buffer = await imagemin.buffer(buffer, {
          plugins: [
            imageminGifsicle({
              optimizationLevel: 3,
              colors: 128
            })
          ]
        });
      } else if (options.format === 'svg') {
        buffer = await imagemin.buffer(buffer, {
          plugins: [
            imageminSvgo({
              plugins: [
                { name: 'removeViewBox', active: false },
                { name: 'cleanupIDs', active: false }
              ]
            })
          ]
        });
      }

      // Additional optimization with Sharp
      const sharpInstance = sharp(buffer);
      
      if (options.format === 'webp') {
        await sharpInstance
          .webp({ quality: options.quality, effort: 6 })
          .toFile(outputPath);
      } else if (options.format === 'avif') {
        await sharpInstance
          .avif({ quality: options.quality, effort: 9 })
          .toFile(outputPath);
      } else {
        await fs.writeFile(outputPath, buffer);
      }

      const compressedSize = (await fs.stat(outputPath)).size;
      const duration = Date.now() - startTime;

      return {
        outputPath,
        originalSize,
        compressedSize,
        compressionRatio: originalSize / compressedSize,
        algorithm: `image-${options.format}`,
        duration
      };
    } catch (error) {
      throw new AppError(500, `Image compression failed: ${error.message}`);
    }
  }

  // Advanced document compression using multiple algorithms
  static async compressDocument(
    inputPath: string,
    outputPath: string,
    options: any
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = (await fs.stat(inputPath)).size;
    const input = await fs.readFile(inputPath);

    try {
      let compressed: Buffer;
      let algorithm: string;

      switch (options.algorithm) {
        case 'brotli':
          compressed = await brotli(input, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: options.level,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: originalSize
            }
          });
          algorithm = 'brotli';
          break;

        case 'gzip':
          compressed = await gzip(input, {
            level: options.level,
            memLevel: 9,
            strategy: zlib.constants.Z_RLE
          });
          algorithm = 'gzip';
          break;

        case 'deflate':
          compressed = await deflate(input, {
            level: options.level,
            memLevel: 9,
            strategy: zlib.constants.Z_RLE
          });
          algorithm = 'deflate';
          break;

        case 'lzma':
          compressed = await lzma.compress(input, {
            preset: options.level,
            check: lzma.CHECK_CRC32
          });
          algorithm = 'lzma';
          break;

        default:
          throw new AppError(400, 'Unsupported compression algorithm');
      }

      await fs.writeFile(outputPath, compressed);
      const compressedSize = (await fs.stat(outputPath)).size;
      const duration = Date.now() - startTime;

      return {
        outputPath,
        originalSize,
        compressedSize,
        compressionRatio: originalSize / compressedSize,
        algorithm,
        duration
      };
    } catch (error) {
      throw new AppError(500, `Document compression failed: ${error.message}`);
    }
  }
} 