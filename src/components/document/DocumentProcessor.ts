import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { StorageService } from '../../services/storage.service';
import { OCRService } from '../../services/ocr.service';
import { ValidationService } from '../../services/validation.service';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class DocumentProcessor {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly SUPPORTED_FORMATS = [
    'pdf', 'doc', 'docx', 'txt', 'rtf',
    'jpg', 'jpeg', 'png', 'tiff'
  ];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(
    @InjectModel('Document') private documentModel: Model<any>,
    @InjectModel('Template') private templateModel: Model<any>,
    @InjectModel('ProcessingJob') private jobModel: Model<any>,
    private storageService: StorageService,
    private ocrService: OCRService,
    private validationService: ValidationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async processDocument(
    input: DocumentInput
  ): Promise<DocumentResponse> {
    try {
      // Validate input
      await this.validateDocument(input);

      // Create processing job
      const job = await this.jobModel.create({
        ...input,
        status: 'pending',
        createdAt: new Date()
      });

      // Process document asynchronously
      this.processDocumentJob(job).catch(error => {
        this.logger.error('Error processing document:', error);
        this.updateJobStatus(job._id, 'failed', error.message);
      });

      return {
        success: true,
        jobId: job._id,
        message: 'Document processing initiated'
      };
    } catch (error) {
      this.logger.error('Error initiating document processing:', error);
      throw error;
    }
  }

  async getProcessingStatus(
    jobId: string
  ): Promise<ProcessingStatus> {
    const cacheKey = `document:status:${jobId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const job = await this.jobModel.findById(jobId);
    if (!job) {
      throw new Error('Processing job not found');
    }

    const status = await this.calculateProcessingStatus(job);
    await this.cacheService.set(cacheKey, status, this.CACHE_TTL);

    return status;
  }

  async extractDocumentData(
    jobId: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResponse> {
    try {
      const job = await this.jobModel.findById(jobId);
      if (!job || job.status !== 'completed') {
        throw new Error('Document not ready for data extraction');
      }

      const document = await this.documentModel.findById(job.documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Extract data based on template or options
      const extractedData = await this.extractData(
        document,
        options
      );

      // Validate extracted data
      const validatedData = await this.validateExtractedData(
        extractedData,
        options?.validationRules
      );

      return {
        success: true,
        data: validatedData,
        confidence: this.calculateConfidence(extractedData)
      };
    } catch (error) {
      this.logger.error('Error extracting document data:', error);
      throw error;
    }
  }

  private async processDocumentJob(
    job: any
  ): Promise<void> {
    try {
      // Update job status
      await this.updateJobStatus(job._id, 'processing');

      // Download document if URL provided
      const file = job.fileUrl
        ? await this.downloadDocument(job.fileUrl)
        : job.file;

      // Process document based on type
      const processedDocument = await this.processFile(
        file,
        job.type,
        job.options
      );

      // Store processed document
      const documentId = await this.storeDocument(
        processedDocument,
        job
      );

      // Extract text if needed
      if (job.options?.extractText) {
        await this.extractAndStoreText(documentId, processedDocument);
      }

      // Update job status
      await this.updateJobStatus(
        job._id,
        'completed',
        null,
        { documentId }
      );

    } catch (error) {
      this.logger.error('Error processing document job:', error);
      await this.updateJobStatus(job._id, 'failed', error.message);
      throw error;
    }
  }

  private async processFile(
    file: any,
    type: string,
    options?: ProcessingOptions
  ): Promise<ProcessedDocument> {
    switch (type) {
      case 'image':
        return this.processImage(file, options);
      case 'pdf':
        return this.processPDF(file, options);
      case 'document':
        return this.processTextDocument(file, options);
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }

  private async extractData(
    document: any,
    options?: ExtractionOptions
  ): Promise<ExtractedData> {
    let template;
    if (options?.templateId) {
      template = await this.templateModel.findById(options.templateId);
      if (!template) {
        throw new Error('Template not found');
      }
    }

    const extractors = this.getExtractors(document.type, template);
    const extractedData: ExtractedData = {};

    for (const extractor of extractors) {
      const data = await extractor.extract(document.content);
      Object.assign(extractedData, data);
    }

    return extractedData;
  }

  private async validateExtractedData(
    data: ExtractedData,
    rules?: ValidationRules
  ): Promise<ValidatedData> {
    if (!rules) return data;

    const validatedData: ValidatedData = {};
    const errors: ValidationError[] = [];

    for (const [field, value] of Object.entries(data)) {
      const fieldRules = rules[field];
      if (!fieldRules) continue;

      try {
        validatedData[field] = await this.validationService.validate(
          value,
          fieldRules
        );
      } catch (error) {
        errors.push({
          field,
          value,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationErrors('Data validation failed', errors);
    }

    return validatedData;
  }

  private calculateConfidence(
    data: ExtractedData
  ): number {
    const confidenceScores = Object.values(data)
      .filter(value => value.confidence !== undefined)
      .map(value => value.confidence);

    if (confidenceScores.length === 0) return 1;

    return confidenceScores.reduce((sum, score) => sum + score, 0) /
      confidenceScores.length;
  }
}

interface DocumentInput {
  file?: Buffer;
  fileUrl?: string;
  type: 'image' | 'pdf' | 'document';
  options?: ProcessingOptions;
  metadata?: Record<string, any>;
}

interface ProcessingOptions {
  extractText?: boolean;
  ocrOptions?: {
    language?: string;
    enhanced?: boolean;
  };
  compression?: {
    enabled: boolean;
    quality?: number;
  };
  output?: {
    format?: string;
    dpi?: number;
  };
}

interface DocumentResponse {
  success: boolean;
  jobId: string;
  message: string;
}

interface ProcessingStatus {
  status: string;
  progress?: number;
  error?: string;
  documentId?: string;
  metadata?: Record<string, any>;
}

interface ExtractionOptions {
  templateId?: string;
  fields?: string[];
  validationRules?: ValidationRules;
}

interface ExtractionResponse {
  success: boolean;
  data: ValidatedData;
  confidence: number;
}

interface ProcessedDocument {
  content: any;
  metadata: {
    type: string;
    size: number;
    pages?: number;
    words?: number;
    language?: string;
  };
  extracted?: {
    text?: string;
    data?: Record<string, any>;
  };
}

interface ExtractedData {
  [key: string]: {
    value: any;
    confidence?: number;
    metadata?: Record<string, any>;
  };
}

interface ValidationRules {
  [field: string]: {
    type: string;
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
    options?: any[];
  };
}

interface ValidationError {
  field: string;
  value: any;
  error: string;
}

class ValidationErrors extends Error {
  constructor(
    message: string,
    public errors: ValidationError[]
  ) {
    super(message);
  }
} 