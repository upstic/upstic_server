import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkerController } from '../../controllers/worker.controller';
import { WorkerService } from '../../services/worker.service';
import { WorkerSchema } from '../../schemas/worker.schema';
import { WorkerProfileSchema } from '../../schemas/worker-profile.schema';
import { ApplicationSchema } from '../../schemas/application.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Worker', schema: WorkerSchema },
      { name: 'WorkerProfile', schema: WorkerProfileSchema },
      { name: 'Application', schema: ApplicationSchema }
    ]),
    forwardRef(() => UsersModule)
  ],
  controllers: [WorkerController],
  providers: [WorkerService],
  exports: [WorkerService]
})
export class WorkersModule {} 