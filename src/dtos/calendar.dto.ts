import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class CalendarQueryDto {
  @ApiPropertyOptional({ description: 'Start date for calendar range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for calendar range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by interview type' })
  @IsOptional()
  @IsString()
  type?: string;
} 