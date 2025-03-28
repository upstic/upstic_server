import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkerController } from '../../controllers/worker.controller';
import { WorkerService } from '../../services/worker.service';
import { ApplicationService } from '../../services/application.service';
import { WorkerSchema } from '../../schemas/worker.schema';
import { WorkerProfileSchema } from '../../schemas/worker-profile.schema';
import { ApplicationSchema } from '../../schemas/application.schema';
import { JobSchema } from '../../schemas/job.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Worker', schema: WorkerSchema },
      { name: 'WorkerProfile', schema: WorkerProfileSchema },
      { name: 'Application', schema: ApplicationSchema },
      { name: 'Job', schema: JobSchema }
    ]),
    forwardRef(() => UsersModule)
  ],
  controllers: [WorkerController],
  providers: [
    WorkerService,
    ApplicationService
  ],
  exports: [
    WorkerService,
    ApplicationService
  ]
})
export class WorkersModule {} 