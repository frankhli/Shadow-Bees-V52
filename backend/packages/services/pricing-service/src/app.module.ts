import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './prisma/prisma.module';
import { PricingModule } from './pricing/pricing.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HttpModule, PrismaModule, PricingModule, HealthModule],
})
export class AppModule {}
