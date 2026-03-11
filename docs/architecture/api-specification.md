# Shadow-Bees × 华美会 API接口规范

**版本**: v1.0  
**日期**: 2026-03-06  
**协议**: RESTful + WebSocket  
**数据格式**: JSON  

---

## 1. 接口概览

### 1.1 接口分类

| 分类 | 前缀 | 说明 | 优先级 |
|------|------|------|--------|
| **华美会PMS接口** | `/api/huamei/*` | 与华美会系统对接 | P0 |
| **渠道接口** | `/api/channels/*` | 小红书/闲鱼等第三方平台 | P1 |
| **内部服务接口** | `/api/internal/*` | Shadow-Bees内部服务 | P0 |
| **Webhook接口** | `/webhooks/*` | 异步通知回调 | P1 |

### 1.2 通用规范

**请求规范**：
```http
Content-Type: application/json
Authorization: Bearer {token}
X-Request-ID: {uuid}              // 请求唯一标识，用于追踪
X-Client-Version: 1.0.0          // 客户端版本
```

**响应规范**：
```typescript
interface ApiResponse<T> {
  code: number;           // 业务状态码，0表示成功
  message: string;        // 提示信息
  data: T;                // 响应数据
  requestId: string;      // 请求ID，用于问题排查
  timestamp: number;      // 服务器时间戳
}

// 成功响应示例
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "requestId": "req_1234567890",
  "timestamp": 1712345678000
}

// 错误响应示例
{
  "code": 1001,
  "message": "酒店不存在",
  "data": null,
  "requestId": "req_1234567890",
  "timestamp": 1712345678000
}
```

**分页规范**：
```typescript
interface PaginationParams {
  page: number;           // 页码，从1开始
  pageSize: number;       // 每页数量，默认20，最大100
}

interface PaginationResponse<T> {
  list: T[];              // 数据列表
  total: number;          // 总数量
  page: number;           // 当前页码
  pageSize: number;       // 每页数量
  totalPages: number;     // 总页数
}
```

---

## 2. 华美会PMS接口

### 2.1 酒店信息接口

#### 2.1.1 获取酒店列表

```http
GET /api/huamei/hotels
```

**请求参数**：
```typescript
interface GetHotelsRequest {
  page?: number;
  pageSize?: number;
  city?: string;          // 按城市筛选
  status?: 'active' | 'inactive';  // 营业状态
}
```

**响应数据**：
```typescript
interface Hotel {
  id: string;             // 华美会酒店ID
  name: string;           // 酒店名称
  city: string;           // 城市
  address: string;        // 地址
  starRating: number;     // 星级
  roomCount: number;      // 房间总数
  contactPhone: string;   // 联系电话
  status: 'active' | 'inactive';
  pmsHotelId: string;     // PMS系统ID
  createdAt: string;      // ISO 8601格式
}

interface GetHotelsResponse {
  list: Hotel[];
  total: number;
  page: number;
  pageSize: number;
}
```

**错误码**：
| 错误码 | 说明 |
|--------|------|
| 1001 | 权限不足，无法获取酒店列表 |
| 1002 | 参数错误 |

---

#### 2.1.2 获取酒店详情

```http
GET /api/huamei/hotels/{hotelId}
```

**响应数据**：
```typescript
interface HotelDetail extends Hotel {
  roomTypes: RoomType[];  // 房型列表
  facilities: string[];   // 设施列表
  images: string[];       // 酒店图片
  description: string;    // 酒店介绍
}

interface RoomType {
  id: string;
  name: string;
  totalRooms: number;     // 总房间数
  area: number;           // 面积
  bedType: string;        // 床型
  amenities: string[];    // 房间设施
  floorPrice: number;     // 底价（最低价）
  ceilingPrice: number;   // 天花板价（最高价）
  images: string[];       // 房型图片
}
```

---

### 2.2 房态库存接口

#### 2.2.1 查询房态日历

```http
GET /api/huamei/inventory
```

