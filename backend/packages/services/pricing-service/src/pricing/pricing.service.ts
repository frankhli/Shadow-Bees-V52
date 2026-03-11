import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PricingService {
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async getPricing(hotelId: string, roomTypeId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) throw new Error('房型不存在');

    const inventory = await this.prisma.roomInventory.findUnique({
      where: {
        hotelId_roomTypeId_date: {
          hotelId,
          roomTypeId,
          date: new Date(targetDate),
        },
      },
    });

    try {
      const aiRes = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/pricing/calculate`, {
          hotel_id: hotelId,
          room_type_id: roomTypeId,
          base_price: Number(roomType.floorPrice),
          inventory_level: inventory ? inventory.otaPool + inventory.shadowPool : 10,
          total_inventory: roomType.totalInventory,
          date: targetDate,
          is_weekend: [0, 6].includes(new Date(targetDate).getDay()),
        })
      );

      return {
        hotelId,
        roomTypeId,
        date: targetDate,
        currentPrice: roomType.currentPrice,
        floorPrice: roomType.floorPrice,
        ceilingPrice: roomType.ceilingPrice,
        aiSuggestion: aiRes.data,
      };
    } catch (error) {
      return {
        hotelId,
        roomTypeId,
        date: targetDate,
        currentPrice: roomType.currentPrice,
        aiSuggestion: null,
      };
    }
  }

  async updatePrice(hotelId: string, roomTypeId: string, data: any) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    await this.prisma.roomType.update({
      where: { id: roomTypeId },
      data: { currentPrice: data.price },
    });

    const log = await this.prisma.priceLog.create({
      data: {
        hotelId,
        roomTypeId,
        oldPrice: roomType.currentPrice || roomType.floorPrice,
        newPrice: data.price,
        reason: data.reason,
        triggeredBy: data.triggeredBy || 'user',
      },
    });

    return { success: true, logId: log.id };
  }

  async getAlerts(hotelId?: string) {
    const where: any = {};
    if (hotelId) where.hotelId = hotelId;

    const lowInventory = await this.prisma.roomInventory.findMany({
      where: {
        ...where,
        OR: [{ otaPool: { lte: 2 } }, { shadowPool: { lte: 2 } }],
      },
      include: { roomType: true },
    });

    return lowInventory.map(inv => ({
      type: 'low_inventory',
      level: inv.otaPool + inv.shadowPool <= 2 ? 'high' : 'medium',
      hotelId: inv.hotelId,
      message: `${inv.roomType.name} 库存紧张，仅剩 ${inv.otaPool + inv.shadowPool} 间`,
    }));
  }
}
