import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomTypeDto: CreateRoomTypeDto) {
    return this.prisma.roomType.create({
      data: createRoomTypeDto,
    });
  }

  async findAll(hotelId?: string) {
    const where = hotelId ? { hotelId } : {};
    
    return this.prisma.roomType.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        hotel: true,
        inventories: {
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${id} not found`);
    }

    return roomType;
  }

  async update(id: string, updateRoomTypeDto: UpdateRoomTypeDto) {
    await this.findOne(id);
    
    return this.prisma.roomType.update({
      where: { id },
      data: updateRoomTypeDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    
    return this.prisma.roomType.delete({
      where: { id },
    });
  }
}
