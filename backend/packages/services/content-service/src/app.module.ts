import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './prisma/prisma.module';
import { ContentModule } from './content/content.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HttpModule, PrismaModule, ContentModule, HealthModule],
})
export class AppModule {}
