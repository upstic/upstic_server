import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class DateRangeDto {
  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate: string;
} 