import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsArray, IsEnum } from 'class-validator';
import { NotificationType } from '../types/notification.types';

export class NotificationPreferencesDto {
  @ApiProperty({ description: 'Email notifications enabled' })
  @IsBoolean()
  emailEnabled: boolean;

  @ApiProperty({ description: 'Push notifications enabled' })
  @IsBoolean()
  pushEnabled: boolean;

  @ApiProperty({ description: 'Notification types to receive' })
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  enabledTypes: NotificationType[];
} 