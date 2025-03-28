import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';
import { DeviceDocument, DeviceModel } from '../models/device.model';
import { DeviceStatus, DeviceType, DeviceOS, IDevice } from '../interfaces/device.interface';
import { CreateDeviceDto } from '../dtos/create-device.dto';
import { UpdateDeviceDto } from '../dtos/update-device.dto';
import * as crypto from 'crypto';

@Injectable()
export class DeviceService {
  constructor(
    @InjectModel('Device') private deviceModel: Model<DeviceDocument> & DeviceModel,
  ) {}

  async registerDevice(createDeviceDto: CreateDeviceDto): Promise<DeviceDocument> {
    // Generate a unique device ID if not provided
    if (!createDeviceDto.deviceId) {
      createDeviceDto.deviceId = this.generateDeviceId(
        createDeviceDto.userId,
        createDeviceDto.model,
        createDeviceDto.manufacturer,
      );
    }

    // Check if device already exists
    const existingDevice = await this.deviceModel.findOne({
      deviceId: createDeviceDto.deviceId,
    }).exec();

    if (existingDevice) {
      // Update existing device
      Object.assign(existingDevice, createDeviceDto);
      existingDevice.status = DeviceStatus.ACTIVE;
      existingDevice.lastActive = new Date();
      return existingDevice.save();
    }

    // Create default security and permissions objects with all required fields
    const security = {
      isEncrypted: createDeviceDto.security?.isEncrypted ?? false,
      hasPasscode: createDeviceDto.security?.hasPasscode ?? false,
      hasBiometrics: createDeviceDto.security?.hasBiometrics ?? false,
      isTrusted: createDeviceDto.security?.isTrusted ?? true,
      isJailbroken: createDeviceDto.security?.isJailbroken,
      isRooted: createDeviceDto.security?.isRooted
    };

    const permissions = {
      notifications: createDeviceDto.permissions?.notifications ?? false,
      location: createDeviceDto.permissions?.location ?? false,
      camera: createDeviceDto.permissions?.camera ?? false,
      microphone: createDeviceDto.permissions?.microphone ?? false,
      contacts: createDeviceDto.permissions?.contacts ?? false,
      storage: createDeviceDto.permissions?.storage ?? false
    };

    // Create new device with default values for required fields
    const deviceData: Partial<IDevice> = {
      ...createDeviceDto,
      userId: new Types.ObjectId(createDeviceDto.userId),
      registeredAt: new Date(),
      lastActive: new Date(),
      status: DeviceStatus.ACTIVE,
      security,
      usage: {
        sessionCount: 0,
        totalUsageTime: 0,
      },
      permissions,
    };

    const device = new this.deviceModel(deviceData);
    return device.save();
  }

  async getDeviceById(deviceId: string): Promise<DeviceDocument> {
    const device = await this.deviceModel.findOne({ deviceId }).exec();
    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
    return device;
  }

  async getUserDevices(userId: string): Promise<DeviceDocument[]> {
    return this.deviceModel.find({ userId }).sort({ lastActive: -1 }).exec();
  }

