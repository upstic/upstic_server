import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { WorkersModule } from './modules/workers/workers.module';
import { ClientsModule } from './modules/clients/clients.module';
import { AiMatchingModule } from './modules/ai-matching/ai-matching.module';

import { ClientController } from './controllers/client.controller';
import { AiMatchingController } from './controllers/ai-matching.controller';
import { WorkerController } from './controllers/worker.controller';
import { JobController } from './controllers/job.controller';
import { AppController } from './controllers/app.controller';

import { ClientService } from './services/client.service';
import { AIMatchingService } from './services/ai-matching.service';
import { AnalyticsService } from './services/analytics.service';
import { NotificationService } from './services/notification.service';
import { ClientSchema } from './schemas/client.schema';
import { JobSchema } from './schemas/job.schema';
import { WorkerSchema } from './schemas/worker.schema';
import { ApplicationSchema } from './schemas/application.schema';
import { ShiftSchema } from './schemas/shift.schema';
import { ReportSchema } from './schemas/report.schema';
import { MatchSchema } from './schemas/match.schema';
import { WorkerService } from './services/worker.service';
import { JobService } from './services/job.service';
import { WorkerProfileService } from './services/worker-profile.service';
import { RedisService } from './services/redis.service';
import { WorkerProfileSchema } from './schemas/worker-profile.schema';
import { MatchingService } from './services/matching.service';
import { EmailService } from './services/email.service';
import { EmailLogSchema } from './models/EmailLog';

@Module({
  imports: [
    // Core modules
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment'),
    
    // Feature modules
    AuthModule,
    UsersModule,
    JobsModule,
    WorkersModule,
    ClientsModule,
    AiMatchingModule,

    // Existing configurations
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      {
        name: 'analytics',
      },
      {
        name: 'profile-verification',
      }
    ),
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
      { name: 'EmailLog', schema: EmailLogSchema }
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
  ],
  providers: [
    ClientService,
    AIMatchingService,
    AnalyticsService,
    NotificationService,
    WorkerService,
    JobService,
    WorkerProfileService,
    RedisService,
    MatchingService,
    EmailService
  ],
  exports: [EmailService]
})
export class AppModule {}
