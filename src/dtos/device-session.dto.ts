import { IsString, IsDate, IsOptional, IsBoolean, IsObject, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class DeviceSessionDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  deviceId: string;

  @IsUUID()
  userId: string;

  @IsString()
  ipAddress: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endTime?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
} 