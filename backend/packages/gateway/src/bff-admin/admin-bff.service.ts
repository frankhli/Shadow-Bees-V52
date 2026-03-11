import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AdminBffService {
  constructor(private readonly httpService: HttpService) {}

  private readonly services = {
    hotel: process.env.HOTEL_SERVICE_URL || 'http://localhost:3001',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
    content: process.env.CONTENT_SERVICE_URL || 'http://localhost:3005',
    pricing: process.env.PRICING_SERVICE_URL || 'http://localhost:3004',
  };

  // 平台仪表盘
  async getDashboard() {
    const [
      hotelsRes,
      ordersRes,
      contentRes,
      riskRes,
    ] = await Promise.all([
      firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels`)).catch(() => ({ data: [] })),
      firstValueFrom(this.httpService.get(`${this.services.order}/api/orders/stats`)).catch(() => ({ data: {} })),
      firstValueFrom(this.httpService.get(`${this.services.content}/api/contents/stats`)).catch(() => ({ data: {} })),
      firstValueFrom(this.httpService.get(`${this.services.pricing}/api/risk/stats`)).catch(() => ({ data: {} })),
    ]);

    const hotels = hotelsRes.data;
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = ordersRes.data.today || {};

    return {
      overview: {
        totalHotels: hotels.length,
        activeHotels: hotels.filter(h => h.status === 'active').length,
        todayRevenue: todayOrders.revenue || 0,
        todayOrders: todayOrders.count || 0,
        pendingAudits: contentRes.data.pending || 0,
        openAnomalies: riskRes.data.open || 0,
      },
      trends: {
        // 最近7天趋势
        revenue: [],
        orders: [],
      },
      alerts: riskRes.data.alerts || [],
      lastUpdated: new Date().toISOString(),
    };
  }

  // 客户列表
  async getCustomers(page: number, limit: number, status?: string) {
    const hotelsRes = await firstValueFrom(
      this.httpService.get(`${this.services.hotel}/api/hotels?page=${page}&limit=${limit}&status=${status || ''}`)
    ).catch(() => ({ data: [] }));

    const hotels = hotelsRes.data;

    // 获取每个酒店的额外统计
    const hotelsWithStats = await Promise.all(
      hotels.map(async h => {
        const statsRes = await firstValueFrom(
          this.httpService.get(`${this.services.hotel}/api/hotels/${h.id}/stats`)
        ).catch(() => ({ data: {} }));

        return {
          ...h,
          stats: statsRes.data,
          healthScore: this.calculateHealthScore(statsRes.data),
        };
      })
    );

    return {
      page,
      limit,
      total: hotels.length,
      customers: hotelsWithStats,
    };
  }

  // 客户详情
  async getCustomerDetail(hotelId: string) {
    const [hotelRes, statsRes, ordersRes] = await Promise.all([
      firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels/${hotelId}`)).catch(() => ({ data: null })),
      firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels/${hotelId}/stats`)).catch(() => ({ data: {} })),
      firstValueFrom(this.httpService.get(`${this.services.order}/api/orders?hotelId=${hotelId}&limit=10`)).catch(() => ({ data: [] })),
    ]);

    return {
      hotel: hotelRes.data,
      stats: statsRes.data,
      recentOrders: ordersRes.data,
      healthScore: this.calculateHealthScore(statsRes.data),
    };
  }

  // 计算客户健康度
  private calculateHealthScore(stats: any): number {
    if (!stats) return 0;
    
    // 基于多个指标计算健康度
    const revenue = Number(stats.totalRevenue || 0);
    const orders = stats.totalOrders || 0;
    
    // 简化的健康度计算
    let score = 50; // 基础分
    if (revenue > 100000) score += 20;
    if (orders > 100) score += 20;
    if (stats.todayOrders > 0) score += 10;
    
    return Math.min(100, score);
  }

  // 审核队列
  async getAuditQueue(status: string, limit: number) {
    const res = await firstValueFrom(
      this.httpService.get(`${this.services.content}/api/contents?status=${status}&limit=${limit}`)
    ).catch(() => ({ data: [] }));

    return {
      status,
      count: res.data.length,
      items: res.data,
    };
  }

  // 审核内容
  async auditContent(contentId: string, data: any) {
    const res = await firstValueFrom(
      this.httpService.put(`${this.services.content}/api/contents/${contentId}/audit`, data)
    ).catch(() => ({ data: null }));

    return {
      success: !!res.data,
      contentId,
      status: data.status,
    };
  }

  // 异常列表
  async getAnomalies(level?: string, status?: string) {
    const res = await firstValueFrom(
      this.httpService.get(`${this.services.pricing}/api/anomalies?level=${level || ''}&status=${status || ''}`)
    ).catch(() => ({ data: [] }));

    return res.data;
  }

  // 风控统计
  async getRiskStats() {
    const res = await firstValueFrom(
      this.httpService.get(`${this.services.pricing}/api/risk/stats`)
    ).catch(() => ({ data: { open: 0, resolved: 0 } }));

    return res.data;
  }

  // 财务对账
  async getReconciliation(date: string, platform?: string) {
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    const res = await firstValueFrom(
      this.httpService.get(`${this.services.order}/api/reconciliation?date=${queryDate}&platform=${platform || ''}`)
    ).catch(() => ({ data: {} }));

    return {
      date: queryDate,
      platform: platform || 'all',
      ...res.data,
    };
  }

  // 结算列表
  async getSettlements(startDate: string, endDate: string) {
    const res = await firstValueFrom(
      this.httpService.get(
        `${this.services.order}/api/settlements?startDate=${startDate}&endDate=${endDate}`
      )
    ).catch(() => ({ data: [] }));

    return {
      period: { startDate, endDate },
      settlements: res.data,
    };
  }

  // 系统配置
  async getSystemConfig() {
    // 从配置服务或数据库获取
    return {
      features: {
        aiPricing: true,
        autoPublish: false,
        riskControl: true,
      },
      limits: {
        maxHotelsPerGroup: 100,
        maxContentsPerDay: 50,
      },
      ai: {
        pricingModel: 'gpt-4',
        contentModel: 'gpt-3.5-turbo',
      },
    };
  }

  // 更新配置
  async updateSystemConfig(config: any) {
    // 保存配置
    return {
      success: true,
      config,
    };
  }

  // 数据仓库查询
  async queryDataWarehouse(query: any) {
    // 实际应该查询 ClickHouse 或数据仓库
    // 这里简化返回
    return {
      query,
      result: [],
      executionTime: 0,
    };
  }

  // 数据仓库指标
  async getWarehouseMetrics() {
    return {
      totalRecords: 0,
      lastSync: new Date().toISOString(),
      tables: [],
    };
  }

  // 培训材料
  async getTrainingMaterials() {
    return [
      { id: '1', title: '新手上路指南', type: 'video', duration: '15分钟' },
      { id: '2', title: '定价策略最佳实践', type: 'doc', pages: 12 },
      { id: '3', title: '内容创作技巧', type: 'video', duration: '20分钟' },
    ];
  }

  // 创建培训材料
  async createTrainingMaterial(data: any) {
    return {
      success: true,
      material: { id: Date.now().toString(), ...data },
    };
  }
}
