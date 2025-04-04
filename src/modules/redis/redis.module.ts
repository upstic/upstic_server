import { Module, Global } from '@nestjs/common';
import { RedisService } from '../../services/redis.service';

@Global()  // Make it globally available
@Module({
  providers: [RedisService],
  exports: [RedisService]
})
export class RedisModule {} 