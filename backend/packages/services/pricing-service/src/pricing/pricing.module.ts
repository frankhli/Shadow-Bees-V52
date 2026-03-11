import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';

@Module({
  imports: [HttpModule],
  controllers: [PricingController],
  providers: [PricingService],
})
export class PricingModule {}
