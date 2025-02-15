import { promises as fs } from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { CompressionResult } from './algorithms';
import { logger } from '../../utils/logger';
import { AppError } from '../errorHandler';

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  results: CompressionResult[];
}

export class BatchProcessor {
  private readonly maxWorkers: number;
  private progress: BatchProgress;
  private readonly statusCallback?: (progress: BatchProgress) => void;

  constructor(maxWorkers = 4, statusCallback?: (progress: BatchProgress) => void) {
    this.maxWorkers = maxWorkers;
    this.statusCallback = statusCallback;
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      results: []
    };
  }

  async processBatch(
    files: Express.Multer.File[],
    outputDir: string,
    compressionOptions: any
  ): Promise<CompressionResult[]> {
    this.progress.total = files.length;
    this.progress.completed = 0;
    this.progress.failed = 0;
    this.progress.results = [];

    // Create worker pool
    const workerPool = new Array(Math.min(this.maxWorkers, files.length))
      .fill(null)
      .map(() => this.createWorker());

    try {
      // Split files into chunks for workers
      const chunks = this.chunkArray(files, workerPool.length);
      
      const results = await Promise.all(
        chunks.map((chunk, index) =>
          this.processChunk(chunk, workerPool[index], outputDir, compressionOptions)
        )
      );

      return results.flat();
    } finally {
      // Terminate all workers
      await Promise.all(workerPool.map(worker => worker.terminate()));
    }
  }

  private createWorker(): Worker {
    return new Worker(path.join(__dirname, 'compression.worker.js'));
  }

  private chunkArray<T>(array: T[], chunks: number): T[][] {
    const result: T[][] = [];
    const chunkSize = Math.ceil(array.length / chunks);
    
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    
    return result;
  }

  private async processChunk(
    files: Express.Multer.File[],
    worker: Worker,
    outputDir: string,
    options: any
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    for (const file of files) {
      try {
        const result = await this.processFile(worker, file, outputDir, options);
        results.push(result);
        this.progress.completed++;
        this.progress.results.push(result);
      } catch (error) {
        this.progress.failed++;
        logger.error('File processing failed:', {
          file: file.originalname,
          error: error.message
        });
      }

      this.statusCallback?.(this.progress);
    }

    return results;
  }

  private processFile(
    worker: Worker,
    file: Express.Multer.File,
    outputDir: string,
    options: any
  ): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      worker.postMessage({
        inputPath: file.path,
        outputPath: path.join(outputDir, file.filename),
        options
      });

      worker.once('message', resolve);
      worker.once('error', reject);
    });
  }
} 