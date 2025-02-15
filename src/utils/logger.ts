import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogMetadata {
  [key: string]: any;
}

@Injectable()
export class Logger {
  private static instance: Logger;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
  }

  public static getInstance(context?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(context);
    }
    return Logger.instance;
  }

  info(message: string, metadata?: LogMetadata): void {
    console.log(`[INFO] [${this.context}] ${message}`, metadata || '');
  }

  error(message: string, metadata?: LogMetadata): void {
    console.error(`[ERROR] [${this.context}] ${message}`, metadata || '');
  }

  warn(message: string, metadata?: LogMetadata): void {
    console.warn(`[WARN] [${this.context}] ${message}`, metadata || '');
  }

  debug(message: string, metadata?: LogMetadata): void {
    console.debug(`[DEBUG] [${this.context}] ${message}`, metadata || '');
  }
}

export const logger = Logger.getInstance();