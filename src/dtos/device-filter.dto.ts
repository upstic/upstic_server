import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID, IsArray } from 'class-validator';
import { DeviceType, DeviceOS, DeviceStatus } from '../interfaces/device.interface';

export class DeviceFilterDto {
  @IsUUID()
  @IsOptional()
  deviceId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DeviceType, { each: true })
  @IsOptional()
  @IsArray()
  types?: DeviceType[];

  @IsEnum(DeviceOS, { each: true })
  @IsOptional()
  @IsArray()
  os?: DeviceOS[];

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsEnum(DeviceStatus, { each: true })
  @IsOptional()
  @IsArray()
  statuses?: DeviceStatus[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isJailbroken?: boolean;

  @IsBoolean()
  @IsOptional()
  isRooted?: boolean;

  @IsString()
  @IsOptional()
  search?: string;
} 