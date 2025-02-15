import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../../services/user.service';
import { UserSchema } from '../../models/User';
import { RedisModule } from '../redis/redis.module';
import { ClientsModule } from '../clients/clients.module';
import { WorkersModule } from '../workers/workers.module';
import { EmailService } from '../../services/email.service';
import { EmailLogSchema } from '../../models/EmailLog';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'EmailLog', schema: EmailLogSchema }
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    RedisModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => WorkersModule)
  ],
  providers: [
    UserService,
    EmailService
  ],
  exports: [UserService, JwtModule]
})
export class UsersModule {} 