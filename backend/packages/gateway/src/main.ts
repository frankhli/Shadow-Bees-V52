import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 安全响应头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // 允许跨域嵌入
  }));

  // CORS 配置 - 生产环境限制域名
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProduction
    ? [
        process.env.FRONTEND_URL,           // 主前端地址
        process.env.ADMIN_URL,              // 管理端地址
        process.env.GROUP_URL,              // 集团端地址
      ].filter(Boolean)
    : [
        'http://localhost:5173',   // 酒店端开发
        'http://localhost:5174',   // 集团端开发
        'http://localhost:5175',   // 管理端开发
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // 允许无来源的请求（如移动端、Postman）
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 全局参数校验
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // 过滤未定义的属性
    forbidNonWhitelisted: true, // 禁止未定义的属性
    transform: true,           // 自动类型转换
  }));

  // 全局前缀
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API Gateway running on port ${port}`);
  console.log(`📍 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log('📍 三端BFF路由:');
  console.log('  - 酒店端: /api/bff/hotel/*');
  console.log('  - 集团端: /api/bff/group/*');
  console.log('  - 管理端: /api/bff/admin/*');
}
bootstrap();