**请求参数**：
```typescript
interface GetInventoryRequest {
  hotelId: string;                    // 酒店ID
  roomTypeId?: string;                // 房型ID，不传则查所有
  startDate: string;                  // 开始日期，YYYY-MM-DD
  endDate: string;                    // 结束日期，YYYY-MM-DD
}
```

**响应数据**：
```typescript
interface InventoryItem {
  date: string;                       // 日期，YYYY-MM-DD
  roomTypeId: string;
  roomTypeName: string;
  totalRooms: number;                 // 总房间数
  availableRooms: number;             // 可售房间数
  occupiedRooms: number;              // 已入住房间数
  bookedRooms: number;                // 已预订房间数
  maintenanceRooms: number;           // 维修房间数
  status: 'open' | 'limited' | 'closed';  // 开房状态
}

interface GetInventoryResponse {
  hotelId: string;
  roomTypes: Array<{
    roomTypeId: string;
    roomTypeName: string;
    inventory: InventoryItem[];
  }>;
}
```

**调用时机**：
- 内容生成时查询房态（用于生成紧迫文案）
- 订单创建前校验库存
- 库存日历页面展示

---

#### 2.2.2 锁定库存（预占）

```http
POST /api/huamei/inventory/lock
```

**请求参数**：
```typescript
interface LockInventoryRequest {
  hotelId: string;
  roomTypeId: string;
  date: string;                       // 入住日期
  nights: number;                     // 连住晚数
  quantity: number;                   // 锁定房间数
  source: string;                     // 来源标识，如"shadow_bees_xianyu"
  sourceOrderId: string;              // 来源订单ID
  expireMinutes: number;              // 锁定过期时间（分钟），默认30
}
```

**响应数据**：
```typescript
interface LockInventoryResponse {
  lockId: string;                     // 锁定记录ID
  expireAt: string;                   // 过期时间
  status: 'locked' | 'failed';
  failReason?: string;
}
```

**业务逻辑**：
1. 调用此接口锁定指定日期的库存
2. 锁定成功后，必须在`expireMinutes`内创建订单，否则自动释放
3. 同一房型同一日期可被多次锁定，但总锁定数不能超过可售库存

**错误码**：
| 错误码 | 说明 |
|--------|------|
| 2001 | 库存不足 |
| 2002 | 该日期已关房 |
| 2003 | 锁定参数错误 |

---

#### 2.2.3 释放库存

```http
POST /api/huamei/inventory/release
```

**请求参数**：
```typescript
interface ReleaseInventoryRequest {
  lockId: string;                     // 锁定记录ID
}
```

**响应数据**：
```typescript
interface ReleaseInventoryResponse {
  success: boolean;
}
```

---

### 2.3 价格接口

#### 2.3.1 查询价格日历

```http
GET /api/huamei/pricing
```

**请求参数**：
```typescript
interface GetPricingRequest {
  hotelId: string;
  roomTypeId?: string;
  startDate: string;
  endDate: string;
}
```

**响应数据**：
```typescript
interface PricingItem {
  date: string;
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;                  // 基础价
  currentPrice: number;               // 当前售价
  floorPrice: number;                 // 底价
  ceilingPrice: number;               // 天花板价
  otaPrice?: number;                  // OTA渠道价格
  directPrice?: number;               // 直销渠道价格
  lastUpdated: string;                // 最后更新时间
}

interface GetPricingResponse {
  hotelId: string;
  pricing: PricingItem[];
}
```

---

#### 2.3.2 修改价格

```http
POST /api/huamei/pricing/update
```

**请求参数**：
```typescript
interface UpdatePricingRequest {
  hotelId: string;
  roomTypeId: string;
  updates: Array<{
    date: string;
    price: number;                    // 新价格
    reason?: string;                  // 调价原因
  }>;
  source: string;                     // 来源，如"shadow_bees_ai"
}
```

