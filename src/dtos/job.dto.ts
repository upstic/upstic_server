import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsNumber, IsOptional, Min, IsEnum, IsDateString, MaxLength, IsUrl, Matches, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export enum JobStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  FILLED = 'FILLED'
}

export class CreateJobDto {
  @ApiProperty({ description: 'Job title', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-]+$/, { message: 'Title can only contain letters, numbers, spaces and hyphens' })
  title: string;

  @ApiProperty({ description: 'Job description', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ description: 'Required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ description: 'Required years of experience', minimum: 0 })
  @IsNumber()
  @Min(0)
  experience: number;

  @ApiProperty({ description: 'Job location' })
  @IsString()
  location: string;

  @ApiProperty({ description: 'Salary range - minimum', minimum: 0 })
  @IsNumber()
  @Min(0)
  salaryMin: number;

  @ApiProperty({ description: 'Salary range - maximum', minimum: 0 })
  @IsNumber()
  @Min(0)
  salaryMax: number;

  @ApiPropertyOptional({ description: 'Job status', enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiProperty({ description: 'Job start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Job end date' })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.startDate && o.endDate && new Date(o.endDate) > new Date(o.startDate))
  endDate?: string;

  @ApiPropertyOptional({ description: 'Job posting URL' })
  @IsOptional()
  @IsUrl()
  postingUrl?: string;
}

export class UpdateJobDto extends CreateJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  salaryMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  salaryMax?: number;
}

export class JobResponseDto {
  @ApiProperty({ description: 'Job ID' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  title: string;

  @ApiProperty({ description: 'Job description' })
  description: string;

  @ApiProperty({ description: 'Required skills' })
  skills: string[];

  @ApiProperty({ description: 'Job status' })
  status: string;
}

export class LocationDto {
  @ApiProperty({ description: 'Coordinates [longitude, latitude]', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: [number, number];
  
  @ApiPropertyOptional({ description: 'Maximum distance in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;
}

export class JobSearchParamsDto {
  @ApiPropertyOptional({ description: 'Search keywords' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Location coordinates and max distance' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
} 