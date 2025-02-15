import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../interfaces/user.interface';
import { AvailabilityService } from '../services/availability.service';
import { UpdateAvailabilityDto, AvailabilityExceptionDto } from '../dtos/availability.dto';
import { AvailabilityValidationPipe } from '../pipes/availability-validation.pipe';

@ApiTags('Availability')
@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Put(':workerId')
  @Roles(UserRole.WORKER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update worker availability' })
  @ApiResponse({ status: 200, description: 'Availability updated successfully' })
  @UsePipes(new AvailabilityValidationPipe())
  async updateAvailability(
    @Param('workerId') workerId: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto
  ) {
    return this.availabilityService.update(workerId, updateAvailabilityDto);
  }

  @Post(':workerId/exceptions')
  @Roles(UserRole.WORKER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add availability exception' })
  async addException(
    @Param('workerId') workerId: string,
    @Body() exceptionDto: AvailabilityExceptionDto
  ) {
    return this.availabilityService.addException(workerId, exceptionDto);
  }

  @Get(':workerId')
  @ApiOperation({ summary: 'Get worker availability' })
  async getAvailability(
    @Param('workerId') workerId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date
  ) {
    return this.availabilityService.get(workerId, { startDate, endDate });
  }

  @Delete(':workerId/exceptions/:exceptionId')
  @Roles(UserRole.WORKER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete availability exception' })
  async deleteException(
    @Param('workerId') workerId: string,
    @Param('exceptionId') exceptionId: string
  ) {
    return this.availabilityService.deleteException(workerId, exceptionId);
  }
}