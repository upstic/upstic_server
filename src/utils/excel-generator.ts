import { Workbook } from 'exceljs';
import { Logger } from './logger';

const logger = new Logger('ExcelGenerator');

export async function generateExcel(data: any[], columns: string[]): Promise<Buffer> {
  try {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    worksheet.addRow(columns);

    // Add data
    data.forEach(item => {
      const row = columns.map(col => item[col]);
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(
        ...worksheet.getColumn(column.number).values.map(v => 
          v ? v.toString().length : 0
        )
      ) + 2;
    });

    // Write to buffer and return
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    logger.error('Error generating Excel file:', { error });
    throw error;
  }
}
