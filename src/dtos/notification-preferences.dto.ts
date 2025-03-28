import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsArray, IsEnum, IsString, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../types/notification.types';

export class ScheduleConfig {
  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiProperty()
  @IsString()
  timezone: string;

  @ApiProperty()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek: number[];
}

export class NotificationChannels {
  @ApiProperty()
  @IsBoolean()
  email: boolean;

  @ApiProperty()
  @IsBoolean()
  push: boolean;

  @ApiProperty()
  @IsBoolean()
  sms: boolean;
}

export class NotificationPreferencesDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsBoolean()
  emailEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  pushEnabled: boolean;

  @ApiProperty({ enum: NotificationType, isArray: true })
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  enabledTypes: NotificationType[];

  @ApiProperty()
  @IsObject()
  @Type(() => NotificationChannels)
  channels: NotificationChannels;

  @ApiProperty()
  @IsObject()
  @Type(() => ScheduleConfig)
  schedules: ScheduleConfig;
} 