**响应数据**：
```typescript
interface UpdatePricingResponse {
  success: boolean;
  updatedCount: number;
  failedDates?: Array<{
    date: string;
    reason: string;
  }>;
}
```

**业务规则**：
- 新价格必须在`floorPrice`和`ceilingPrice`之间
- 批量修改最多支持90天
- 需要记录调价日志

---

### 2.4 订单接口

#### 2.4.1 创建订单

```http
POST /api/huamei/orders
```

**请求参数**：
```typescript
interface CreateOrderRequest {
  // 酒店信息
  hotelId: string;
  roomTypeId: string;
  
  // 入住信息
  checkInDate: string;                // YYYY-MM-DD
  checkOutDate: string;               // YYYY-MM-DD
  nights: number;
  roomCount: number;
  
  // 客人信息
  guestName: string;
  guestPhone: string;
  guestCount: number;
  
  // 价格信息
  totalAmount: number;                // 订单总额
  paidAmount: number;                 // 已支付金额
  pricePerNight: number;              // 每晚单价
  
  // 来源信息（关键）
  source: 'shadow_bees_xianyu' | 'shadow_bees_xiaohongshu' | 'shadow_bees_wechat';
  sourceOrderId: string;              // Shadow-Bees订单号
  sourceAccountId: string;            // 使用的渠道账号ID
  
  // 锁定信息
  lockId?: string;                    // 库存锁定ID（如果有）
  
  // 核销信息
  verificationCode: string;           // 核销码（6位数字）
  verificationExpireAt: string;       // 核销码过期时间
}
```

**响应数据**：
```typescript
interface CreateOrderResponse {
  orderId: string;                    // 华美会订单号
  huameiOrderId: string;
  status: 'confirmed' | 'pending' | 'failed';
  createdAt: string;
  failReason?: string;
}
```

**业务逻辑**：
1. 校验库存（如果传了lockId，则校验锁定有效性）
2. 创建订单，状态为`confirmed`（非标渠道订单通常已付款）
3. 扣减库存
4. 返回华美会订单号

**错误码**：
| 错误码 | 说明 |
|--------|------|
| 3001 | 库存不足 |
| 3002 | 锁定已过期 |
| 3003 | 价格已变动 |
| 3004 | 客人信息不完整 |

---

#### 2.4.2 查询订单

```http
GET /api/huamei/orders/{orderId}
```

