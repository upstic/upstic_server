import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AiMatchingController } from '../../controllers/ai-matching.controller';
import { AIMatchingService } from '../../services/ai-matching.service';
import { MatchingService } from '../../services/matching.service';
import { NotificationService } from '../../services/notification.service';
import { JobSchema } from '../../schemas/job.schema';
import { WorkerSchema } from '../../schemas/worker.schema';
import { ApplicationSchema } from '../../schemas/application.schema';
import { MatchSchema } from '../../schemas/match.schema';
import { WorkerProfileSchema } from '../../schemas/worker-profile.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Job', schema: JobSchema },
      { name: 'Worker', schema: WorkerSchema },
      { name: 'Application', schema: ApplicationSchema },
      { name: 'Match', schema: MatchSchema },
      { name: 'WorkerProfile', schema: WorkerProfileSchema }
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    AuthModule
  ],
  controllers: [AiMatchingController],
  providers: [
    AIMatchingService, 
    MatchingService,
    NotificationService
  ],
  exports: [AIMatchingService, MatchingService]
})
export class AiMatchingModule {} 