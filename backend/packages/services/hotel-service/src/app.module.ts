import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HotelsModule } from './hotels/hotels.module';
import { RoomTypesModule } from './room-types/room-types.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PrismaModule,
    HotelsModule,
    RoomTypesModule,
    HealthModule,
  ],
})
export class AppModule {}
