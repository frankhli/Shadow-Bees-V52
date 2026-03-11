import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { InventoriesService } from './inventories.service';

@Controller('inventories')
export class InventoriesController {
  constructor(private readonly inventoriesService: InventoriesService) {}

  @Post(':hotelId/init')
  async initInventory(@Param('hotelId') hotelId: string, @Body() data: { days?: number }) {
    return this.inventoriesService.initInventory(hotelId, data.days || 365);
  }

  @Get(':hotelId')
  async getInventory(@Param('hotelId') hotelId: string, @Query('date') date: string) {
    return this.inventoriesService.getInventory(hotelId, date);
  }

  @Get(':hotelId/today')
  async getTodayInventory(@Param('hotelId') hotelId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.inventoriesService.getInventory(hotelId, today);
  }

  @Post('deduct')
  async deductInventory(@Body() data: any) {
    return this.inventoriesService.deductInventory(data);
  }
}
