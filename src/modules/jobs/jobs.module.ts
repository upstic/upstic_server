import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobController } from '../../controllers/job.controller';
import { JobService } from '../../services/job.service';
import { JobSchema } from '../../schemas/job.schema';
import { ApplicationSchema } from '../../schemas/application.schema';
import { WorkerProfileSchema } from '../../schemas/worker-profile.schema';
import { MatchingService } from '../../services/matching.service';
import { RedisService } from '../../services/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Job', schema: JobSchema },
      { name: 'Application', schema: ApplicationSchema },
      { name: 'WorkerProfile', schema: WorkerProfileSchema }
    ])
  ],
  controllers: [JobController],
  providers: [
    JobService,
    MatchingService,
    RedisService
  ],
  exports: [JobService]
})
export class JobsModule {} 