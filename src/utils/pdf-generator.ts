import PDFDocument from 'pdfkit';
import { logger } from './logger';
import { LogMetadata } from '../interfaces/logger.interface';

export async function generatePDF(data: any[], columns: string[]): Promise<Buffer> {
  try {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => logger.info('PDF generation completed'));

    // Add headers
    doc.fontSize(12).font('Helvetica-Bold');
    columns.forEach((header, i) => {
      doc.text(header, 50 + i * 150, 50);
    });

    // Add data rows
    doc.fontSize(10).font('Helvetica');
    let y = 80;
    data.forEach(row => {
      columns.forEach((col, i) => {
        doc.text(String(row[col]), 50 + i * 150, y);
      });
      y += 20;
    });

    doc.end();

    return Buffer.concat(chunks);
  } catch (error) {
    logger.error('Error generating PDF:', { error } as LogMetadata);
    throw error;
  }
}
