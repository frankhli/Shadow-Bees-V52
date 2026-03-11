/**
 * 管理端 BFF (Backend for Frontend)
 * 为 SaaS 运营后台提供平台级数据
 * 
 * 特点：
 * - 全量数据访问
 * - 审核、风控、配置
 * - 平台级运营分析
 */

import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { AdminBffService } from './admin-bff.service';

@Controller('bff/admin')
export class AdminBffController {
  constructor(private readonly adminBffService: AdminBffService) {}

  // ==========================================
  // 平台仪表盘
  // ==========================================
  @Get('dashboard')
  async getDashboard() {
    return this.adminBffService.getDashboard();
  }

  // ==========================================
  // 客户管理（所有酒店）
  // ==========================================
  @Get('customers')
  async getCustomers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.adminBffService.getCustomers(page, limit, status);
  }

  @Get('customers/:id')
  async getCustomerDetail(@Param('id') id: string) {
    return this.adminBffService.getCustomerDetail(id);
  }

  // ==========================================
  // 内容审核
  // ==========================================
  @Get('content/audit-queue')
  async getAuditQueue(
    @Query('status') status: string = 'pending',
    @Query('limit') limit: number = 20,
  ) {
    return this.adminBffService.getAuditQueue(status, limit);
  }

  @Put('content/:id/audit')
  async auditContent(
    @Param('id') id: string,
    @Body() data: { status: 'approved' | 'rejected'; comment?: string },
  ) {
    return this.adminBffService.auditContent(id, data);
  }

  // ==========================================
  // 风控中心
  // ==========================================
  @Get('risk/anomalies')
  async getAnomalies(
    @Query('level') level?: string, // high | medium | low
    @Query('status') status?: string, // open | resolved
  ) {
    return this.adminBffService.getAnomalies(level, status);
  }

  @Get('risk/stats')
  async getRiskStats() {
    return this.adminBffService.getRiskStats();
  }

  // ==========================================
  // 财务对账
  // ==========================================
  @Get('finance/reconciliation')
  async getReconciliation(
    @Query('date') date: string,
    @Query('platform') platform?: string,
  ) {
    return this.adminBffService.getReconciliation(date, platform);
  }

  @Get('finance/settlements')
  async getSettlements(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminBffService.getSettlements(startDate, endDate);
  }

  // ==========================================
  // 系统配置
  // ==========================================
  @Get('system/config')
  async getSystemConfig() {
    return this.adminBffService.getSystemConfig();
  }

  @Put('system/config')
  async updateSystemConfig(@Body() config: any) {
    return this.adminBffService.updateSystemConfig(config);
  }

  // ==========================================
  // 数据仓库（大规模分析）
  // ==========================================
  @Post('warehouse/query')
  async queryDataWarehouse(@Body() query: any) {
    return this.adminBffService.queryDataWarehouse(query);
  }

  @Get('warehouse/metrics')
  async getWarehouseMetrics() {
    return this.adminBffService.getWarehouseMetrics();
  }

  // ==========================================
  // 培训管理
  // ==========================================
  @Get('training/materials')
  async getTrainingMaterials() {
    return this.adminBffService.getTrainingMaterials();
  }

  @Post('training/materials')
  async createTrainingMaterial(@Body() data: any) {
    return this.adminBffService.createTrainingMaterial(data);
  }
}
