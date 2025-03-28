import { Document, Model } from 'mongoose';
import { IDevice, DeviceStatus } from '../interfaces/device.interface';
import { DeviceSchema } from '../schemas/device.schema';

// Omit the 'model' property from Document to avoid conflict with IDevice
export interface DeviceDocument extends Omit<Document, 'model'>, IDevice {}

export interface DeviceModel extends Model<DeviceDocument> {
  findByUserId(userId: string): Promise<DeviceDocument[]>;
  findActiveDevices(): Promise<DeviceDocument[]>;
  findByDeviceId(deviceId: string): Promise<DeviceDocument>;
}

export const Device = {
  name: 'Device',
  schema: DeviceSchema,
}; 