import { IsString, IsDate, IsEnum, IsBoolean, IsArray, ValidateNested, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export enum ShiftType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
  FULL_DAY = 'FULL_DAY'
}

export class TimeSlotDto {
  @ApiProperty({ enum: ShiftType })
  @IsEnum(ShiftType)
  type: ShiftType;

  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;
}

export class RegularScheduleDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ type: [TimeSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  shifts: TimeSlotDto[];

  @ApiProperty()
  @IsBoolean()
  isAvailable: boolean;
}

export class AvailabilityExceptionDto {
  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty()
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({ type: [TimeSlotDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  shifts?: TimeSlotDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateAvailabilityDto {
  @ApiProperty({ description: 'Regular weekly schedule' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegularScheduleDto)
  regularSchedule: RegularScheduleDto[];

  @ApiPropertyOptional({ description: 'Exceptions to regular schedule' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityExceptionDto)
  exceptions?: AvailabilityExceptionDto[];

  @ApiProperty({ description: 'Maximum weekly working hours' })
  @IsNumber()
  @Min(0)
  @Max(168)
  maxWeeklyHours: number;
}

export class AvailabilityPeriodDto {
  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiProperty()
  @IsBoolean()
  isAvailable: boolean;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ type: [AvailabilityPeriodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityPeriodDto)
  schedule: AvailabilityPeriodDto[];

  @ApiProperty({ enum: ['available', 'unavailable', 'busy'] })
  @IsString()
  @IsEnum(['available', 'unavailable', 'busy'])
  status: string;
}