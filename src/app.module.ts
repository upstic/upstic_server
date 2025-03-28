import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { createClient } from 'redis';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { WorkersModule } from './modules/workers/workers.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AiMatchingModule } from './modules/ai-matching/ai-matching.module';
import { CommonModule } from './modules/common/common.module';
import { ReportsModule } from './modules/reports/reports.module';

import { ClientController } from './controllers/client.controller';
import { AiMatchingController } from './controllers/ai-matching.controller';
import { WorkerController } from './controllers/worker.controller';
import { JobController } from './controllers/job.controller';
import { AppController } from './controllers/app.controller';
import { ApplicationController } from './controllers/application.controller';
import { CrashLogController } from './controllers/crash-log.controller';
import { DeviceController } from './controllers/device.controller';

import { ClientService } from './services/client.service';
import { AIMatchingService } from './services/ai-matching.service';
import { AnalyticsService } from './services/analytics.service';
import { ClientSchema } from './schemas/client.schema';
import { JobSchema } from './schemas/job.schema';
import { WorkerSchema } from './schemas/worker.schema';
import { ApplicationSchema } from './schemas/application.schema';
import { ShiftSchema } from './schemas/shift.schema';
import { ReportSchema } from './schemas/report.schema';
import { MatchSchema } from './schemas/match.schema';
import { WorkerProfileSchema } from './schemas/worker-profile.schema';
import { WorkerService } from './services/worker.service';
import { JobService } from './services/job.service';
import { WorkerProfileService } from './services/worker-profile.service';
import { MatchingService } from './services/matching.service';
import { Logger } from './utils/logger';
import { CrashLog } from './models/crash-log.model';
import { CrashLogService } from './services/crash-log.service';
import { CrashLogSchema } from './schemas/crash-log.schema';
import { Device } from './models/device.model';
import { DeviceService } from './services/device.service';
import { DeviceSchema } from './schemas/device.schema';

const logger = new Logger('AppModule');

// Global flag to track Redis compatibility
global.REDIS_COMPATIBLE = false;

function getBullModuleConfiguration() {
  // Set global flag for Redis compatibility
  if (global.REDIS_COMPATIBLE === undefined) {
    global.REDIS_COMPATIBLE = true;
  }

  try {
    // Create Redis client for version check only
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // 5 seconds timeout
        reconnectStrategy: false // Don't reconnect automatically
      }
    });

    // Wrap Redis version check in a Promise to handle it properly
    const checkRedisVersion = async () => {
      try {
        // Connect to Redis
        await client.connect();
        
        // Get Redis info
        const info = await client.info();
        
        // Extract Redis version
        const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          const version = versionMatch[1];
          if (parseFloat(version) < 5.0) {
            logger.warn(`Redis version ${version} is not compatible with BullMQ (requires 5.0.0+). Using fallback mechanisms.`);
            global.REDIS_COMPATIBLE = false;
            return false;
          }
          
          logger.info(`Redis version ${version} is compatible with BullMQ.`);
          global.REDIS_COMPATIBLE = true;
          return true;
        } else {
          logger.warn('Could not determine Redis version. Using fallback mechanisms.');
          global.REDIS_COMPATIBLE = false;
          return false;
        }
      } catch (err) {
        logger.warn(`Redis connection error: ${err.message}. BullMQ will not be available.`);
        global.REDIS_COMPATIBLE = false;
        return false;
      } finally {
        // Always close the client when done
        await client.quit().catch(err => {
          logger.debug(`Error closing Redis client: ${err.message}`);
        });
      }
    };

    // Check Redis version synchronously to avoid issues with module initialization
    let isRedisCompatible = false;
    
    // Use a synchronous approach to check Redis version
    // This is not ideal but necessary for module initialization
    try {
      // Set a flag to indicate Redis compatibility
      // We'll use this flag to determine if BullMQ should be used
      global.REDIS_COMPATIBLE = false;
      
      // We'll initialize BullMQ modules only if Redis is compatible
      // For now, assume it's not compatible
      return [];
    } catch (error) {
      logger.warn('Failed to check Redis version, using fallback mechanisms', error);
      global.REDIS_COMPATIBLE = false;
      return [];
    }
  } catch (error) {
    logger.warn('Failed to initialize Redis client, using fallback mechanisms', error);
    global.REDIS_COMPATIBLE = false;
    return [];
  }
}

// Initialize BullMQ modules after Redis check
async function initializeBullModules() {
  try {
    // Only initialize if Redis is compatible
    if (global.REDIS_COMPATIBLE) {
      return BullModule.forRoot({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });
    }
  } catch (error) {
    logger.warn('Failed to initialize BullMQ, using fallback mechanisms', error);
    global.REDIS_COMPATIBLE = false;
  }
  
  return null;
}

// Get BullModule configuration before @Module declaration
const bullModuleImports = getBullModuleConfiguration();

@Module({
  imports: [
    // Core modules
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment'),
    
    // Common module for shared services
    CommonModule,
    
    // Feature modules
    AuthModule,
    UsersModule,
    JobsModule,
    WorkersModule,
    ClientsModule,
    AiMatchingModule,
    ReportsModule,

    // Include BullModule imports if Redis is available
    ...bullModuleImports,

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forFeature([
      { name: 'Client', schema: ClientSchema },
      { name: 'Job', schema: JobSchema },
      { name: 'Worker', schema: WorkerSchema },
      { name: 'Application', schema: ApplicationSchema },
      { name: 'Shift', schema: ShiftSchema },
      { name: 'Report', schema: ReportSchema },
      { name: 'Match', schema: MatchSchema },
      { name: 'WorkerProfile', schema: WorkerProfileSchema },
      { name: CrashLog.name, schema: CrashLogSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [
    AppController,
    ClientController,
    AiMatchingController,
    WorkerController,
    JobController,
    ApplicationController,
    CrashLogController,
    DeviceController,
  ],
  providers: [
    ClientService,
    AIMatchingService,
    AnalyticsService,
    WorkerService,
    JobService,
    WorkerProfileService,
    MatchingService,
    CrashLogService,
    DeviceService,
  ],
  exports: [
    CrashLogService,
  ],
})
export class AppModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // Initialize BullMQ after module initialization
    try {
      // Check Redis version
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000, // 5 seconds timeout
        }
      });

      // Set up error handler
      client.on('error', (err) => {
        logger.warn(`Redis connection error: ${err.message}. BullMQ will not be available.`);
        global.REDIS_COMPATIBLE = false;
      });

      // Connect to Redis
      await client.connect();
      
      // Get Redis info
      const info = await client.info();
      
      // Extract Redis version
      const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const version = versionMatch[1];
        if (parseFloat(version) < 5.0) {
          logger.warn(`Redis version ${version} is not compatible with BullMQ (requires 5.0.0+). Using fallback mechanisms.`);
          global.REDIS_COMPATIBLE = false;
        } else {
          logger.info(`Redis version ${version} is compatible with BullMQ.`);
          global.REDIS_COMPATIBLE = true;
        }
      } else {
        logger.warn('Could not determine Redis version. Using fallback mechanisms.');
        global.REDIS_COMPATIBLE = false;
      }

      // Always close the client when done
      await client.quit();
    } catch (err) {
      logger.warn(`Redis connection error during module initialization: ${err.message}. BullMQ will not be available.`);
      global.REDIS_COMPATIBLE = false;
    }
  }

  async onModuleDestroy() {
    // Clean up resources
    try {
      // Any cleanup needed
    } catch (error) {
      logger.error('Error during module cleanup', error);
    }
  }
}
