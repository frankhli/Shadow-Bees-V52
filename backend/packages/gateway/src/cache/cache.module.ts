import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { cacheConfig } from '../config/cache.config';

@Global()
@Module({
  imports: [CacheModule.register(cacheConfig)],
  exports: [CacheModule],
})
export class AppCacheModule {}
