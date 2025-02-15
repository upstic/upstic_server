import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';
import { FileCompressor } from './fileCompression/algorithms';
import { QualityAnalyzer } from './fileCompression/quality';

interface FileHandlerConfig {
  maxSize: number;
  allowedTypes: string[];
  destination: string;
  compressImages?: boolean;
  validateContent?: boolean;
}

export class FileHandler {
  private config: FileHandlerConfig;
  private upload: multer.Multer;

  constructor(config: FileHandlerConfig) {
    this.config = config;
    this.upload = this.configureMulter();
  }

  private configureMulter(): multer.Multer {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await fs.mkdir(this.config.destination, { recursive: true });
          cb(null, this.config.destination);
        } catch (error) {
          cb(error as Error, this.config.destination);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
      }
    });

    return multer({
      storage,
      limits: {
        fileSize: this.config.maxSize,
        files: 5 // Maximum number of files
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  private fileFilter(
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void {
    if (!this.config.allowedTypes.includes(file.mimetype)) {
      cb(new AppError(400, `File type ${file.mimetype} is not allowed`));
      return;
    }

    cb(null, true);
  }

  private async validateFileContent(file: Express.Multer.File): Promise<void> {
    try {
      const buffer = await fs.readFile(file.path);
      
      // Check for malicious content
      const signatures = [
        Buffer.from('4D5A'), // EXE
        Buffer.from('504B0304'), // ZIP
        Buffer.from('CAFEBABE'), // Java class
      ];

      for (const signature of signatures) {
        if (buffer.includes(signature)) {
          throw new AppError(400, 'Potentially malicious file detected');
        }
      }

      // Validate file structure
      if (file.mimetype.startsWith('image/')) {
        await this.validateImage(file);
      }
    } catch (error) {
      await this.cleanup(file.path);
      throw error;
    }
  }

  private async validateImage(file: Express.Multer.File): Promise<void> {
    if (this.config.compressImages) {
      const compressor = new FileCompressor();
      const result = await compressor.compressImage(file.path, {
        quality: 80,
        maxWidth: 2000,
        maxHeight: 2000
      });

      const quality = await QualityAnalyzer.analyzeImage(file.path, result.outputPath);
      if (quality.qualityScore < 0.7) {
        throw new AppError(400, 'Image quality is too low');
      }
    }
  }

  private async cleanup(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.error('Error cleaning up file:', error);
    }
  }

  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Handle file upload
        await new Promise((resolve, reject) => {
          this.upload.array('files')(req, res, (error) => {
            if (error) reject(error);
            else resolve(undefined);
          });
        });

        if (!req.files?.length) {
          return next();
        }

        // Validate each file
        const files = Array.isArray(req.files) ? req.files : [req.files];
        for (const file of files) {
          if (this.config.validateContent) {
            await this.validateFileContent(file);
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

// Create instances for different file types
export const imageHandler = new FileHandler({
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
  destination: 'uploads/images',
  compressImages: true,
  validateContent: true
});

export const documentHandler = new FileHandler({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  destination: 'uploads/documents',
  validateContent: true
}); 