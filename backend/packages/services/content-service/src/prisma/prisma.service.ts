import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://sb_admin:shadowbees123@localhost:5432/shadowbees',
        },
      },
      // 日志配置（生产环境可调低）
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('📦 Connected to database');
    
    // 连接池配置通过 DATABASE_URL 参数控制
    // 示例: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
