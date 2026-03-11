# Shadow-Bees V2 后端改造实施指南

## 已完成功能

### 1. 架构设计
- ✅ 微服务架构（酒店/订单/库存/定价/内容/AI）
- ✅ **三端分离设计**（酒店端/集团端/管理端）
- ✅ BFF 层（Backend for Frontend）
- ✅ 数据库 Schema 设计（Prisma）

### 2. 基础设施
- ✅ Docker Compose 配置（PG + Redis）
- ✅ 环境变量模板
- ✅ Makefile 命令
- ✅ 旧后端备份

### 3. 数据库设计
- ✅ Prisma Schema（10 个核心模型）
  - **关键设计：双池库存 + 乐观锁防超卖**
  - 订单记录 inventorySource（追踪 OTA/Shadow 渠道）
- ✅ 种子数据脚本

### 4. BFF 层（三端适配）✨ NEW
```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (Port: 3000)             │
├─────────────────────────────────────────────────────────┤
│  /api/bff/hotel/*    - 酒店端聚合 API                    │
│  /api/bff/group/*    - 集团端聚合 API                    │
│  /api/bff/admin/*    - 管理端聚合 API                    │
└─────────────────────────────────────────────────────────┘
```

| 端 | 特点 | 关键接口 |
|---|------|---------|
| **酒店端** | 单酒店、高频、实时 | `today-overview`, `quick-order`, `room-status` |
| **集团端** | 多酒店聚合、分析 | `daily-briefing`, `hotel-panorama`, `cross-comparison` |
| **管理端** | 全量数据、审核 | `dashboard`, `audit-queue`, `risk-anomalies` |

### 5. 酒店服务（Port: 3001）
- ✅ NestJS 框架 + CRUD API
- ✅ 统计接口

### 6. 订单服务（Port: 3002）✨ NEW
- ✅ **核心：事务性库存扣减（防超卖）**
- ✅ 乐观锁并发控制
- ✅ 订单状态机

---

## 三端 API 对照表

### 酒店端（今日概览）
```
BFF:    GET /api/bff/hotel/today-overview?hotelId=xxx
      ↓ 聚合
服务:   GET /api/hotels/:id
       GET /api/orders?hotelId=xxx&date=today
       GET /api/inventories/:id/today
```

### 集团端（每日简报）
```
BFF:    GET /api/bff/group/daily-briefing?groupId=xxx
      ↓ 聚合多店数据
服务:   GET /api/hotels/:id/stats  (并行 N 个酒店)
       GET /api/orders?hotelId=xxx
```

### 管理端（仪表盘）
```
BFF:    GET /api/bff/admin/dashboard
      ↓ 聚合全平台数据
服务:   GET /api/hotels
       GET /api/orders/stats
       GET /api/contents/stats
```

---

## 核心代码：防超卖实现

```typescript
// 订单服务 - 创建订单时扣减库存
async create(createOrderDto: CreateOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. 查询并锁定库存
    const inventory = await tx.roomInventory.findUnique({
      where: { hotelId_roomTypeId_date: { ... } },
    });

    // 2. 检查库存
    if (inventory.otaPool < 1) throw new Error('库存不足');

    // 3. 扣减库存（乐观锁）
    const updated = await tx.roomInventory.updateMany({
      where: {
        hotelId_roomTypeId_date: { ... },
        version: inventory.version, // 乐观锁条件
      },
      data: {
        otaPool: { decrement: 1 },
        version: { increment: 1 },
      },
    });

    // 4. 如果更新失败，说明并发冲突
    if (updated.count === 0) {
      throw new ConflictException('并发冲突，请重试');
    }

    // 5. 创建订单
    return tx.order.create({ data: { ... } });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
```

---

## 下一步操作

### 第一步：启动基础设施
```bash
cd backend

# 1. 启动 PostgreSQL + Redis
make db-up

# 2. 安装共享包
cd packages/shared
npm install
npx prisma generate

# 3. 执行数据库迁移
npx prisma migrate dev --name init

# 4. 填充种子数据
npx prisma db seed
```

### 第二步：启动服务（三个终端）

```bash
# 终端 1：Gateway (BFF层)
cd packages/gateway
npm install
npm run dev
# 访问: http://localhost:3000
```

```bash
# 终端 2：酒店服务
cd packages/services/hotel-service
npm install
npm run dev
# 访问: http://localhost:3001
```

```bash
# 终端 3：订单服务
cd packages/services/order-service
npm install
npm run dev
# 访问: http://localhost:3002
```

### 第三步：测试三端 API

```bash
# 酒店端 - 今日概览
curl http://localhost:3000/api/bff/hotel/today-overview?hotelId=xxx

# 集团端 - 每日简报
curl http://localhost:3000/api/bff/group/daily-briefing?groupId=xxx

# 管理端 - 仪表盘
curl http://localhost:3000/api/bff/admin/dashboard
```

---

## 剩余工作清单

### 高优先级（本周）
- [ ] 库存服务（Port: 3003）
  - 库存初始化（365天日历）
  - 库存查询（带缓存）
  - 库存调整接口
  
- [ ] 定价服务（Port: 3004）
  - 规则引擎定价
  - 竞品价格监控
  - 价格审计日志

### 中优先级（下周）
- [ ] AI 服务（Python/FastAPI, Port: 5000）
  - GPT 文案生成
  - 定价建议算法
  
- [ ] 内容服务（Port: 3005）
  - 内容 CRUD
  - 审核流程

### 低优先级（第三周）
- [ ] 数据迁移脚本（PocketBase → PostgreSQL）
- [ ] 前端 API 适配（替换 mock.ts）
- [ ] JWT 鉴权中间件
- [ ] 部署文档

---

## 技术决策说明

### 为什么选择 BFF 层？

| 问题 | 解决方案 |
|------|---------|
| 酒店端一个页面需要调 4 个服务 | BFF 聚合为 1 个接口 |
| 集团端需要跨店聚合数据 | BFF 并行查询后汇总 |
| 三端数据权限不同 | BFF 层统一鉴权过滤 |
| 减少前端网络请求 | BFF 聚合减少 RTT |

### 数据范围控制

```
酒店端用户 → hotelIds: ['hotel-a'] → 只能查 hotel-a 的数据
集团端用户 → groupId: 'group-x'  → 能查 group-x 下所有酒店
管理端用户 → role: SUPER_ADMIN    → 能查所有数据
```

---

## 目录结构

```
backend/
├── docker-compose.yml
├── packages/
│   ├── shared/
│   │   └── prisma/
│   │       ├── schema.prisma     # ✅ 数据库 Schema
│   │       └── seed.ts           # ✅ 种子数据
│   ├── gateway/                  # ✅ BFF 层
│   │   └── src/
│   │       ├── bff-hotel/        # ✅ 酒店端聚合
│   │       ├── bff-group/        # ✅ 集团端聚合
│   │       └── bff-admin/        # ✅ 管理端聚合
│   └── services/
│       ├── hotel-service/        # ✅ Port: 3001
│       ├── order-service/        # ✅ Port: 3002 (防超卖)
│       ├── inventory-service/    # ⏳ Port: 3003
│       ├── pricing-service/      # ⏳ Port: 3004
│       └── content-service/      # ⏳ Port: 3005
└── backup_legacy/                # 旧后端备份
```

需要帮助随时告诉我！
