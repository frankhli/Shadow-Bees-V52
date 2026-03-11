# Shadow-Bees V2 部署指南

## 部署方式

### 方式一：Docker Compose（推荐）

#### 1. 环境准备

```bash
# 安装 Docker 和 Docker Compose
# https://docs.docker.com/get-docker/

# 验证安装
docker --version
docker-compose --version
```

#### 2. 克隆代码

```bash
git clone <your-repo>
cd shadow-bees-v52/backend
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env
nano .env
```

**关键配置：**
```bash
# 数据库密码（必须修改）
DB_PASSWORD=your-secure-password

# AI 服务 API Key
OPENAI_API_KEY=sk-xxx

# JWT 密钥
JWT_SECRET=your-jwt-secret
```

#### 4. 启动服务

```bash
# 启动所有服务
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps
```

#### 5. 初始化数据库

```bash
# 执行数据库迁移
docker-compose exec gateway npx prisma migrate deploy

# 填充种子数据
docker-compose exec gateway npx prisma db seed
```

#### 6. 验证部署

```bash
# 测试 API
curl http://localhost/api/health
curl http://localhost/api/hotels
```

### 方式二：手动部署

#### 1. 安装依赖

```bash
# 系统依赖：Node.js 20+, PostgreSQL 15, Redis 7

# 全局安装 NestJS CLI
npm install -g @nestjs/cli

# 全局安装 Prisma CLI
npm install -g prisma
```

#### 2. 数据库配置

```bash
# 创建数据库
createdb shadowbees

# 设置环境变量
export DATABASE_URL="postgresql://user:password@localhost:5432/shadowbees"
export REDIS_URL="redis://localhost:6379"
```

#### 3. 部署服务

```bash
# 每个服务独立部署

cd packages/shared
npm install
npx prisma generate
npx prisma migrate deploy

cd ../gateway
npm install
npm run build
npm start

cd ../services/hotel-service
npm install
npm run build
npm start

# ... 其他服务同理
```

### 方式三：Kubernetes

```bash
# 构建镜像
docker build -t shadow-bees/gateway:latest ./packages/gateway
docker build -t shadow-bees/hotel-service:latest ./packages/services/hotel-service
# ... 其他服务

# 应用 K8s 配置
kubectl apply -f k8s/
```

## 生产环境配置

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        root /var/www/shadow-bees;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 数据库备份

```bash
# 自动备份脚本
0 2 * * * pg_dump shadowbees > /backup/shadowbees-$(date +%Y%m%d).sql

# 恢复
psql shadowbees < backup-file.sql
```

### 监控

```bash
# 安装 Prometheus + Grafana
# 或使用云服务监控

# 查看服务状态
docker-compose ps
docker stats
```

## 常见问题

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
docker-compose logs postgres

# 检查连接配置
docker-compose exec gateway env | grep DATABASE
```

### 服务启动顺序

```bash
# 先启动基础设施
docker-compose up -d postgres redis

# 等待健康检查通过
sleep 10

# 再启动业务服务
docker-compose up -d gateway hotel-service order-service
```

### 日志查看

```bash
# 查看所有日志
docker-compose logs

# 查看特定服务
docker-compose logs -f gateway

# 查看最近100行
docker-compose logs --tail=100 gateway
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重建镜像
docker-compose build

# 重启服务
docker-compose up -d

# 执行数据库迁移
docker-compose exec gateway npx prisma migrate deploy
```

## 性能优化

### 数据库

```sql
-- 添加索引
CREATE INDEX idx_orders_hotel_status ON orders(hotel_id, status);
CREATE INDEX idx_inventory_date ON room_inventories(date);
```

### Redis 缓存

```typescript
// 缓存热点数据
const cacheKey = `hotel:${hotelId}:stats`;
let stats = await redis.get(cacheKey);

if (!stats) {
  stats = await calculateStats(hotelId);
  await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5分钟过期
}
```

### 连接池

```typescript
// Prisma 连接池配置
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 20
}
```

## 安全建议

1. **修改默认密码** - 所有默认密码必须修改
2. **启用 HTTPS** - 生产环境必须使用 HTTPS
3. **防火墙配置** - 只开放必要端口
4. **定期更新** - 及时更新依赖包
5. **日志审计** - 启用访问日志和审计日志

## 缩容扩容

```bash
# 水平扩容
docker-compose up -d --scale gateway=3

# 垂直扩容（修改资源限制）
# 编辑 docker-compose.prod.yml 中的 deploy.resources
```
