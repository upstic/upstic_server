import { IsString, IsDate, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class DeviceSessionFilterDto {
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsUUID()
  @IsOptional()
  deviceId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startTimeFrom?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startTimeTo?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endTimeFrom?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endTimeTo?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  location?: string;
} 