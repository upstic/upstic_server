import { IsString, IsDate, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDeviceSessionDto {
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endTime?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
} 