import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HotelBffController } from './bff-hotel/hotel-bff.controller';
import { HotelBffService } from './bff-hotel/hotel-bff.service';
import { GroupBffController } from './bff-group/group-bff.controller';
import { GroupBffService } from './bff-group/group-bff.service';
import { AdminBffController } from './bff-admin/admin-bff.controller';
import { AdminBffService } from './bff-admin/admin-bff.service';
import { HealthModule } from './health/health.module';
import { AppCacheModule } from './cache/cache.module';

@Module({
  imports: [HttpModule, HealthModule, AppCacheModule],
  controllers: [
    HotelBffController,
    GroupBffController,
    AdminBffController,
  ],
  providers: [
    HotelBffService,
    GroupBffService,
    AdminBffService,
  ],
})
export class AppModule {}
