import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceController } from '../controllers/device.controller';
import { DeviceService } from '../services/device.service';
import { Device } from '../models/device.model';
import { DeviceSession } from '../models/device-session.model';
import { CrashLog } from '../models/crash-log.model';
import { CrashLogController } from '../controllers/crash-log.controller';
import { CrashLogService } from '../services/crash-log.service';
import { NotificationModule } from './notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      Device,
      DeviceSession,
      CrashLog,
    ]),
    NotificationModule,
  ],
  controllers: [DeviceController, CrashLogController],
  providers: [DeviceService, CrashLogService],
  exports: [DeviceService, CrashLogService],
})
export class DeviceModule {} 