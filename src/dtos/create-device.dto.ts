import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceType, DeviceOS } from '../interfaces/device.interface';

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

export class CreateDeviceDto {
  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  name: string;

  @IsEnum(DeviceType)
  type: DeviceType;

  @IsEnum(DeviceOS)
  os: DeviceOS;

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  userId: string;

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