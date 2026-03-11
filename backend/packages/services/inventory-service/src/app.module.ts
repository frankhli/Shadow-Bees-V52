import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { InventoriesModule } from './inventories/inventories.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, InventoriesModule, HealthModule],
})
export class AppModule {}
