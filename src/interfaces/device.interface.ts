import { Types } from 'mongoose';

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  OTHER = 'other',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  LOST = 'lost',
  STOLEN = 'stolen',
}

export enum DeviceOS {
  ANDROID = 'android',
  IOS = 'ios',
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  OTHER = 'other',
}

export interface IDevice {
  deviceId: string;
  name: string;
  type: DeviceType;
  os: DeviceOS;
  osVersion?: string;
  model?: string;
  manufacturer?: string;
  userId: Types.ObjectId;
  status: DeviceStatus;
  lastActive?: Date;
  registeredAt: Date;
  fcmToken?: string;
  appVersion?: string;
  ipAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    lastUpdated?: Date;
  };
  security: {
    isEncrypted: boolean;
    hasPasscode: boolean;
    hasBiometrics: boolean;
    isTrusted: boolean;
    isJailbroken?: boolean;
    isRooted?: boolean;
  };
  usage: {
    sessionCount: number;
    totalUsageTime: number;
    lastSessionDuration?: number;
  };
  permissions: {
    notifications: boolean;
    location: boolean;
    camera: boolean;
    microphone: boolean;
    contacts: boolean;
    storage: boolean;
  };
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
} 