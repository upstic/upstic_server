import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from '../../services/notification.service';
import { EmailService } from '../../services/email.service';
import { RedisService } from '../../services/redis.service';
import { DocumentService } from '../../services/document.service';
import { Notification } from '../../models/Notification';
import { EmailLogSchema } from '../../models/EmailLog';
import { Document } from '../../models/Document';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Notification', schema: Notification.schema },
      { name: 'EmailLog', schema: EmailLogSchema },
      { name: 'Document', schema: Document.schema }
    ])
  ],
  providers: [
    NotificationService,
    EmailService,
    RedisService,
    DocumentService
  ],
  exports: [
    NotificationService,
    EmailService,
    RedisService,
    DocumentService,
    MongooseModule
  ]
})
export class CommonModule {} 