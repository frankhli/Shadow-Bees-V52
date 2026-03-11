import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ContentService {
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async create(data: any) {
    return this.prisma.content.create({
      data: {
        hotelId: data.hotelId,
        platform: data.platform,
        contentType: data.contentType || 'TEXT',
        title: data.title,
        content: data.content,
        status: data.status || 'DRAFT',
      },
    });
  }

  async findAll(filters: any) {
    const where: any = {};
    if (filters.hotelId) where.hotelId = filters.hotelId;
    if (filters.status) where.status = filters.status;
    if (filters.platform) where.platform = filters.platform;

    return this.prisma.content.findMany({
      where,
      include: {
        hotel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.content.findUnique({
      where: { id },
      include: { hotel: true },
    });
  }

  async updateStatus(id: string, data: any) {
    return this.prisma.content.update({
      where: { id },
      data: {
        status: data.status,
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date(),
      },
    });
  }

  async generateWithAI(data: any) {
    try {
      const aiRes = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/content/generate`, {
          hotel_id: data.hotelId,
          platform: data.platform,
          style: data.style || 'engaging',
          hotel_name: data.hotelName,
          city: data.city,
          highlights: data.highlights || [],
          current_price: data.currentPrice,
        })
      );

      const aiContent = aiRes.data;

      // 创建内容记录
      const content = await this.prisma.content.create({
        data: {
          hotelId: data.hotelId,
          platform: data.platform,
          contentType: 'TEXT',
          title: aiContent.title,
          content: aiContent.text,
          rawOutput: JSON.stringify(aiContent),
          status: 'PENDING',
        },
      });

      return {
        success: true,
        content,
        aiGenerated: true,
        hashtags: aiContent.hashtags,
      };
    } catch (error) {
      return {
        success: false,
        error: 'AI生成失败',
      };
    }
  }

  async publish(id: string) {
    const content = await this.findOne(id);
    
    if (content.status !== 'APPROVED') {
      return { success: false, error: '内容未通过审核' };
    }

    // 实际应该调用各平台API发布
    // 这里仅更新状态
    await this.prisma.content.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return { success: true, message: '发布成功' };
  }

  async getStats() {
    const [total, byStatus, byPlatform] = await Promise.all([
      this.prisma.content.count(),
      this.prisma.content.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.content.groupBy({
        by: ['platform'],
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      byPlatform: byPlatform.reduce((acc, p) => ({ ...acc, [p.platform]: p._count }), {}),
    };
  }
}
