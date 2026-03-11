import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('contents')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // 创建内容
  @Post()
  async create(@Body() data: any) {
    return this.contentService.create(data);
  }

  // 查询内容列表
  @Get()
  async findAll(
    @Query('hotelId') hotelId?: string,
    @Query('status') status?: string,
    @Query('platform') platform?: string,
  ) {
    return this.contentService.findAll({ hotelId, status, platform });
  }

  // 查询单个内容
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  // 更新内容状态（审核）
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string; comment?: string },
  ) {
    return this.contentService.updateStatus(id, data);
  }

  // AI生成内容
  @Post('generate')
  async generateContent(@Body() data: any) {
    return this.contentService.generateWithAI(data);
  }

  // 发布内容到平台
  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return this.contentService.publish(id);
  }

  // 获取内容统计
  @Get('stats/overview')
  async getStats() {
    return this.contentService.getStats();
  }
}
