# Shadow-Bees V2 API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api` (开发环境)
- **Content-Type**: `application/json`

## 服务端口

| 服务 | 端口 | 路径前缀 |
|------|------|----------|
| Gateway | 3000 | `/api/*` |
| Hotel | 3001 | `/api/hotels/*` |
| Order | 3002 | `/api/orders/*` |
| Inventory | 3003 | `/api/inventories/*` |
| Pricing | 3004 | `/api/pricing/*` |
| Content | 3005 | `/api/contents/*` |
| AI | 5000 | `/*` |

---

## BFF 层 (Backend for Frontend)

### 酒店端

#### 今日概览
```
GET /bff/hotel/today-overview?hotelId={hotelId}
```

**响应:**
```json
{
  "hotel": { "id": "xxx", "name": "酒店名", "theme": "cyan" },
  "today": {
    "revenue": 5000,
    "orderCount": 12,
    "avgPrice": 420
  },
  "inventory": {
    "totalRooms": 50,
    "availableRooms": 20,
    "occupancyRate": 60
  },
  "alerts": []
}
```

#### 实时房态
```
GET /bff/hotel/room-status?hotelId={hotelId}&date={YYYY-MM-DD}
```

#### 快捷下单
```
POST /bff/hotel/quick-order
```

**请求体:**
```json
{
  "hotelId": "xxx",
  "roomTypeId": "xxx",
  "checkInDate": "2024-03-01",
  "checkOutDate": "2024-03-02",
  "customerName": "张三",
  "customerPhone": "13800138000",
  "platform": "xianyu",
  "price": 350,
  "source": "shadow"
}
```

### 集团端

#### 每日简报
```
GET /bff/group/daily-briefing?groupId={groupId}&date={YYYY-MM-DD}
```

**响应:**
```json
{
  "summary": {
    "totalRevenue": 50000,
    "totalOrders": 120,
    "activeHotels": 5
  },
  "topHotels": [],
  "bottomHotels": []
}
```

#### 门店全景
```
GET /bff/group/hotel-panorama?groupId={groupId}&sortBy=revenue
```

### 管理端

#### 仪表盘
```
GET /bff/admin/dashboard
```

---

## 领域服务 API

### 酒店服务 (Port: 3001)

#### 酒店列表
```
GET /hotels
GET /hotels?city=北京
```

#### 酒店详情
```
GET /hotels/{id}
```

#### 房型列表
```
GET /hotels/{hotelId}/room-types
```

### 订单服务 (Port: 3002)

#### 创建订单
```
POST /orders
```

**请求体:**
```json
{
  "hotelId": "xxx",
  "roomTypeId": "xxx",
  "platform": "xianyu",
  "checkInDate": "2024-03-01",
  "checkOutDate": "2024-03-02",
  "nights": 1,
  "price": 350,
  "totalAmount": 350,
  "inventorySource": "shadow"
}
```

#### 查询订单
```
GET /orders?hotelId={hotelId}&status=paid&limit=20
```

#### 更新状态
```
PATCH /orders/{id}/status
```

**请求体:**
```json
{ "status": "PAID" }
```

### 库存服务 (Port: 3003)

#### 初始化库存日历
```
POST /inventories/{hotelId}/init
```

**请求体:**
```json
{ "days": 365 }
```

#### 查询库存
```
GET /inventories/{hotelId}?date={YYYY-MM-DD}
GET /inventories/{hotelId}/today
```

#### 库存日历
```
GET /inventories/{hotelId}/calendar?days=30
```

### 定价服务 (Port: 3004)

#### 获取建议价格
```
GET /pricing/{hotelId}/{roomTypeId}?date={YYYY-MM-DD}
```

#### 更新价格
```
POST /pricing/{hotelId}/{roomTypeId}/update
```

**请求体:**
```json
{
  "price": 400,
  "reason": "周末溢价"
}
```

#### 预警列表
```
GET /pricing/alerts?hotelId={hotelId}
```

### 内容服务 (Port: 3005)

#### 创建内容
```
POST /contents
```

#### AI生成内容
```
POST /contents/generate
```

**请求体:**
```json
{
  "hotelId": "xxx",
  "platform": "xiaohongshu",
  "hotelName": "酒店名",
  "city": "北京",
  "style": "engaging"
}
```

---

## AI 服务 (Port: 5000)

### 健康检查
```
GET /health
```

### 定价计算
```
POST /pricing/calculate
```

**请求体:**
```json
{
  "hotel_id": "xxx",
  "base_price": 300,
  "inventory_level": 5,
  "total_inventory": 20,
  "date": "2024-03-01"
}
```

**响应:**
```json
{
  "suggested_price": 380,
  "min_price": 240,
  "max_price": 450,
  "confidence": 0.75,
  "factors": [
    { "name": "库存紧张", "impact": 1.3, "reason": "仅剩5间房" }
  ],
  "reason_summary": "库存紧张，建议涨价"
}
```

### 文案生成
```
POST /content/generate
```

**请求体:**
```json
{
  "hotel_id": "xxx",
  "platform": "xiaohongshu",
  "hotel_name": "三里屯精品酒店",
  "city": "北京",
  "highlights": ["地理位置好", "性价比高"]
}
```

**响应:**
```json
{
  "title": "三里屯宝藏酒店｜人均150住出500的感觉",
  "text": "姐妹们！发现一家超宝藏的酒店！...",
  "hashtags": ["#北京酒店", "#三里屯"],
  "image_prompt": "Modern hotel room..."
}
```

---

## 错误码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 409 | 并发冲突（库存不足） |
| 500 | 服务器内部错误 |

## 状态枚举

### 订单状态
- `PENDING` - 待支付
- `PAID` - 已支付
- `CHECKED_IN` - 已入住
- `CHECKED_OUT` - 已退房
- `INVOICED` - 已开票
- `REFUNDED` - 已退款
- `CANCELLED` - 已取消

### 内容状态
- `DRAFT` - 草稿
- `PENDING` - 待审核
- `APPROVED` - 已通过
- `REJECTED` - 已拒绝
- `PUBLISHED` - 已发布

### 库存来源
- `OTA` - OTA渠道
- `SHADOW` - 灵活库存
