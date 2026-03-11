import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get(':hotelId/:roomTypeId')
  async getPricing(
    @Param('hotelId') hotelId: string,
    @Param('roomTypeId') roomTypeId: string,
    @Query('date') date?: string,
  ) {
    return this.pricingService.getPricing(hotelId, roomTypeId, date);
  }

  @Post(':hotelId/:roomTypeId/update')
  async updatePrice(
    @Param('hotelId') hotelId: string,
    @Param('roomTypeId') roomTypeId: string,
    @Body() data: { price: number; reason: string; triggeredBy?: string },
  ) {
    return this.pricingService.updatePrice(hotelId, roomTypeId, data);
  }

  @Get('alerts')
  async getAlerts(@Query('hotelId') hotelId?: string) {
    return this.pricingService.getAlerts(hotelId);
  }
}
