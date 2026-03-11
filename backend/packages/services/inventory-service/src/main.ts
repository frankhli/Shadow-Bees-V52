import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  app.enableCors();
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3003;
  await app.listen(port);
  
  console.log(`📦 Inventory Service running on port ${port}`);
  console.log('💡 核心功能：库存日历管理 + 双池库存扣减');
}
bootstrap();
