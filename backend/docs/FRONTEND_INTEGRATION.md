# 前端 API 适配指南

## 概述

从 `mock.ts` (localStorage) 迁移到新的微服务后端。

## API 地址变更

| 环境 | 旧地址 | 新地址 |
|------|--------|--------|
| Mock | localStorage | - |
| PocketBase | `http://127.0.0.1:8090/api` | 废弃 |
| **新后端** | - | `http://localhost:3000/api` (Gateway) |

## 快速切换

修改 `src/api/index.ts`:

```typescript
// 修改前
const API_BASE_URL = 'http://127.0.0.1:8090/api';

// 修改后
const API_BASE_URL = 'http://localhost:3000/api';
```

## API 映射表

### 酒店端

| 功能 | 旧接口 | 新接口 (BFF) |
|------|--------|--------------|
| 今日概览 | mock | `GET /api/bff/hotel/today-overview?hotelId=xxx` |
| 房态查询 | mock | `GET /api/bff/hotel/room-status?hotelId=xxx&date=xxx` |
| 快捷下单 | mock | `POST /api/bff/hotel/quick-order` |
| 定价面板 | mock | `GET /api/bff/hotel/pricing-panel?hotelId=xxx&roomTypeId=xxx` |

### 集团端

| 功能 | 旧接口 | 新接口 (BFF) |
|------|--------|--------------|
| 每日简报 | mock | `GET /api/bff/group/daily-briefing?groupId=xxx` |
| 门店全景 | mock | `GET /api/bff/group/hotel-panorama?groupId=xxx` |
| 跨店对比 | mock | `GET /api/bff/group/hotel-comparison?groupId=xxx` |
| 渠道分析 | mock | `GET /api/bff/group/channel-analysis?groupId=xxx` |

### 管理端

| 功能 | 旧接口 | 新接口 (BFF) |
|------|--------|--------------|
| 仪表盘 | mock | `GET /api/bff/admin/dashboard` |
| 客户列表 | mock | `GET /api/bff/admin/customers` |
| 审核队列 | mock | `GET /api/bff/admin/content/audit-queue` |
| 风控异常 | mock | `GET /api/bff/admin/risk/anomalies` |

## 直接调用领域服务

如果需要直接调用底层服务：

```typescript
// 酒店服务 (Port: 3001)
GET  http://localhost:3001/api/hotels
GET  http://localhost:3001/api/hotels/:id
POST http://localhost:3001/api/hotels

// 订单服务 (Port: 3002)
GET  http://localhost:3002/api/orders?hotelId=xxx
POST http://localhost:3002/api/orders
PATCH http://localhost:3002/api/orders/:id/status

// 库存服务 (Port: 3003)
GET  http://localhost:3003/api/inventories/:hotelId?date=xxx
POST http://localhost:3003/api/inventories/:hotelId/init
POST http://localhost:3003/api/inventories/deduct

// 定价服务 (Port: 3004)
GET  http://localhost:3004/api/pricing/:hotelId/:roomTypeId
POST http://localhost:3004/api/pricing/:hotelId/:roomTypeId/update

// 内容服务 (Port: 3005)
GET  http://localhost:3005/api/contents?hotelId=xxx
POST http://localhost:3005/api/contents
POST http://localhost:3005/api/contents/generate

// AI 服务 (Port: 5000)
POST http://localhost:5000/pricing/calculate
POST http://localhost:5000/content/generate
```

## 代码示例

### 酒店端 - 获取今日概览

```typescript
// src/api/index.ts

async getDashboardStats(hotelId: string) {
  // 新后端调用
  const response = await fetch(
    `${API_BASE_URL}/bff/hotel/today-overview?hotelId=${hotelId}`
  );
  return response.json();
}
```

### 集团端 - 获取每日简报

```typescript
// src/group/services/api.ts

async getDailyBriefing(groupId: string) {
  const response = await fetch(
    `${API_BASE_URL}/bff/group/daily-briefing?groupId=${groupId}`
  );
  return response.json();
}
```

### 快捷下单（事务）

```typescript
async createQuickOrder(data: {
  hotelId: string;
  roomTypeId: string;
  checkInDate: string;
  customerName: string;
  price: number;
  source: 'ota' | 'shadow';
}) {
  const response = await fetch(`${API_BASE_URL}/bff/hotel/quick-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

## 数据格式变化

### 订单对象

```typescript
// 旧格式 (PocketBase)
{
  id: "xxx",
  hotel: "hotel_id",  // 关系字段
  room_type: "room_id",
  order_no: "ORD001",
  status: "paid",
  // ...
}

// 新格式 (Prisma)
{
  id: "xxx",
  hotelId: "hotel_id",      // 统一命名
  roomTypeId: "room_id",
  orderNo: "ORD001",
  status: "PAID",           // 枚举大写
  inventorySource: "SHADOW", // 新增：库存来源追踪
  // ...
}
```

## 启动测试

```bash
# 1. 确保后端服务已启动
cd backend
make db-up  # 启动数据库

# 2. 启动各个服务（多个终端）
npm run dev --workspace=@shadow-bees/gateway
npm run dev --workspace=@shadow-bees/hotel-service
npm run dev --workspace=@shadow-bees/order-service
npm run dev --workspace=@shadow-bees/inventory-service

# 3. AI 服务
cd packages/ai-service
uvicorn main:app --reload --port 5000

# 4. 测试 API
curl http://localhost:3000/api/bff/hotel/today-overview?hotelId=xxx
```

## 常见问题

### Q: 数据库里没有数据？
A: 先运行种子数据或迁移脚本：
```bash
cd packages/shared && npx prisma db seed
cd scripts && npm run migrate:pb
```

### Q: AI 服务不可用？
A: 检查 AI 服务是否启动，或 API Key 是否配置：
```bash
cd packages/ai-service
cp .env.example .env
# 编辑 .env 填入 OPENAI_API_KEY
uvicorn main:app --reload
```

### Q: 跨域错误？
A: Gateway 已配置 CORS，确保前端访问 `localhost:3000`

## 迁移步骤

1. **备份现有数据**
   ```bash
   cp -r src/api src/api.backup
   ```

2. **修改 API 地址**
   - 更新 `src/api/index.ts` 中的 `API_BASE_URL`

3. **逐个替换接口**
   - 从简单查询开始（酒店列表）
   - 再到复杂操作（下单）

4. **测试验证**
   - 检查数据一致性
   - 验证库存扣减

5. **删除 mock 代码**
   - 确认所有接口迁移完成后，删除 `mock.ts`
