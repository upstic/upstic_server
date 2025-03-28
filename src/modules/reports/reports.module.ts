import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from '../../controllers/reports.controller';
import { ReportService } from '../../services/report.service';
import { ReportSchema } from '../../schemas/report.schema';
import { JobSchema } from '../../schemas/job.schema';
import { WorkerSchema } from '../../schemas/worker.schema';
import { ApplicationSchema } from '../../schemas/application.schema';
import { UserSchema } from '../../models/User';
import { ClientSchema } from '../../schemas/client.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Report', schema: ReportSchema },
      { name: 'Job', schema: JobSchema },
      { name: 'Worker', schema: WorkerSchema },
      { name: 'Application', schema: ApplicationSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Client', schema: ClientSchema }
    ]),
    CommonModule
  ],
  controllers: [ReportsController],
  providers: [ReportService],
  exports: [ReportService]
})
export class ReportsModule {} 