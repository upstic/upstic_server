import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileUploadService } from '../../services/file-upload.service';
import { Logger } from '../../utils/logger';
import { SecurityUtils } from '../../utils/security';
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as ExcelJS from 'exceljs';
import { createWorker } from 'tesseract.js';

@Injectable()
export class DocumentHandler {
  private readonly ALLOWED_MIME_TYPES = {
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/tiff': ['tiff', 'tif']
  };

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly OCR_LANGUAGES = ['eng']; // Default OCR language

  constructor(
    @InjectModel('Document') private documentModel: Model<any>,
    private fileUploadService: FileUploadService,
    private configService: ConfigService,
    private securityUtils: SecurityUtils,
    private logger: Logger
  ) {}

  async processDocument(
    file: Express.Multer.File,
    options: DocumentProcessingOptions
  ): Promise<DocumentProcessingResult> {
    try {
      // Validate file
      await this.validateFile(file);

      // Upload file to storage
      const uploadResult = await this.fileUploadService.uploadFile(file);

      // Extract text content based on file type
      const textContent = await this.extractTextContent(file);

      // Perform OCR if needed and specified
      let ocrText = null;
      if (options.performOcr && this.shouldPerformOcr(file.mimetype)) {
        ocrText = await this.performOcr(file.buffer);
      }

      // Store document metadata
      const document = await this.storeDocument({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: uploadResult.url,
        textContent,
        ocrText,
        metadata: options.metadata,
        userId: options.userId
      });

      return {
        documentId: document.id,
        url: uploadResult.url,
        textContent,
        ocrText,
        metadata: document.metadata
      };
    } catch (error) {
      this.logger.error('Error processing document:', error);
      throw error;
    }
  }

  async extractTextContent(file: Express.Multer.File): Promise<string> {
    try {
      switch (file.mimetype) {
        case 'application/pdf':
          const pdfData = await pdf(file.buffer);
          return pdfData.text;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          const { value } = await mammoth.extractRawText({ buffer: file.buffer });
          return value;

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          return await this.extractExcelContent(file.buffer);

        default:
          return '';
      }
    } catch (error) {
      this.logger.error('Error extracting text content:', error);
      return '';
    }
  }

  private async extractExcelContent(buffer: Buffer): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    let content = '';
    workbook.worksheets.forEach(worksheet => {
      worksheet.eachRow(row => {
        content += row.values.slice(1).join(' ') + '\n';
      });
    });
    
    return content;
  }

  private async performOcr(buffer: Buffer): Promise<string> {
    const worker = await createWorker();
    await worker.loadLanguage(this.OCR_LANGUAGES[0]);
    await worker.initialize(this.OCR_LANGUAGES[0]);
    
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    
    return text;
  }

  private async validateFile(file: Express.Multer.File): Promise<void> {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum limit');
    }

    if (!this.ALLOWED_MIME_TYPES[file.mimetype]) {
      throw new Error('File type not supported');
    }
  }

  private shouldPerformOcr(mimeType: string): boolean {
    return ['image/jpeg', 'image/png', 'image/tiff'].includes(mimeType);
  }

  private async storeDocument(data: DocumentData): Promise<any> {
    const document = await this.documentModel.create({
      ...data,
      status: 'processed',
      processedAt: new Date(),
      hash: this.securityUtils.hashData(data.textContent || '')
    });

    return document;
  }

  async searchDocuments(
    query: DocumentSearchQuery
  ): Promise<DocumentSearchResult> {
    const { keyword, userId, metadata, page = 1, limit = 10 } = query;

    const searchCriteria: any = {};
    if (keyword) {
      searchCriteria.$text = { $search: keyword };
    }
    if (userId) {
      searchCriteria.userId = userId;
    }
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        searchCriteria[`metadata.${key}`] = value;
      });
    }

    const [documents, total] = await Promise.all([
      this.documentModel
        .find(searchCriteria)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.documentModel.countDocuments(searchCriteria)
    ]);

    return {
      documents,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

interface DocumentProcessingOptions {
  userId: string;
  performOcr?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

interface DocumentProcessingResult {
  documentId: string;
  url: string;
  textContent: string;
  ocrText?: string;
  metadata?: Record<string, any>;
}

interface DocumentData {
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  textContent?: string;
  ocrText?: string;
  metadata?: Record<string, any>;
  userId: string;
}

interface DocumentSearchQuery {
  keyword?: string;
  userId?: string;
  metadata?: Record<string, any>;
  page?: number;
  limit?: number;
}

interface DocumentSearchResult {
  documents: any[];
  total: number;
  page: number;
  totalPages: number;
} 