import { IReport } from '../interfaces/models.interface';
import { ReportType, ReportFormat } from '../types/report.types';
import { generatePDF } from './pdf-generator';
import { generateExcel } from './excel-generator';
import { logger } from './logger';

export async function generateReport(report: IReport): Promise<{
  file: Buffer;
  metadata: any;
}> {
  try {
    let fileBuffer: Buffer;
    const metadata: any = {};

    switch (report.format) {
      case ReportFormat.PDF:
        fileBuffer = await generatePDF(report);
        break;
      case ReportFormat.EXCEL:
        fileBuffer = await generateExcel(report);
        break;
      default:
        throw new Error(`Unsupported report format: ${report.format}`);
    }

    return {
      file: fileBuffer,
      metadata
    };
  } catch (error) {
    logger.error('Error generating report:', error);
    throw error;
  }
} 