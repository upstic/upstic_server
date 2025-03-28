import { IsString, IsNotEmpty, IsEnum, IsDate, IsNumber, IsOptional, ValidateNested, IsMongoId, IsArray, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { JobOfferStatus } from '../interfaces/job-offer.interface';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsArray()
  coordinates?: [number, number];
}

export class ProbationPeriodDto {
  @IsNumber()
  @Min(1)
  duration: number;

  @IsDateString()
  endDate: string;
}

export class DocumentDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsDateString()
  uploadDate?: string;
}

export class CreateJobOfferDto {
  @IsMongoId()
  @IsNotEmpty()
  jobId: string;

  @IsMongoId()
  @IsNotEmpty()
  candidateId: string;

  @IsMongoId()
  @IsNotEmpty()
  recruiterId: string;

  @IsOptional()
  @IsEnum(JobOfferStatus)
  status?: JobOfferStatus;

  @IsOptional()
  @IsDateString()
  offerDate?: string;

  @IsDateString()
  @IsNotEmpty()
  expiryDate: string;

  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['permanent', 'temporary', 'contract'])
  offerType: 'permanent' | 'temporary' | 'contract';

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  @IsNotEmpty()
  contractType: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProbationPeriodDto)
  probationPeriod?: ProbationPeriodDto;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @IsMongoId()
  @IsNotEmpty()
  createdBy: string;
}

export class UpdateJobOfferDto {
  @IsOptional()
  @IsEnum(JobOfferStatus)
  status?: JobOfferStatus;

  @IsOptional()
  @IsDateString()
  responseDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['permanent', 'temporary', 'contract'])
  offerType?: 'permanent' | 'temporary' | 'contract';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProbationPeriodDto)
  probationPeriod?: ProbationPeriodDto;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @IsMongoId()
  @IsNotEmpty()
  updatedBy: string;
}

export class JobOfferResponseDto {
  @IsEnum(JobOfferStatus)
  @IsNotEmpty()
  status: JobOfferStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsMongoId()
  @IsNotEmpty()
  updatedBy: string;
} 