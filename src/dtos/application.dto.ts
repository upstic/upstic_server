import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min, MaxLength, IsEnum, ValidateNested } from 'class-validator';
import { Type as TransformType } from 'class-transformer';

export class SalaryExpectationDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: ['hour', 'day', 'week', 'month', 'year'] })
  @IsEnum(['hour', 'day', 'week', 'month', 'year'])
  period: string;

  @ApiProperty()
  @IsString()
  currency: string;
}

export class CreateApplicationDto {
  @ApiProperty({ description: 'Job ID to apply for' })
  @IsString()
  jobId: string;

  @ApiProperty({ description: 'Cover letter' })
  @IsString()
  @MaxLength(2000)
  coverLetter: string;

  @ApiProperty({ description: 'Expected salary' })
  @ValidateNested()
  @TransformType(() => SalaryExpectationDto)
  expectedSalary: SalaryExpectationDto;

  @ApiProperty({ description: 'Available start date' })
  @IsDateString()
  availableFrom: string;

  @ApiPropertyOptional({ description: 'Notice period in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  noticePeriod?: number;
} 