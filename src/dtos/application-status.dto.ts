import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
  WITHDRAWN = 'withdrawn'
}

export class ApplicationStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
} 