  async updateDevice(deviceId: string, updateDeviceDto: UpdateDeviceDto): Promise<DeviceDocument> {
    const device = await this.getDeviceById(deviceId);
    
    // Update device properties
    Object.assign(device, updateDeviceDto);
    
    // If security is being updated, ensure all required fields are present
    if (updateDeviceDto.security) {
      device.security = {
        isEncrypted: updateDeviceDto.security.isEncrypted ?? device.security.isEncrypted,
        hasPasscode: updateDeviceDto.security.hasPasscode ?? device.security.hasPasscode,
        hasBiometrics: updateDeviceDto.security.hasBiometrics ?? device.security.hasBiometrics,
        isTrusted: updateDeviceDto.security.isTrusted ?? device.security.isTrusted,
        isJailbroken: updateDeviceDto.security.isJailbroken ?? device.security.isJailbroken,
        isRooted: updateDeviceDto.security.isRooted ?? device.security.isRooted
      };
    }
    
    // If permissions is being updated, ensure all required fields are present
    if (updateDeviceDto.permissions) {
      device.permissions = {
        notifications: updateDeviceDto.permissions.notifications ?? device.permissions.notifications,
        location: updateDeviceDto.permissions.location ?? device.permissions.location,
        camera: updateDeviceDto.permissions.camera ?? device.permissions.camera,
        microphone: updateDeviceDto.permissions.microphone ?? device.permissions.microphone,
        contacts: updateDeviceDto.permissions.contacts ?? device.permissions.contacts,
        storage: updateDeviceDto.permissions.storage ?? device.permissions.storage
      };
    }
    
    // Use type assertion to tell TypeScript this is a DeviceDocument
    return (await device.save()) as unknown as DeviceDocument;
  }

  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<DeviceDocument> {
    const device = await this.getDeviceById(deviceId);
    
    // Update status
    device.status = status;
    device.lastActive = new Date();
    
    // Use type assertion to tell TypeScript this is a DeviceDocument
    return (await device.save()) as unknown as DeviceDocument;
  }

  async recordSession(deviceId: string, duration: number): Promise<DeviceDocument> {
    const device = await this.getDeviceById(deviceId);
    
    // Update session data
    device.lastActive = new Date();
    if (!device.usage) {
      device.usage = {
        sessionCount: 0,
        totalUsageTime: 0,
      };
    }
    device.usage.sessionCount += 1;
    device.usage.totalUsageTime += duration;
    device.usage.lastSessionDuration = duration;
    
    // Use type assertion to tell TypeScript this is a DeviceDocument
    return (await device.save()) as unknown as DeviceDocument;
  }

  async updateDeviceLocation(
    deviceId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
  ): Promise<DeviceDocument> {
    const device = await this.getDeviceById(deviceId);
    
    // Update location data
    device.location = {
      latitude,
      longitude,
      accuracy: accuracy || 0,
      lastUpdated: new Date(),
    };
    
    // Use type assertion to tell TypeScript this is a DeviceDocument
    return (await device.save()) as unknown as DeviceDocument;
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    const result = await this.deviceModel.deleteOne({ deviceId });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }
    return true;
  }

  async getDeviceStats(): Promise<any> {
    const stats = await this.deviceModel.aggregate([
      {
        $group: {
          _id: null,
          totalDevices: { $sum: 1 },
          activeDevices: {
            $sum: {
              $cond: [{ $eq: ['$status', DeviceStatus.ACTIVE] }, 1, 0],
            },
          },
          byType: {
            $push: {
              type: '$type',
              status: '$status',
            },
          },
          byOS: {
            $push: {
              os: '$os',
              status: '$status',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalDevices: 1,
          activeDevices: 1,
          byType: {
            $arrayToObject: {
              $map: {
                input: {
                  $setUnion: [
                    Object.values(DeviceType),
                  ],
                },
                as: 'type',
                in: {
                  k: '$$type',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byType',
                        as: 'device',
                        cond: { $eq: ['$$device.type', '$$type'] },
                      },
                    },
                  },
                },
              },
            },
          },
          byOS: {
            $arrayToObject: {
              $map: {
                input: {
                  $setUnion: [
                    Object.values(DeviceOS),
                  ],
                },
                as: 'os',
                in: {
                  k: '$$os',
                  v: {
                    $size: {
                      $filter: {
                        input: '$byOS',
                        as: 'device',
                        cond: { $eq: ['$$device.os', '$$os'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]);

    return stats[0] || {
      totalDevices: 0,
      activeDevices: 0,
      byType: {},
      byOS: {},
    };
  }

  private generateDeviceId(userId: string, model?: string, manufacturer?: string): string {
    const data = `${userId}-${model || 'unknown'}-${manufacturer || 'unknown'}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
} 