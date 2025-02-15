import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import path from 'path';
import crypto from 'crypto';
import fileType from 'file-type';
import { promises as fs } from 'fs';
import { logger } from '../utils/logger';

interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  scanForMalware?: boolean;
  sanitizeFilename?: boolean;
  validateContentType?: boolean;
}

const defaultOptions: FileValidationOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.pdf', 
    '.doc', '.docx', '.xls', '.xlsx'
  ],
  scanForMalware: true,
  sanitizeFilename: true,
  validateContentType: true
};

export class FileUploadSanitizer {
  private options: FileValidationOptions;

  constructor(options: FileValidationOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  // Sanitize filename
  private sanitizeFilename(filename: string): string {
    if (!this.options.sanitizeFilename) return filename;

    // Remove any directory traversal attempts
    const sanitized = path.basename(filename);

    // Replace any non-alphanumeric characters (except for dots and dashes)
    return sanitized
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
  }

  // Generate secure filename
  private generateSecureFilename(originalname: string): string {
    const ext = path.extname(originalname);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  // Validate file size
  private validateFileSize(size: number): void {
    if (this.options.maxSize && size > this.options.maxSize) {
      throw new AppError(400, `File size exceeds maximum limit of ${this.options.maxSize} bytes`);
    }
  }

  // Validate file extension
  private validateFileExtension(filename: string): void {
    if (!this.options.allowedExtensions) return;

    const ext = path.extname(filename).toLowerCase();
    if (!this.options.allowedExtensions.includes(ext)) {
      throw new AppError(400, `File extension '${ext}' is not allowed`);
    }
  }

  // Validate MIME type
  private async validateMimeType(filepath: string): Promise<void> {
    if (!this.options.validateContentType) return;

    try {
      const fileInfo = await fileType.fromFile(filepath);
      
      if (!fileInfo) {
        throw new AppError(400, 'Could not determine file type');
      }

      if (!this.options.allowedMimeTypes?.includes(fileInfo.mime)) {
        throw new AppError(400, `File type '${fileInfo.mime}' is not allowed`);
      }
    } catch (error) {
      throw new AppError(400, 'Invalid file type');
    }
  }

  // Scan for malware (basic implementation - you'd want to integrate with a real antivirus solution)
  private async scanForMalware(filepath: string): Promise<void> {
    if (!this.options.scanForMalware) return;

    try {
      const fileContent = await fs.readFile(filepath);
      const knownMalwareSignatures = [
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
        // Add more signatures as needed
      ];

      const fileString = fileContent.toString();
      for (const signature of knownMalwareSignatures) {
        if (fileString.includes(signature)) {
          throw new AppError(400, 'Potential malware detected');
        }
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Error scanning file');
    }
  }

  // Check for executable content
  private async checkForExecutableContent(filepath: string): Promise<void> {
    try {
      const buffer = await fs.readFile(filepath);
      const executableSignatures = [
        Buffer.from('4D5A'), // MZ (DOS/PE)
        Buffer.from('7F454C46'), // ELF
        Buffer.from('CAFEBABE'), // Java class
        Buffer.from('504B0304'), // ZIP (potential executable content)
      ];

      for (const signature of executableSignatures) {
        if (buffer.includes(signature)) {
          throw new AppError(400, 'Executable content detected');
        }
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Error checking file content');
    }
  }

  // Main middleware function
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file && !req.files) {
          return next();
        }

        const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [];
        if (req.file) files.push(req.file);

        for (const file of files) {
          // Validate file size
          this.validateFileSize(file.size);

          // Original filename sanitization
          const originalName = this.sanitizeFilename(file.originalname);
          
          // Generate secure filename
          const secureFilename = this.generateSecureFilename(originalName);
          
          // Validate file extension
          this.validateFileExtension(originalName);
          
          // Validate MIME type
          await this.validateMimeType(file.path);
          
          // Scan for malware
          await this.scanForMalware(file.path);
          
          // Check for executable content
          await this.checkForExecutableContent(file.path);

          // Update file information
          file.originalname = originalName;
          file.filename = secureFilename;

          // Move file to new location with secure filename
          const newPath = path.join(path.dirname(file.path), secureFilename);
          await fs.rename(file.path, newPath);
          file.path = newPath;
        }

        next();
      } catch (error) {
        // Clean up uploaded files in case of error
        const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [];
        if (req.file) files.push(req.file);

        await Promise.all(files.map(file => 
          fs.unlink(file.path).catch(err => 
            logger.error('Error deleting file:', { error: err, file: file.path })
          )
        ));

        next(error);
      }
    };
  }
}

// Create instances with different configurations
export const defaultFileUploadSanitizer = new FileUploadSanitizer();

export const imageUploadSanitizer = new FileUploadSanitizer({
  maxSize: 2 * 1024 * 1024, // 2MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif']
});

export const documentUploadSanitizer = new FileUploadSanitizer({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx']
}); 