/**
 * 集团端 BFF (Backend for Frontend)
 * 为集团管理端提供多酒店聚合数据
 * 
 * 特点：
 * - 多酒店数据聚合
 * - 分析型查询（报表、趋势）
 * - 跨店对比
 */

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { GroupBffService } from './group-bff.service';

@Controller('bff/group')
export class GroupBffController {
  constructor(private readonly groupBffService: GroupBffService) {}

  // ==========================================
  // 每日简报（集团仪表盘）
  // ==========================================
  @Get('daily-briefing')
  async getDailyBriefing(
    @Query('groupId') groupId: string,
    @Query('date') date: string,
  ) {
    return this.groupBffService.getDailyBriefing(groupId, date);
  }

  // ==========================================
  // 门店全景（所有酒店概览）
  // ==========================================
  @Get('hotel-panorama')
  async getHotelPanorama(
    @Query('groupId') groupId: string,
    @Query('sortBy') sortBy: string = 'revenue',
  ) {
    return this.groupBffService.getHotelPanorama(groupId, sortBy);
  }

  // ==========================================
  // 跨店对比分析
  // ==========================================
  @Get('hotel-comparison')
  async getHotelComparison(
    @Query('groupId') groupId: string,
    @Query('metric') metric: string = 'revenue', // revenue | occupancy | avgPrice
    @Query('period') period: string = '7d', // 7d | 30d | 90d
  ) {
    return this.groupBffService.getHotelComparison(groupId, metric, period);
  }

  // ==========================================
  // 渠道分析（集团级）
  // ==========================================
  @Get('channel-analysis')
  async getChannelAnalysis(
    @Query('groupId') groupId: string,
    @Query('period') period: string = '30d',
  ) {
    return this.groupBffService.getChannelAnalysis(groupId, period);
  }

  // ==========================================
  // 库存日历（多店聚合）
  // ==========================================
  @Get('inventory-calendar')
  async getInventoryCalendar(
    @Query('groupId') groupId: string,
    @Query('days') days: number = 30,
  ) {
    return this.groupBffService.getInventoryCalendar(groupId, days);
  }

  // ==========================================
  // AI 洞察（集团级）
  // ==========================================
  @Get('ai-insights')
  async getAIInsights(
    @Query('groupId') groupId: string,
  ) {
    return this.groupBffService.getAIInsights(groupId);
  }

  // ==========================================
  // 策略下发
  // ==========================================
  @Post('strategy/apply')
  async applyStrategy(
    @Body() data: {
      groupId: string;
      hotelIds: string[];
      strategy: any;
    },
  ) {
    return this.groupBffService.applyStrategy(data);
  }

  // ==========================================
  // 财务报表（集团级）
  // ==========================================
  @Get('financial-report')
  async getFinancialReport(
    @Query('groupId') groupId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.groupBffService.getFinancialReport(groupId, startDate, endDate);
  }
}
