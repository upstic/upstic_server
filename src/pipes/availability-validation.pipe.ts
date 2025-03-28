import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { CreateAvailabilityDto, TimeSlotDto } from '../dtos/availability.dto';

@Injectable()
export class AvailabilityValidationPipe implements PipeTransform {
  transform(value: CreateAvailabilityDto) {
    if (this.hasTimeSlotConflicts(value)) {
      throw new BadRequestException('Time slot conflicts detected in schedule');
    }

    if (this.exceedsMaxHours(value)) {
      throw new BadRequestException('Schedule exceeds maximum allowed hours');
    }

    return value;
  }

  private hasTimeSlotConflicts(availability: CreateAvailabilityDto): boolean {
    // Check regular schedule conflicts
    for (const schedule of availability.regularSchedule) {
      const slots = schedule.shifts;
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          if (this.doTimeSlotsOverlap(slots[i], slots[j])) {
            return true;
          }
        }
      }
    }

    // Check exception conflicts
    if (availability.exceptions) {
      for (const exception of availability.exceptions) {
        if (exception.shifts) {
          const slots = exception.shifts;
          for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
              if (this.doTimeSlotsOverlap(slots[i], slots[j])) {
                return true;
              }
            }
          }
        }
      }
    }

    return false;
  }

  private doTimeSlotsOverlap(slot1: TimeSlotDto, slot2: TimeSlotDto): boolean {
    const start1 = this.parseTime(slot1.startTime);
    const end1 = this.parseTime(slot1.endTime);
    const start2 = this.parseTime(slot2.startTime);
    const end2 = this.parseTime(slot2.endTime);

    return (start1 < end2 && end1 > start2);
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private exceedsMaxHours(availability: CreateAvailabilityDto): boolean {
    const maxWeeklyMinutes = availability.maxWeeklyHours * 60;
    let totalMinutes = 0;

    // Calculate regular schedule minutes
    for (const schedule of availability.regularSchedule) {
      if (schedule.isAvailable) {
        for (const shift of schedule.shifts) {
          totalMinutes += this.calculateShiftDuration(shift);
        }
      }
    }

    return totalMinutes > maxWeeklyMinutes;
  }

  private calculateShiftDuration(shift: TimeSlotDto): number {
    const startMinutes = this.parseTime(shift.startTime);
    const endMinutes = this.parseTime(shift.endTime);
    return endMinutes - startMinutes;
  }
} 