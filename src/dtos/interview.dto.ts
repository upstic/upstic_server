import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min, IsEnum, MaxLength, IsArray } from 'class-validator';
import { Max } from 'class-validator';

export class ScheduleInterviewDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  applicationId: string;

  @ApiProperty({ description: 'Interview date and time' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ description: 'Interview duration in minutes' })
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiProperty({ enum: ['online', 'in-person', 'phone'] })
  @IsEnum(['online', 'in-person', 'phone'])
  type: string;

  @ApiPropertyOptional({ description: 'Interview location or meeting link' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class RescheduleInterviewDto {
  @ApiProperty({ description: 'New interview date and time' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ description: 'Reason for rescheduling' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

export class InterviewFeedbackDto {
  @ApiProperty({ description: 'Interview rating', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Detailed feedback' })
  @IsString()
  @MaxLength(2000)
  feedback: string;

  @ApiProperty({ description: 'Skills assessment', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];
} 