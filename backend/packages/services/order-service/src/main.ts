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
  
  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  console.log(`📝 Order Service running on port ${port}`);
  console.log('💡 核心功能：创建订单 + 事务性库存扣减（防超卖）');
}
bootstrap();
