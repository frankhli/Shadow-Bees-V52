import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, OrdersModule, HealthModule],
})
export class AppModule {}
