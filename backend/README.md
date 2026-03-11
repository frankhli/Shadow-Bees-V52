# Shadow-Bees V2 后端

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                         前端三端                              │
│        酒店端          集团端           管理端                │
└───────────┬────────────────┬─────────────────┬──────────────┘
            │                │                 │
            └────────────────┼─────────────────┘
                             │
                  ┌──────────▼──────────┐
                  │   API Gateway       │  Port: 3000
                  │   (BFF 层)          │
                  └──────────┬──────────┘
                             │
     ┌───────────┬───────────┼───────────┬───────────┐
     │           │           │           │           │
     ▼           ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Hotel  │ │  Order  │ │Inventory│ │ Pricing │ │ Content │
│ Service │ │ Service │ │ Service │ │ Service │ │ Service │
│ :3001   │ │ :3002   │ │ :3003   │ │ :3004   │ │ :3005   │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │           │
     └───────────┴───────────┴───────────┴───────────┘
                             │
                  ┌──────────▼──────────┐
                  │   AI Service        │  Port: 5000
                  │   (Python/FastAPI)  │
                  └─────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │      数据层               │
              │  PostgreSQL + Redis      │
              └──────────────────────────┘
```

## 服务列表

| 服务 | 端口 | 技术栈 | 核心功能 |
|------|------|--------|----------|
| Gateway | 3000 | NestJS | **三端BFF** (酒店/集团/管理) |
| Hotel | 3001 | NestJS | 酒店/房型 CRUD |
| Order | 3002 | NestJS | 订单 + **事务库存扣减** |
| Inventory | 3003 | NestJS | 库存日历管理 + 双池库存 |
| Pricing | 3004 | NestJS | 定价策略 + AI定价集成 |
| Content | 3005 | NestJS | 内容管理 + AI生成 |
| AI | 5000 | Python/FastAPI | GPT文案 + 定价建议 |

## 核心特性

### 1. 防超卖（事务+乐观锁）
```typescript
await prisma.$transaction(async (tx) => {
  const inv = await tx.roomInventory.findUnique({ ... });
  if (inv.otaPool < quantity) throw new Error('库存不足');
  
  // 乐观锁：version 字段防止并发
  await tx.roomInventory.updateMany({
    where: { ..., version: inv.version },
    data: { otaPool: { decrement: 1 }, version: { increment: 1 } }
  });
});
```

### 2. 双池库存
- **otaPool**: OTA渠道库存（携程/美团）
- **shadowPool**: 灵活库存（闲鱼/小红书/微信）
- 独立扣减，互不影响

### 3. AI 定价（规则引擎）
```python
# 定价因子
库存紧张(<20%): +30%
临期促销(1天内): -15%
周末: +20%
节假日: +40%
竞品对比: 动态调整
```

### 4. AI 文案生成
- 支持：小红书/闲鱼/微信/抖音
- 风格：紧迫/吸引/专业/生活方式
- 自动生成：标题 + 正文 + 标签 + 图片建议

## 快速开始

### 1. 启动基础设施
```bash
cd backend
make db-up
```

### 2. 初始化数据库
```bash
cd packages/shared
npm install
npx prisma migrate dev
npx prisma db seed
```

### 3. 启动所有服务

```bash
# 终端1: Gateway
cd packages/gateway && npm install && npm run dev

# 终端2: 酒店服务
cd packages/services/hotel-service && npm install && npm run dev

# 终端3: 订单服务
cd packages/services/order-service && npm install && npm run dev

# 终端4: 库存服务
cd packages/services/inventory-service && npm install && npm run dev

# 终端5: 定价服务
cd packages/services/pricing-service && npm install && npm run dev

# 终端6: 内容服务
cd packages/services/content-service && npm install && npm run dev

# 终端7: AI服务
cd packages/ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 5000
```

### 4. 测试

```bash
# 健康检查
curl http://localhost:3000/api/health
curl http://localhost:5000/health

# 酒店端BFF
curl http://localhost:3000/api/bff/hotel/today-overview?hotelId=xxx

# AI定价
curl -X POST http://localhost:5000/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"hotel_id":"1","base_price":300,"inventory_level":5,"date":"2024-03-01"}'

# AI文案
curl -X POST http://localhost:5000/content/generate \
  -H "Content-Type: application/json" \
  -d '{"hotel_id":"1","platform":"xiaohongshu","hotel_name":"测试酒店","city":"北京"}'
```

## 数据迁移

从 PocketBase 迁移数据：

```bash
cd scripts
npm install
npm run migrate:pb
```

## 项目结构

```
backend/
├── docker-compose.yml          # PG + Redis
├── Makefile                    # 常用命令
├── packages/
│   ├── shared/
│   │   └── prisma/
│   │       ├── schema.prisma   # 数据库Schema
│   │       └── seed.ts         # 种子数据
│   ├── gateway/                # Port: 3000
│   │   └── src/
│   │       ├── bff-hotel/      # 酒店端聚合
│   │       ├── bff-group/      # 集团端聚合
│   │       └── bff-admin/      # 管理端聚合
│   ├── services/
│   │   ├── hotel-service/      # Port: 3001
│   │   ├── order-service/      # Port: 3002 (防超卖)
│   │   ├── inventory-service/  # Port: 3003
│   │   ├── pricing-service/    # Port: 3004
│   │   └── content-service/    # Port: 3005
│   └── ai-service/             # Port: 5000 (Python)
│       ├── main.py             # FastAPI入口
│       ├── pricing_engine.py   # 定价引擎
│       └── content_generator.py # 文案生成
├── scripts/
│   └── migrate-from-pocketbase.ts  # 数据迁移
└── docs/
    ├── ARCHITECTURE_V2.md      # 架构文档
    └── FRONTEND_INTEGRATION.md # 前端适配指南
```

## 前端适配

详见 `docs/FRONTEND_INTEGRATION.md`

快速切换：
```typescript
// src/api/index.ts
const API_BASE_URL = 'http://localhost:3000/api';
```

## 技术栈

- **Backend**: NestJS + TypeScript
- **AI**: Python + FastAPI + OpenAI
- **Database**: PostgreSQL 15 + Prisma
- **Cache**: Redis 7
- **DevOps**: Docker Compose

## 许可证

MIT
