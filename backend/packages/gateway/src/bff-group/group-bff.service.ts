import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GroupBffService {
  constructor(private readonly httpService: HttpService) {}

  private readonly services = {
    hotel: process.env.HOTEL_SERVICE_URL || 'http://localhost:3001',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
    pricing: process.env.PRICING_SERVICE_URL || 'http://localhost:3004',
  };

  // 获取集团下的所有酒店ID
  private async getGroupHotelIds(groupId: string): Promise<string[]> {
    // 实际应该从用户服务或集团服务获取
    // 这里简化处理
    const res = await firstValueFrom(
      this.httpService.get(`${this.services.hotel}/api/groups/${groupId}/hotels`)
    ).catch(() => ({ data: [] }));
    
    return res.data.map(h => h.id);
  }

  // 每日简报
  async getDailyBriefing(groupId: string, date: string) {
    const hotelIds = await this.getGroupHotelIds(groupId);
    
    // 并行获取所有酒店数据
    const hotelStats = await Promise.all(
      hotelIds.map(id => 
        firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels/${id}/stats`))
          .catch(() => ({ data: null }))
      )
    );

    // 聚合计算
    const validStats = hotelStats.map(s => s.data).filter(Boolean);
    const totalRevenue = validStats.reduce((sum, s) => sum + Number(s.totalRevenue || 0), 0);
    const totalOrders = validStats.reduce((sum, s) => sum + (s.totalOrders || 0), 0);
    const todayOrders = validStats.reduce((sum, s) => sum + (s.todayOrders || 0), 0);

    // 计算环比（需要昨日数据，这里简化）
    const momChange = 0.05; // 5% 增长（示例）

    return {
      groupId,
      date: date || new Date().toISOString().split('T')[0],
      summary: {
        totalRevenue,
        totalOrders,
        todayOrders,
        activeHotels: validStats.length,
        avgRevenuePerHotel: validStats.length > 0 ? Math.round(totalRevenue / validStats.length) : 0,
        momChange,
      },
      topHotels: validStats
        .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
        .slice(0, 5),
      bottomHotels: validStats
        .sort((a, b) => Number(a.totalRevenue) - Number(b.totalRevenue))
        .slice(0, 3),
    };
  }

  // 门店全景
  async getHotelPanorama(groupId: string, sortBy: string) {
    const hotelIds = await this.getGroupHotelIds(groupId);
    
    const hotelsData = await Promise.all(
      hotelIds.map(async id => {
        const [hotelRes, statsRes, inventoryRes] = await Promise.all([
          firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels/${id}`)).catch(() => ({ data: null })),
          firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels/${id}/stats`)).catch(() => ({ data: null })),
          firstValueFrom(this.httpService.get(`${this.services.inventory}/api/inventories/${id}/today`)).catch(() => ({ data: null })),
        ]);

        return {
          ...hotelRes.data,
          stats: statsRes.data,
          inventory: inventoryRes.data,
        };
      })
    );

    // 排序
    const sorted = hotelsData.filter(Boolean).sort((a, b) => {
      if (sortBy === 'revenue') return Number(b.stats?.totalRevenue || 0) - Number(a.stats?.totalRevenue || 0);
      if (sortBy === 'occupancy') return (b.inventory?.occupancyRate || 0) - (a.inventory?.occupancyRate || 0);
      return 0;
    });

    return {
      groupId,
      hotelCount: sorted.length,
      hotels: sorted,
    };
  }

  // 跨店对比
  async getHotelComparison(groupId: string, metric: string, period: string) {
    const hotelIds = await this.getGroupHotelIds(groupId);
    
    // 获取各店的历史数据
    const comparisonData = await Promise.all(
      hotelIds.map(async id => {
        const hotelRes = await firstValueFrom(
          this.httpService.get(`${this.services.hotel}/api/hotels/${id}`)
        ).catch(() => ({ data: { name: 'Unknown' } }));

        const ordersRes = await firstValueFrom(
          this.httpService.get(`${this.services.order}/api/orders/analytics?hotelId=${id}&period=${period}`)
        ).catch(() => ({ data: { trend: [] } }));

        return {
          hotelId: id,
          hotelName: hotelRes.data.name,
          data: ordersRes.data,
        };
      })
    );

    return {
      groupId,
      metric,
      period,
      comparison: comparisonData,
    };
  }

  // 渠道分析
  async getChannelAnalysis(groupId: string, period: string) {
    const hotelIds = await this.getGroupHotelIds(groupId);
    
    // 获取所有酒店的订单渠道分布
    const channelData = await Promise.all(
      hotelIds.map(id =>
        firstValueFrom(
          this.httpService.get(`${this.services.order}/api/orders/channels?hotelId=${id}&period=${period}`)
        ).catch(() => ({ data: {} }))
      )
    );

    // 聚合渠道数据
    const aggregated = channelData.reduce((acc, curr) => {
      const data = curr.data;
      Object.keys(data).forEach(channel => {
        acc[channel] = acc[channel] || { count: 0, revenue: 0 };
        acc[channel].count += data[channel].count || 0;
        acc[channel].revenue += data[channel].revenue || 0;
      });
      return acc;
    }, {});

    return {
      groupId,
      period,
      channels: aggregated,
    };
  }

  // 库存日历（多店）
  async getInventoryCalendar(groupId: string, days: number) {
    const hotelIds = await this.getGroupHotelIds(groupId);
    
    const inventoryData = await Promise.all(
      hotelIds.map(async id => {
        const hotelRes = await firstValueFrom(
          this.httpService.get(`${this.services.hotel}/api/hotels/${id}`)
        ).catch(() => ({ data: { name: 'Unknown' } }));

        const calendarRes = await firstValueFrom(
          this.httpService.get(`${this.services.inventory}/api/inventories/${id}/calendar?days=${days}`)
        ).catch(() => ({ data: [] }));

        return {
          hotelId: id,
          hotelName: hotelRes.data.name,
          calendar: calendarRes.data,
        };
      })
    );

    return {
      groupId,
      days,
      hotels: inventoryData,
    };
  }

  // AI 洞察
  async getAIInsights(groupId: string) {
    const hotelIds = await this.getGroupHotelIds(groupId);
    
    // 获取各店的 AI 建议
    const insights = await Promise.all(
      hotelIds.map(async id => {
        const hotelRes = await firstValueFrom(
          this.httpService.get(`${this.services.hotel}/api/hotels/${id}`)
        ).catch(() => ({ data: { name: 'Unknown' } }));

        const pricingRes = await firstValueFrom(
          this.httpService.get(`${this.services.pricing}/api/alerts?hotelId=${id}`)
        ).catch(() => ({ data: [] }));

        return {
          hotelId: id,
          hotelName: hotelRes.data.name,
          alerts: pricingRes.data,
        };
      })
    );

    return {
      groupId,
      insights: insights.filter(i => i.alerts.length > 0),
    };
  }

  // 策略下发
  async applyStrategy(data: any) {
    // 向选中的酒店批量下发策略
    const results = await Promise.all(
      data.hotelIds.map(hotelId =>
        firstValueFrom(
          this.httpService.post(`${this.services.hotel}/api/hotels/${hotelId}/strategies`, data.strategy)
        ).catch(err => ({ success: false, hotelId, error: err.message }))
      )
    );

    return {
      groupId: data.groupId,
      appliedCount: results.filter(r => r.success !== false).length,
      failedCount: results.filter(r => r.success === false).length,
      details: results,
    };
  }

  // 财务报表
  async getFinancialReport(groupId: string, startDate: string, endDate: string) {
    const hotelIds = await this.getGroupHotelIds(groupId);
    
    const financialData = await Promise.all(
      hotelIds.map(async id => {
        const hotelRes = await firstValueFrom(
          this.httpService.get(`${this.services.hotel}/api/hotels/${id}`)
        ).catch(() => ({ data: { name: 'Unknown' } }));

        const ordersRes = await firstValueFrom(
          this.httpService.get(
            `${this.services.order}/api/orders/financial?hotelId=${id}&startDate=${startDate}&endDate=${endDate}`
          )
        ).catch(() => ({ data: { revenue: 0, costs: 0 } }));

        return {
          hotelId: id,
          hotelName: hotelRes.data.name,
          ...ordersRes.data,
        };
      })
    );

    const totalRevenue = financialData.reduce((sum, d) => sum + Number(d.revenue || 0), 0);
    const totalCosts = financialData.reduce((sum, d) => sum + Number(d.costs || 0), 0);

    return {
      groupId,
      period: { startDate, endDate },
      summary: {
        totalRevenue,
        totalCosts,
        grossProfit: totalRevenue - totalCosts,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100).toFixed(2) + '%' : '0%',
      },
      details: financialData,
    };
  }
}
