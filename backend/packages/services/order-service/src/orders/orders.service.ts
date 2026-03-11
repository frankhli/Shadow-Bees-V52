import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 创建订单 + 扣减库存（事务保护）
  // ==========================================
  async create(createOrderDto: CreateOrderDto) {
    const {
      hotelId,
      roomTypeId,
      checkInDate,
      inventorySource,
      ...orderData
    } = createOrderDto;

    // 生成订单号
    const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. 查询并锁定库存记录
      const inventory = await tx.roomInventory.findUnique({
        where: {
          hotelId_roomTypeId_date: {
            hotelId,
            roomTypeId,
            date: new Date(checkInDate),
          },
        },
      });

      if (!inventory) {
        throw new ConflictException('该日期没有库存记录');
      }

      // 2. 检查库存是否充足
      const poolField = inventorySource === 'OTA' ? 'otaPool' : 'shadowPool';
      const soldField = inventorySource === 'OTA' ? 'soldOta' : 'soldShadow';

      if (inventory[poolField] < 1) {
        throw new ConflictException(`${inventorySource} 库存不足`);
      }

      // 3. 扣减库存（乐观锁防止并发超卖）
      const updatedInventory = await tx.roomInventory.updateMany({
        where: {
          AND: [
            { hotelId },
            { roomTypeId },
            { date: new Date(checkInDate) },
          ],
          version: inventory.version, // 乐观锁条件
        },
        data: {
          [poolField]: { decrement: 1 },
          [soldField]: { increment: 1 },
          version: { increment: 1 },
        },
      });

      // 如果更新失败，说明并发冲突
      if (updatedInventory.count === 0) {
        throw new ConflictException('库存并发冲突，请重试');
      }

      // 4. 创建订单
      const order = await tx.order.create({
        data: {
          orderNo,
          hotelId,
          roomTypeId,
          checkInDate: new Date(checkInDate),
          checkOutDate: new Date(orderData.checkOutDate),
          inventorySource,
          status: OrderStatus.PENDING,
          ...orderData,
        },
        include: {
          hotel: true,
          roomType: true,
        },
      });

      return order;
    }, {
      // 事务隔离级别：ReadCommitted 性能更好，乐观锁已防止超卖
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
  }

  // ==========================================
  // 查询订单列表
  // ==========================================
  async findAll(filters: {
    hotelId?: string;
    status?: string;
    date?: string;
    limit?: number;
  }) {
    const where: any = {};

    if (filters.hotelId) {
      where.hotelId = filters.hotelId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // 日期筛选
    if (filters.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filters.date === 'today') {
        where.createdAt = {
          gte: today,
        };
      } else if (filters.date === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        where.createdAt = {
          gte: weekAgo,
        };
      } else if (filters.date === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        where.createdAt = {
          gte: monthAgo,
        };
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        hotel: {
          select: { id: true, name: true },
        },
        roomType: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters.limit || 100,
    });

    return orders;
  }

  // ==========================================
  // 查询单个订单
  // ==========================================
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        hotel: true,
        roomType: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  // ==========================================
  // 更新订单状态
  // ==========================================
  async updateStatus(id: string, status: string) {
    const order = await this.findOne(id);

    // 状态流转验证
    const validTransitions = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.CHECKED_IN, OrderStatus.REFUNDED],
      [OrderStatus.CHECKED_IN]: [OrderStatus.CHECKED_OUT],
      [OrderStatus.CHECKED_OUT]: [OrderStatus.INVOICED],
    };

    const currentStatus = order.status;
    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(status as OrderStatus)) {
      throw new ConflictException(
        `Cannot transition from ${currentStatus} to ${status}`
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: status as OrderStatus },
    });
  }
}
