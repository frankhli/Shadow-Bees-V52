# Shadow-Bees V2 后端架构

## 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              前端三端                                     │
├───────────────┬─────────────────┬───────────────────────────────────────┤
│   酒店端       │    集团端        │              管理端                    │
│ localhost:5173│ localhost:5174  │         localhost:5175                │
└───────┬───────┴────────┬────────┴────────────────┬──────────────────────┘
        │                │                         │
        └────────────────┼─────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   API Gateway       │  Port: 3000
              │   (BFF 层)          │
              ├─────────────────────┤
              │  bff-hotel/         │  酒店端聚合
              │  bff-group/         │  集团端聚合
              │  bff-admin/         │  管理端聚合
              └──────────┬──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Hotel        │ │ Order        │ │ Inventory    │
│ Service      │ │ Service      │ │ Service      │
│ Port: 3001   │ │ Port: 3002   │ │ Port: 3003   │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Pricing      │ │ Content      │ │ AI Service   │
│ Service      │ │ Service      │ │ (Python)     │
│ Port: 3004   │ │ Port: 3005   │ │ Port: 5000   │
└──────────────┘ └──────────────┘ └──────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                   数据层                          │
├─────────────────────────────────────────────────┤
│  PostgreSQL (主库)                               │
│  ├── 酒店/房型/订单/库存                           │
│  ├── 价格日志/内容                                │
│  └── 用户/权限                                    │
├─────────────────────────────────────────────────┤
│  Redis (缓存/会话/队列)                          │
└─────────────────────────────────────────────────┘
```

## 服务列表

| 服务 | 端口 | 技术栈 | 职责 |
|------|------|--------|------|
| **Gateway** | 3000 | NestJS | BFF层，三端API聚合 |
| **Hotel** | 3001 | NestJS | 酒店/房型CRUD |
| **Order** | 3002 | NestJS | 订单+事务库存扣减 |
| **Inventory** | 3003 | NestJS | 库存日历管理 |
| **Pricing** | 3004 | NestJS | 定价策略+竞品监控 |
| **Content** | 3005 | NestJS | 内容管理+审核 |
| **AI** | 5000 | Python/FastAPI | GPT文案+定价建议 |

## 核心功能

### 1. 防超卖（订单服务）
```typescript
// 事务 + 乐观锁
await prisma.$transaction(async (tx) => {
  // 1. 查询并锁定库存
  // 2. 检查库存充足
  // 3. updateMany({ version: current }) // 乐观锁
  // 4. 创建订单
}, { isolationLevel: 'Serializable' });
```

### 2. 双池库存
- **otaPool**: OTA渠道库存（携程/美团）
- **shadowPool**: 灵活库存（闲鱼/小红书/微信）
- 独立扣减，互不影响

### 3. AI 定价（MVP规则引擎）
```python
# 定价因子
- 库存紧张度: <20% → +30%
- 临期促销: 1天内 → -15%
- 周末: +20%
- 节假日: +40%
- 竞品: 对比调整
```

### 4. AI 文案生成
- 支持平台：小红书/闲鱼/微信/抖音
- 风格：紧迫/吸引/专业/生活方式
- 自动生成标签+图片建议

## 三端BFF设计

### 酒店端 (`/api/bff/hotel/*`)
| 接口 | 说明 |
|------|------|
| `GET /today-overview` | 今日概览（聚合多服务） |
| `GET /room-status` | 实时房态 |
| `POST /quick-order` | 快捷下单（事务） |

### 集团端 (`/api/bff/group/*`)
| 接口 | 说明 |
|------|------|
| `GET /daily-briefing` | 每日简报（多店聚合） |
| `GET /hotel-panorama` | 门店全景 |
| `GET /hotel-comparison` | 跨店对比 |

### 管理端 (`/api/bff/admin/*`)
| 接口 | 说明 |
|------|------|
| `GET /dashboard` | 平台仪表盘 |
| `GET /audit-queue` | 内容审核队列 |
| `GET /risk/anomalies` | 风控异常 |

## 启动命令

```bash
# 1. 基础设施
cd backend && make db-up

# 2. 数据库初始化
cd packages/shared && npm install
npx prisma migrate dev
npx prisma db seed

# 3. 启动服务（多个终端）
cd packages/gateway && npm install && npm run dev              # 3000
cd packages/services/hotel-service && npm install && npm run dev    # 3001
cd packages/services/order-service && npm install && npm run dev    # 3002
cd packages/services/inventory-service && npm install && npm run dev # 3003
cd packages/ai-service && pip install -r requirements.txt && uvicorn main:app --reload # 5000
```

## 目录结构

```
backend/
├── docker-compose.yml          # PG + Redis
├── packages/
│   ├── shared/
│   │   └── prisma/
│   │       ├── schema.prisma   # 数据库Schema
│   │       └── seed.ts         # 种子数据
│   ├── gateway/                # Port: 3000 (BFF)
│   │   └── src/
│   │       ├── bff-hotel/      # 酒店端聚合
│   │       ├── bff-group/      # 集团端聚合
│   │       └── bff-admin/      # 管理端聚合
│   ├── services/
│   │   ├── hotel-service/      # Port: 3001
│   │   ├── order-service/      # Port: 3002 (防超卖)
│   │   └── inventory-service/  # Port: 3003
│   └── ai-service/             # Port: 5000 (Python)
│       ├── main.py             # FastAPI
│       ├── pricing_engine.py   # 定价引擎
│       └── content_generator.py # 文案生成
└── backup_legacy/              # 旧后端备份
```

## 后续工作

- [ ] 定价服务 (Port: 3004)
- [ ] 内容服务 (Port: 3005)
- [ ] PocketBase → PostgreSQL 数据迁移脚本
- [ ] 前端 API 适配 (替换 mock.ts)
