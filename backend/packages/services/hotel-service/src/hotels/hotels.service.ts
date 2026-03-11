import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  async create(createHotelDto: CreateHotelDto) {
    return this.prisma.hotel.create({
      data: createHotelDto,
    });
  }

  async findAll(city?: string) {
    const where = city ? { city } : {};
    
    return this.prisma.hotel.findMany({
      where,
      include: {
        _count: {
          select: {
            roomTypes: true,
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: {
        roomTypes: true,
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${id} not found`);
    }

    return hotel;
  }

  async update(id: string, updateHotelDto: UpdateHotelDto) {
    await this.findOne(id); // 确保存在
    
    return this.prisma.hotel.update({
      where: { id },
      data: updateHotelDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // 确保存在
    
    return this.prisma.hotel.delete({
      where: { id },
    });
  }

  async getStats(id: string) {
    const hotel = await this.findOne(id);
    
    const [
      totalOrders,
      totalRevenue,
      todayOrders,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { hotelId: id },
      }),
      this.prisma.order.aggregate({
        where: { hotelId: id },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          hotelId: id,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      hotelId: id,
      hotelName: hotel.name,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      todayOrders,
      roomTypeCount: hotel.roomTypes.length,
    };
  }
}