**响应数据**：
```typescript
interface Order {
  orderId: string;
  huameiOrderId: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomTypeName: string;
  
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomCount: number;
  
  guestName: string;
  guestPhone: string;
  
  totalAmount: number;
  paidAmount: number;
  
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'refunded';
  
  source: string;
  sourceOrderId: string;
  
  verificationCode: string;
  verificationStatus: 'unused' | 'used' | 'expired';
  verifiedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

---

#### 2.4.3 核销订单

```http
POST /api/huamei/orders/{orderId}/verify
```

**请求参数**：
```typescript
interface VerifyOrderRequest {
  verificationCode: string;           // 核销码
  verifiedBy: string;                 // 核销人
  verifyTime?: string;                // 核销时间，不传则使用服务器时间
}
```

**响应数据**：
```typescript
interface VerifyOrderResponse {
  success: boolean;
  orderStatus: 'checked_in';          // 核销后状态变为已入住
  verifiedAt: string;
}
```

**错误码**：
| 错误码 | 说明 |
|--------|------|
| 4001 | 核销码错误 |
| 4002 | 核销码已过期 |
| 4003 | 订单已核销 |
| 4004 | 订单已取消 |

---

#### 2.4.4 取消订单

```http
POST /api/huamei/orders/{orderId}/cancel
```

**请求参数**：
```typescript
interface CancelOrderRequest {
  reason: string;                     // 取消原因
  cancelledBy: string;                // 取消人
  refundAmount?: number;              // 退款金额
}
```

**响应数据**：
```typescript
interface CancelOrderResponse {
  success: boolean;
  orderStatus: 'cancelled';
  refundedAmount: number;
}
```

---

### 2.5 Webhook回调

Shadow-Bees需要接收华美会的以下事件通知：

#### 2.5.1 订单状态变更

```http
POST /webhooks/huamei/order-status-changed
```

**请求体**：
```typescript
interface OrderStatusChangedWebhook {
  event: 'order.status_changed';
  timestamp: string;
  data: {
    orderId: string;
    huameiOrderId: string;
    previousStatus: string;
    currentStatus: string;
    changedAt: string;
    changedBy: string;
  };
}
```

**业务逻辑**：
- 华美会侧订单状态变更时，通知Shadow-Bees同步更新

---

#### 2.5.2 价格变更

```http
POST /webhooks/huamei/price-changed
```

**请求体**：
```typescript
interface PriceChangedWebhook {
  event: 'pricing.changed';
  timestamp: string;
  data: {
    hotelId: string;
    roomTypeId: string;
    date: string;
    oldPrice: number;
    newPrice: number;
    changedBy: string;
    source: string;
  };
}
```

---

## 3. 渠道接口

### 3.1 小红书接口

#### 3.1.1 发布笔记

```http
POST /api/channels/xiaohongshu/notes
```

**请求参数**：
```typescript
interface PublishXiaohongshuRequest {
  accountId: string;                  // 小红书账号ID
  title: string;                      // 标题
  content: string;                    // 正文
  images: string[];                   // 图片URL列表
  topics: string[];                   // 话题标签
  location?: string;                  // 地理位置
}
```

**响应数据**：
```typescript
interface PublishXiaohongshuResponse {
  success: boolean;
  noteId?: string;                    // 笔记ID
  noteUrl?: string;                   // 笔记链接
  status: 'published' | 'auditing' | 'failed';
  failReason?: string;
}
```

---

#### 3.1.2 查询私信

```http
GET /api/channels/xiaohongshu/messages
```

**请求参数**：
```typescript
interface GetXiaohongshuMessagesRequest {
  accountId: string;
  page?: number;
  pageSize?: number;
  lastMessageId?: string;             // 用于增量拉取
}
```

**响应数据**：
```typescript
interface XiaohongshuMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: 'text' | 'image' | 'order';
  createdAt: string;
  read: boolean;
}
```

---

### 3.2 闲鱼接口

#### 3.2.1 发布宝贝

```http
POST /api/channels/xianyu/items
```

**请求参数**：
```typescript
interface PublishXianyuRequest {
  accountId: string;
  title: string;
  description: string;
  images: string[];
  price: number;
  originalPrice: number;
  category: string;                   // 分类
  location: string;                   // 发货地
}
```

**响应数据**：
```typescript
interface PublishXianyuResponse {
  success: boolean;
  itemId?: string;
  itemUrl?: string;
  status: 'published' | 'auditing' | 'failed';
}
```

---

#### 3.2.2 查询订单

```http
GET /api/channels/xianyu/orders
```

**响应数据**：
```typescript
interface XianyuOrder {
  orderId: string;
  itemId: string;
  itemTitle: string;
  buyerId: string;
  buyerName: string;
  price: number;
  quantity: number;
  totalAmount: number;
  status: 'pending_payment' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  
  // 入住信息（从买家留言中解析）
  guestName?: string;
  guestPhone?: string;
  checkInDate?: string;
  checkOutDate?: string;
}
```

---

## 4. 内部服务接口

### 4.1 内容生成接口

#### 4.1.1 AI生成内容

```http
POST /api/internal/content/generate
```

**请求参数**：
```typescript
interface GenerateContentRequest {
  hotelId: string;
  roomTypeId?: string;
  platform: 'xiaohongshu' | 'xianyu' | 'wechat';
  template: string;                   // 模板ID
  params: {
    highlightFeatures?: string[];     // 突出特色
    urgency?: 'high' | 'medium' | 'low';
    targetAudience?: string;          // 目标人群
    promotionInfo?: string;           // 促销信息
  };
  count?: number;                     // 生成数量，默认3条
}
```

**响应数据**：
```typescript
interface GenerateContentResponse {
  contents: Array<{
    id: string;
    title: string;
    body: string;
    hashtags: string[];
    imageSuggestions: string[];
    qualityScore: number;
    auditStatus: 'passed' | 'review' | 'rejected';
  }>;
}
```

---

### 4.2 实时推演接口

#### 4.2.1 运行推演

```http
POST /api/internal/simulation/run
```

**请求参数**：
```typescript
interface RunSimulationRequest {
  hotelIds: string[];
  scenario: {
    type: 'pricing' | 'content' | 'inventory';
    params: {
      // 定价推演参数
      priceAdjustment?: number;       // 调价幅度
      
      // 内容推演参数
      contentCount?: number;          // 发布内容数量
      platforms?: string[];           // 发布平台
      
      // 库存推演参数
      inventoryAllocation?: string;   // 分配策略
    };
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}
```

**响应数据**：
```typescript
interface RunSimulationResponse {
  simulationId: string;
  results: {
    predictedGMV: number;
    predictedOrders: number;
    predictedOccupancy: number;
    revenueUplift: number;
    riskScore: number;
    confidence: number;
  };
  details: Array<{
    hotelId: string;
    hotelName: string;
    dailyPredictions: Array<{
      date: string;
      predictedOrders: number;
      predictedRevenue: number;
    }>;
  }>;
}
```

---

## 5. 错误码汇总

### 5.1 通用错误码

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 0 | 成功 | - |
| 1 | 系统错误 | 稍后重试 |
| 2 | 参数错误 | 检查请求参数 |
| 3 | 未授权 | 检查token是否过期 |
| 4 | 权限不足 | 联系管理员授权 |
| 5 | 请求过于频繁 | 降低请求频率 |

### 5.2 业务错误码

| 错误码 | 说明 | 所属接口 |
|--------|------|----------|
| 1001 | 酒店不存在 | 酒店相关接口 |
| 1002 | 房型不存在 | 房型相关接口 |
| 2001 | 库存不足 | 库存接口 |
| 2002 | 该日期已关房 | 库存接口 |
| 3001 | 订单创建失败 | 订单接口 |
| 3002 | 订单已取消 | 订单接口 |
| 4001 | 核销码错误 | 核销接口 |
| 4002 | 核销码已过期 | 核销接口 |
| 5001 | 渠道发布失败 | 渠道接口 |
| 5002 | 账号已封禁 | 渠道接口 |

---

## 6. 附录

### 6.1 接口调用流程示例

**场景：在小红书发布内容并接收订单**

```
1. 查询房态（确定库存充足）
   GET /api/huamei/inventory?hotelId=xxx&startDate=2024-03-10&endDate=2024-03-12

2. AI生成内容
   POST /api/internal/content/generate
   
3. 发布到小红书
   POST /api/channels/xiaohongshu/notes
   
4. 定时查询小红书私信（轮询或Webhook）
   GET /api/channels/xiaohongshu/messages
   
5. 用户下单后，解析私信中的入住信息
   
6. 创建华美会订单
   POST /api/huamei/orders
   
7. 用户到店，核销订单
   POST /api/huamei/orders/{orderId}/verify
```

### 6.2 数据同步策略

| 数据 | 同步方式 | 频率 | 说明 |
|------|----------|------|------|
| 酒店列表 | 主动查询 | 每日一次 | 酒店信息相对固定 |
| 房态 | 主动查询 | 实时 | 下单前必须查询最新房态 |
| 价格 | 主动查询 + Webhook | 实时 | 华美会价格变动时Webhook通知 |
| 订单 | Webhook | 实时 | 华美会订单状态变更时通知 |
| 渠道消息 | 轮询 | 每30秒 | 小红书/闲鱼私信轮询 |

---

**文档维护者**: Shadow-Bees Team  
**最后更新**: 2026-03-06
