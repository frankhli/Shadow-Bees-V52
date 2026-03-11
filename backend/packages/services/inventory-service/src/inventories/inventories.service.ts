import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoriesService {
  constructor(private prisma: PrismaService) {}

  async initInventory(hotelId: string, days: number = 365) {
    const roomTypes = await this.prisma.roomType.findMany({ where: { hotelId } });
    if (roomTypes.length === 0) throw new NotFoundException('酒店没有配置房型');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inventories = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      for (const rt of roomTypes) {
        inventories.push({
          hotelId,
          roomTypeId: rt.id,
          date,
          otaPool: rt.otaAllocation,
          shadowPool: rt.flexibleAllocation,
          soldOta: 0,
          soldShadow: 0,
          version: 0,
        });
      }
    }

    let created = 0, skipped = 0;
    for (const inv of inventories) {
      try {
        await this.prisma.roomInventory.create({ data: inv });
        created++;
      } catch (e) {
        if (e.code === 'P2002') skipped++;
        else throw e;
      }
    }

    return { hotelId, days, roomTypes: roomTypes.length, created, skipped };
  }

  async getInventory(hotelId: string, date: string) {
    const inventories = await this.prisma.roomInventory.findMany({
      where: { hotelId, date: new Date(date) },
      include: { roomType: { select: { name: true, totalInventory: true } } },
    });

    const totalAvailable = inventories.reduce((sum, inv) => sum + inv.otaPool + inv.shadowPool, 0);
    const totalSold = inventories.reduce((sum, inv) => sum + inv.soldOta + inv.soldShadow, 0);

    return { hotelId, date, totalAvailable, totalSold, details: inventories };
  }

  async deductInventory(data: any) {
    const { hotelId, roomTypeId, date, quantity, source } = data;
    const poolField = source === 'ota' ? 'otaPool' : 'shadowPool';
    const soldField = source === 'ota' ? 'soldOta' : 'soldShadow';

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.roomInventory.findFirst({
        where: {
          AND: [
            { hotelId },
            { roomTypeId },
            { date: new Date(date) },
          ],
        },
      });

      if (!inventory) throw new NotFoundException('库存记录不存在');
      if (inventory[poolField] < quantity) throw new ConflictException('库存不足');

      const updated = await tx.roomInventory.updateMany({
        where: {
          AND: [
            { hotelId },
            { roomTypeId },
            { date: new Date(date) },
          ],
          version: inventory.version,
        },
        data: { [poolField]: { decrement: quantity }, [soldField]: { increment: quantity }, version: { increment: 1 } },
      });

      if (updated.count === 0) throw new ConflictException('并发冲突');

      return { success: true, deducted: quantity, remaining: inventory[poolField] - quantity };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }
}
