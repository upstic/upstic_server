import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { DeviceService } from '../services/device.service';
import { CreateDeviceDto } from '../dtos/create-device.dto';
import { UpdateDeviceDto } from '../dtos/update-device.dto';
import { DeviceFilterDto } from '../dtos/device-filter.dto';
import { CreateDeviceSessionDto } from '../dtos/create-device-session.dto';
import { UpdateDeviceSessionDto } from '../dtos/update-device-session.dto';
import { DeviceSessionFilterDto } from '../dtos/device-session-filter.dto';
import { DeviceStatus } from '../interfaces/device.interface';
import { UserRole } from '../interfaces/user.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Extend Express Request to include user property
interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user: JwtPayload;
}

@ApiTags('Devices')
@Controller('devices')
@ApiBearerAuth()
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid device data' })
  async registerDevice(@Body() createDeviceDto: CreateDeviceDto, @Req() req: AuthenticatedRequest) {
    // If userId is not provided in the DTO, use the authenticated user's ID
    if (!createDeviceDto.userId && req.user) {
      createDeviceDto.userId = req.user.userId;
    }
    return this.deviceService.registerDevice(createDeviceDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all devices for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of devices' })
  async getUserDevices(@Req() req: AuthenticatedRequest, @Query() filter: DeviceFilterDto) {
    // If userId is not provided in the filter, use the authenticated user's ID
    if (!filter.userId && req.user) {
      filter.userId = req.user.userId;
    }
    
    // If a specific userId is provided in the filter, use that
    if (filter.userId) {
      return this.deviceService.getUserDevices(filter.userId);
    }
    
    // Otherwise, return devices for the authenticated user
    return this.deviceService.getUserDevices(req.user.userId);
  }

  @Get(':deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a device by ID' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getDeviceById(@Param('deviceId') deviceId: string) {
    return this.deviceService.getDeviceById(deviceId);
  }

  @Put(':deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Device updated successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async updateDevice(
    @Param('deviceId') deviceId: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return this.deviceService.updateDevice(deviceId, updateDeviceDto);
  }

  @Put(':deviceId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update device status' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Device status updated successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async updateDeviceStatus(
    @Param('deviceId') deviceId: string,
    @Body('status') status: DeviceStatus,
  ) {
    return this.deviceService.updateDeviceStatus(deviceId, status);
  }

  @Post(':deviceId/session')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a device session' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 201, description: 'Session recorded successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async recordSession(
    @Param('deviceId') deviceId: string,
    @Body('duration') duration: number,
  ) {
    return this.deviceService.recordSession(deviceId, duration);
  }

  @Put(':deviceId/location')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update device location' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async updateDeviceLocation(
    @Param('deviceId') deviceId: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
    @Body('accuracy') accuracy?: number,
  ) {
    return this.deviceService.updateDeviceLocation(deviceId, latitude, longitude, accuracy);
  }

  @Delete(':deviceId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a device' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  @ApiResponse({ status: 204, description: 'Device deleted successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async deleteDevice(@Param('deviceId') deviceId: string) {
    await this.deviceService.deleteDevice(deviceId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get device statistics' })
  @ApiResponse({ status: 200, description: 'Device statistics' })
  async getDeviceStats() {
    return this.deviceService.getDeviceStats();
  }
} 