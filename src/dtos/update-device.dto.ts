import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceType, DeviceOS, DeviceStatus } from '../interfaces/device.interface';

class SecurityDto {
  @IsBoolean()
  @IsOptional()
  isEncrypted?: boolean;

  @IsBoolean()
  @IsOptional()
  hasPasscode?: boolean;

  @IsBoolean()
  @IsOptional()
  hasBiometrics?: boolean;

  @IsBoolean()
  @IsOptional()
  isTrusted?: boolean;

  @IsBoolean()
  @IsOptional()
  isJailbroken?: boolean;

  @IsBoolean()
  @IsOptional()
  isRooted?: boolean;
}

class PermissionsDto {
  @IsBoolean()
  @IsOptional()
  notifications?: boolean;

  @IsBoolean()
  @IsOptional()
  location?: boolean;

  @IsBoolean()
  @IsOptional()
  camera?: boolean;

  @IsBoolean()
  @IsOptional()
  microphone?: boolean;

  @IsBoolean()
  @IsOptional()
  contacts?: boolean;

  @IsBoolean()
  @IsOptional()
  storage?: boolean;
}

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DeviceType)
  @IsOptional()
  type?: DeviceType;

  @IsEnum(DeviceOS)
  @IsOptional()
  os?: DeviceOS;

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @IsString()
  @IsOptional()
  fcmToken?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => SecurityDto)
  security?: SecurityDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions?: PermissionsDto;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
} 