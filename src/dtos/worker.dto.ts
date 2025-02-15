import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsArray, IsNumber, IsOptional, Min, IsPhoneNumber, MaxLength, IsUrl, Matches } from 'class-validator';

export class CreateWorkerDto {
  @ApiProperty({ description: 'Worker first name', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z\s\-]+$/, { message: 'First name can only contain letters, spaces and hyphens' })
  firstName: string;

  @ApiProperty({ description: 'Worker last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Worker email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Worker phone number' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ description: 'List of worker skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ description: 'Years of experience', minimum: 0 })
  @IsNumber()
  @Min(0)
  experience: number;

  @ApiProperty({ description: 'Preferred work location' })
  @IsString()
  preferredLocation: string;

  @ApiPropertyOptional({ description: 'Expected salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalary?: number;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsUrl()
  profilePicture?: string;

  @ApiPropertyOptional({ description: 'Resume URL' })
  @IsOptional()
  @IsUrl()
  resumeUrl?: string;
}

export class UpdateWorkerDto extends CreateWorkerDto {
  @ApiPropertyOptional()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  experience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  preferredLocation?: string;
}

export class WorkerResponseDto extends CreateWorkerDto {
  @ApiProperty({ description: 'Worker ID' })
  id: string;

  @ApiProperty({ description: 'Worker availability status' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Worker rating', minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  rating: number;

  @ApiProperty({ description: 'Total completed jobs' })
  @IsNumber()
  completedJobs: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
} 