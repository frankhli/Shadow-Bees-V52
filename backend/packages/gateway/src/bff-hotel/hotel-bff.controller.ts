/**
 * 酒店端 BFF (Backend for Frontend)
 * 为酒店端提供聚合API，减少前端请求次数
 * 
 * 特点：
 * - 单酒店数据范围
 * - 实时性要求高
 * - 高频操作：下单、改价、查房态
 */

import { Controller, Get, Post, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { HotelBffService } from './hotel-bff.service';
import { CACHE_TTL } from '../config/cache.config';

@Controller('bff/hotel')
@UseInterceptors(CacheInterceptor)
export class HotelBffController {
  constructor(private readonly hotelBffService: HotelBffService) {}

  // 今日概览（酒店端首页）- 缓存 30 秒
  @Get('today-overview')
  @CacheTTL(CACHE_TTL.HOTEL_OVERVIEW)
  async getTodayOverview(@Query('hotelId') hotelId: string) {
    return this.hotelBffService.getTodayOverview(hotelId);
  }

  // 实时房态 - 缓存 10 秒（实时性高）
  @Get('room-status')
  @CacheTTL(CACHE_TTL.ROOM_STATUS)
  async getRoomStatus(
    @Query('hotelId') hotelId: string,
    @Query('date') date: string,
  ) {
    return this.hotelBffService.getRoomStatus(hotelId, date || new Date().toISOString().split('T')[0]);
  }

  // 库存看板 - 缓存 60 秒
  @Get('inventory-board')
  @CacheTTL(CACHE_TTL.INVENTORY_BOARD)
  async getInventoryBoard(
    @Query('hotelId') hotelId: string,
    @Query('days') days: number = 14,
  ) {
    return this.hotelBffService.getInventoryBoard(hotelId, days);
  }

  // 定价面板 - 缓存 30 秒
  @Get('pricing-panel')
  @CacheTTL(CACHE_TTL.PRICING_PANEL)
  async getPricingPanel(
    @Query('hotelId') hotelId: string,
    @Query('roomTypeId') roomTypeId: string,
  ) {
    return this.hotelBffService.getPricingPanel(hotelId, roomTypeId);
  }

  // 快捷下单 - 不缓存（写操作）
  @Post('quick-order')
  async createQuickOrder(@Body() data: any) {
    return this.hotelBffService.createQuickOrder(data);
  }

  // 待处理订单 - 缓存 10 秒
  @Get('pending-orders')
  @CacheTTL(CACHE_TTL.PENDING_ORDERS)
  async getPendingOrders(
    @Query('hotelId') hotelId: string,
    @Query('limit') limit: number = 20,
  ) {
    return this.hotelBffService.getPendingOrders(hotelId, limit);
  }
}
