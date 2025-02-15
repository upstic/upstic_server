import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File } from '../models/File';
import { FileCompression } from '../middleware/fileCompression/adaptive';
import { Logger } from '../utils/logger';
import { createHash } from 'crypto';
import * as mime from 'mime-types';
import * as path from 'path';

@Injectable()
export class FileUploadService {
  private s3: S3;
  private fileCompression: FileCompression;
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    private configService: ConfigService,
    private logger: Logger
  ) {
    this.initializeS3();
    this.fileCompression = new FileCompression();
  }

  private initializeS3() {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION')
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions
  ): Promise<FileUploadResult> {
    try {
      await this.validateFile(file);

      const fileHash = this.generateFileHash(file.buffer);
      const existingFile = await this.findDuplicateFile(fileHash, options.userId);

      if (existingFile && !options.allowDuplicates) {
        return {
          success: true,
          fileId: existingFile._id,
          url: existingFile.url,
          isDuplicate: true
        };
      }

      const compressedBuffer = await this.compressFile(file);
      const key = this.generateFileKey(file, options);
      const uploadResult = await this.uploadToS3(compressedBuffer, key, file.mimetype);

      const fileDoc = await this.saveFileRecord({
        userId: options.userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        compressedSize: compressedBuffer.length,
        hash: fileHash,
        key,
        url: uploadResult.Location,
        category: options.category,
        metadata: options.metadata
      });

      return {
        success: true,
        fileId: fileDoc._id,
        url: fileDoc.url,
        isDuplicate: false
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    options: UploadOptions
  ): Promise<MultipleFileUploadResult> {
    const results = await Promise.allSettled(
      files.map(file => this.uploadFile(file, options))
    );

    return {
      totalFiles: files.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map((result, index) => ({
        filename: files[index].originalname,
        success: result.status === 'fulfilled',
        ...(result.status === 'fulfilled' ? result.value : { error: (result as PromiseRejectedResult).reason })
      }))
    };
  }

  private async validateFile(file: Express.Multer.File): Promise<void> {
    if (!file.buffer || !file.mimetype) {
      throw new Error('Invalid file');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error('Unsupported file type');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds limit');
    }
  }

  private generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async findDuplicateFile(hash: string, userId: string): Promise<File | null> {
    return this.fileModel.findOne({
      hash,
      userId,
      status: 'active'
    });
  }

  private async compressFile(file: Express.Multer.File): Promise<Buffer> {
    if (file.mimetype.startsWith('image/')) {
      return this.fileCompression.compressImage(file.buffer);
    }
    return file.buffer;
  }

  private generateFileKey(file: Express.Multer.File, options: UploadOptions): string {
    const timestamp = Date.now();
    const extension = mime.extension(file.mimetype);
    return `${options.category}/${options.userId}/${timestamp}-${this.generateRandomString(6)}.${extension}`;
  }

  private generateRandomString(length: number): string {
    return Math.random().toString(36).substring(2, length + 2);
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<S3.ManagedUpload.SendData> {
    const params = {
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private'
    };

    return this.s3.upload(params).promise();
  }

  private async saveFileRecord(fileData: FileData): Promise<File> {
    return this.fileModel.create({
      ...fileData,
      status: 'active',
      uploadedAt: new Date()
    });
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const file = await this.fileModel.findOne({ _id: fileId, userId });
      if (!file) {
        throw new Error('File not found');
      }

      await this.s3.deleteObject({
        Bucket: this.configService.get('AWS_S3_BUCKET'),
        Key: file.key
      }).promise();

      file.status = 'deleted';
      file.deletedAt = new Date();
      await file.save();

      return true;
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw error;
    }
  }

  async getSignedUrl(fileId: string, userId: string, expiresIn = 3600): Promise<string> {
    const file = await this.fileModel.findOne({ _id: fileId, userId, status: 'active' });
    if (!file) {
      throw new Error('File not found');
    }

    const params = {
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: file.key,
      Expires: expiresIn
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }
}

interface UploadOptions {
  userId: string;
  category: 'resume' | 'profile' | 'document' | 'other';
  allowDuplicates?: boolean;
  metadata?: Record<string, any>;
}

interface FileUploadResult {
  success: boolean;
  fileId: string;
  url: string;
  isDuplicate: boolean;
  error?: string;
}

interface MultipleFileUploadResult {
  totalFiles: number;
  successful: number;
  failed: number;
  results: Array<{
    filename: string;
    success: boolean;
    fileId?: string;
    url?: string;
    isDuplicate?: boolean;
    error?: string;
  }>;
}

interface FileData {
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  compressedSize: number;
  hash: string;
  key: string;
  url: string;
  category: string;
  metadata?: Record<string, any>;
} 