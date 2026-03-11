import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HotelBffService {
  constructor(private readonly httpService: HttpService) {}

  private readonly services = {
    hotel: process.env.HOTEL_SERVICE_URL || 'http://localhost:3001',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
    pricing: process.env.PRICING_SERVICE_URL || 'http://localhost:3004',
    content: process.env.CONTENT_SERVICE_URL || 'http://localhost:3005',
    ai: process.env.AI_SERVICE_URL || 'http://localhost:5000',
  };

  // 今日概览（聚合多个服务数据）
  async getTodayOverview(hotelId: string) {
    // 并行请求多个服务
    const [
      hotelRes,
      todayOrdersRes,
      inventoryRes,
    ] = await Promise.all([
      firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels/${hotelId}`)).catch(() => ({ data: null })),
      firstValueFrom(this.httpService.get(`${this.services.order}/api/orders?hotelId=${hotelId}`)).catch(() => ({ data: [] })),
      firstValueFrom(this.httpService.get(`${this.services.inventory}/api/inventories/${hotelId}/today`)).catch(() => ({ data: {} })),
    ]);

    const hotel = hotelRes.data;
    const todayOrders = todayOrdersRes.data;
    const inventory = inventoryRes.data;

    const totalRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    
    return {
      hotel: hotel ? { id: hotel.id, name: hotel.name, theme: hotel.theme } : null,
      today: {
        revenue: totalRevenue,
        orderCount: todayOrders.length,
        avgPrice: todayOrders.length > 0 ? Math.round(totalRevenue / todayOrders.length) : 0,
      },
      inventory: {
        totalRooms: inventory.totalRooms || 0,
        availableRooms: inventory.availableRooms || 0,
        occupancyRate: inventory.occupancyRate || 0,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // 实时房态
  async getRoomStatus(hotelId: string, date: string) {
    const [roomTypesRes, inventoryRes] = await Promise.all([
      firstValueFrom(this.httpService.get(`${this.services.hotel}/api/hotels/${hotelId}/room-types`)).catch(() => ({ data: [] })),
      firstValueFrom(this.httpService.get(`${this.services.inventory}/api/inventories/${hotelId}?date=${date}`)).catch(() => ({ data: [] })),
    ]);

    const roomTypes = roomTypesRes.data;
    const inventories = inventoryRes.data;

    return roomTypes.map(rt => {
      const inv = inventories.find(i => i.roomTypeId === rt.id);
      return {
        roomTypeId: rt.id,
        name: rt.name,
        total: rt.totalInventory,
        available: inv ? inv.otaPool + inv.shadowPool : 0,
        sold: inv ? inv.soldOta + inv.soldShadow : 0,
        currentPrice: rt.currentPrice,
      };
    });
  }

  // 库存看板
  async getInventoryBoard(hotelId: string, days: number) {
    const res = await firstValueFrom(
      this.httpService.get(`${this.services.inventory}/api/inventories/${hotelId}/calendar?days=${days}`)
    ).catch(() => ({ data: [] }));

    return { hotelId, days, calendar: res.data };
  }

  // 定价面板
  async getPricingPanel(hotelId: string, roomTypeId: string) {
    const [roomTypeRes, pricingRes] = await Promise.all([
      firstValueFrom(this.httpService.get(`${this.services.hotel}/api/room-types/${roomTypeId}`)).catch(() => ({ data: null })),
      firstValueFrom(this.httpService.get(`${this.services.pricing}/api/pricing/${hotelId}/${roomTypeId}`)).catch(() => ({ data: null })),
    ]);

    return {
      roomType: roomTypeRes.data,
      currentPricing: pricingRes.data,
    };
  }

  // 快捷下单
  async createQuickOrder(data: any) {
    // 1. 扣减库存
    const deductRes = await firstValueFrom(
      this.httpService.post(`${this.services.inventory}/api/inventories/deduct`, {
        hotelId: data.hotelId,
        roomTypeId: data.roomTypeId,
        date: data.checkInDate,
        quantity: 1,
        source: data.source,
      })
    ).catch(err => {
      throw new HttpException('库存不足或扣减失败', HttpStatus.CONFLICT);
    });

    // 2. 创建订单
    const orderRes = await firstValueFrom(
      this.httpService.post(`${this.services.order}/api/orders`, {
        ...data,
        inventorySource: data.source,
      })
    ).catch(async err => {
      // 补偿：恢复库存
      // TODO: 发送补偿消息
      throw new HttpException('订单创建失败', HttpStatus.INTERNAL_SERVER_ERROR);
    });

    return { success: true, order: orderRes.data };
  }

  // 待处理订单
  async getPendingOrders(hotelId: string, limit: number) {
    const res = await firstValueFrom(
      this.httpService.get(`${this.services.order}/api/orders?hotelId=${hotelId}&status=pending&limit=${limit}`)
    ).catch(() => ({ data: [] }));

    return res.data;
  }
}
