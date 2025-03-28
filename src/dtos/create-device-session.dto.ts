import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';

export class CreateDeviceSessionDto {
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

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
} 