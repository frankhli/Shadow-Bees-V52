# Shadow-Bees × PMS商 集成架构深度分析

## 1. 当前状态 vs PRD规划的对比

### 1.1 PRD规划的外部对接清单

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRD规划的外部系统集成                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PMS系统集成（华美会）                                                    │
│     ├── 对接方式：API + Webhook                                             │
│     ├── 数据同步：双向实时同步                                               │
│     ├── ShadowBees → PMS：调价、调库存                                       │
│     └── PMS → ShadowBees：订单、入住、退房                                   │
│                                                                              │
│  2. 竞品数据接入                                                             │
│     ├── 高德地图酒店API（周边竞品价格）                                      │
│     └── 百度/高德 Events API（周边事件）                                     │
│                                                                              │
│  3. 非标平台API对接                                                          │
│     ├── 闲鱼API：商品发布、价格修改、库存同步、订单获取                      │
│     ├── 小红书API：笔记发布、商品挂载、私信管理、订单转化                    │
│     └── 微信小程序：商品、支付、订单同步、消息推送                           │
│                                                                              │
│  4. AI大模型对接                                                             │
│     ├── DeepSeek（主力）                                                     │
│     ├── 百度文心一言（备用）                                                 │
│     ├── 阿里通义千问（备用）                                                 │
│     └── OpenAI/Claude（备用）                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 当前实现状态

| 对接项 | PRD规划 | 当前状态 | 原因 |
|-------|---------|---------|------|
| PMS集成 | API + Webhook | ❌ mock数据 | 等待客户PMS接口文档 |
| 竞品数据（高德） | 实时抓取 | ❌ mock数据 | 需要申请高德API Key |
| 事件数据（高德/百度） | 实时获取 | ❌ mock数据 | 需要申请Events API |
| 闲鱼API | 官方API | ❌ mock数据 | 需要商务洽谈+申请权限 |
| 小红书API | 官方API | ❌ mock数据 | 需要商务洽谈+申请权限 |
| 微信小程序 | 官方API | ❌ mock数据 | 需要申请小程序账号 |
| AI大模型 | DeepSeek等 | ✅ 已实现 | 已对接DeepSeek API |

### 1.3 核心结论

```
当前系统状态：
├── 前端UI：80%完成（演示数据驱动）
├── 后端框架：微服务架构已搭建
├── 核心业务逻辑：已实现（定价算法、库存管理）
├── 外部API对接：未开始（等待商务/申请）
└── 数据：全部mock

这不是技术问题，是「商务/资源」问题：
- 高德API：需要申请企业Key
- 闲鱼/小红书：需要商务洽谈
- PMS集成：需要客户配合
```

---

## 2. 集成到客户系统后的架构

### 2.1 核心问题解答

**Q1: 集成到客户系统后，后端能否正常实现？**

```
答案：可以，但需要调整架构

现状（SaaS模式）：
┌─────────────────────────────────────────────────────────────┐
│  Shadow-Bees SaaS平台                                       │
│  ├── 我们的微服务（定价、库存、订单）                        │
│  ├── 我们的数据库                                           │
│  └── 我们的AI服务                                           │
└─────────────────────────────────────────────────────────────┘

集成后（混合模式）：
┌─────────────────────────────────────────────────────────────┐
│  客户环境（华美会）                                         │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  华美会PMS      │  │  Shadow-Bees 服务              │  │
│  │  • 酒店数据     │  │  ├── 定价引擎 ✅               │  │
│  │  • 库存数据     │  │  ├── AI文案生成 ✅             │  │
│  │  • 订单数据     │  │  ├── 策略引擎 ✅               │  │
│  │  • 房态管理     │  │  └── 企业服务版前端 ✅         │  │
│  └────────┬────────┘  └────────┬────────────────────────┘  │
│           │                    │                          │
│           └────────────────────┘                          │
│              API对接（双向同步）                           │
└─────────────────────────────────────────────────────────────┘

关键变化：
├── ✅ 定价引擎：独立运行，不依赖外部API
├── ✅ AI文案生成：调用DeepSeek API，可正常使用
├── ✅ 策略引擎：独立运行
├── ⚠️ 库存数据：从客户PMS读取，不再自建
├── ⚠️ 订单数据：从客户PMS读取，不再自建
└── ❌ 竞品/事件数据：仍需对接高德API（可选）
```

**Q2: PMS库存房态连接客户自己的系统怎么做？**

```
解决方案：PMS Adapter 适配器模式

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PMS集成架构                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Shadow-Bees 微服务层                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PMS Adapter Layer                               │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐│   │
│  │  │                                                                 ││   │
│  │  │   统一接口定义（抽象层）                                         ││   │
│  │  │   ├── getInventory(hotelId, dateRange)                         ││   │
│  │  │   ├── updatePrice(hotelId, roomTypeId, price)                  ││   │
│  │  │   ├── getOrders(hotelId, filters)                              ││   │
│  │  │   ├── updateOrderStatus(orderId, status)                       ││   │
│  │  │   └── ...                                                      ││   │
│  │  │                                                                 ││   │
│  │  │   适配器实现（具体PMS）                                         ││   │
│  │  │   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      ││   │
│  │  │   │ 华美会适配器   │  │ 云掌柜适配器   │  │ 订单来了适配器 │      ││   │
│  │  │   │ (当前客户)    │  │ (未来客户)    │  │ (未来客户)    │      ││   │
│  │  │   └───────┬───────┘  └───────────────┘  └───────────────┘      ││   │
│  │  │           │                                                    ││   │
│  │  └───────────┼────────────────────────────────────────────────────┘│   │
│  │              │                                                     │   │
│  └──────────────┼─────────────────────────────────────────────────────┘   │
│                 │                                                           │
│                 ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         华美会PMS                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   房态系统    │  │   订单系统    │  │   价格系统    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

数据流向：
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Shadow-Bees操作 ──▶ PMS Adapter ──▶ 华美会PMS API ──▶ 修改房态/价格      │
│                                                                              │
│  示例：批量调价                                                              │
│  ┌──────────────┐                                                           │
│  │ 企业版前端    │  选择10家酒店，统一调价 +10%                              │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │ BatchPricing │  计算新价格                                                │
│  │   Service    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │ PMS Adapter  │────▶│ 华美会API    │────▶│ 各酒店房态   │               │
│  │ (华美会实现)  │     │ (客户提供的)  │     │ (客户系统)   │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                                              │
│  注意：Shadow-Bees不再维护自己的库存数据库，而是：                            │
│  ├── 读：从PMS实时读取库存状态                                              │
│  ├── 写：通过API修改PMS的库存/价格                                          │
│  └── 缓存：Redis缓存（短期），降低PMS压力                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 需要客户提供的接口清单

### 3.1 必要接口（MVP）

```typescript
// 华美会PMS需要提供的API接口

interface HuameiPMSAPI {
  // ========== 酒店基础接口 ==========
  
  // 获取酒店列表
  GET /api/v1/hotels
  Response: {
    hotels: Array<{
      id: string;
      name: string;
      address: string;
      city: string;
      roomTypes: Array<{
        id: string;
        name: string;
        totalRooms: number;
      }>;
    }>;
  }

  // ========== 库存/房态接口 ==========
  
  // 获取库存日历
  GET /api/v1/hotels/:hotelId/inventory
  Query: { startDate: string; endDate: string; roomTypeId?: string }
  Response: {
    inventory: Array<{
      date: string;
      roomTypeId: string;
      totalRooms: number;
      availableRooms: number;  // 可售房数
      occupiedRooms: number;   // 已占用（在住+预订）
      maintenanceRooms: number; // 维修房
    }>;
  }
  
  // 更新库存（关房/开房/维修）
  POST /api/v1/hotels/:hotelId/inventory/update
  Body: {
    date: string;
    roomTypeId: string;
    availableRooms?: number;
    maintenanceRooms?: number;
    reason?: string;
  }

  // ========== 价格接口 ==========
  
  // 获取当前价格
  GET /api/v1/hotels/:hotelId/prices
  Query: { date?: string; roomTypeId?: string }
  Response: {
    prices: Array<{
      date: string;
      roomTypeId: string;
      currentPrice: number;    // 当前售价
      floorPrice?: number;     // 底价（可选）
      ceilingPrice?: number;   // 天花板价（可选）
    }>;
  }
  
  // 更新价格
  POST /api/v1/hotels/:hotelId/prices/update
  Body: {
    date: string;
    roomTypeId: string;
    newPrice: number;
    source: 'shadow-bees';
    operatorId: string;
  }

  // ========== 订单接口 ==========
  
  // 获取订单列表
  GET /api/v1/hotels/:hotelId/orders
  Query: { 
    startDate?: string; 
    endDate?: string; 
    status?: string;
    page?: number;
    pageSize?: number;
  }
  Response: {
    orders: Array<{
      id: string;
      guestName: string;
      checkInDate: string;
      checkOutDate: string;
      roomTypeId: string;
      roomCount: number;
      totalAmount: number;
      status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
      source: 'ota' | 'direct' | 'wechat' | 'xianyu' | 'xiaohongshu';
    }>;
    pagination: { total: number; page: number; pageSize: number };
  }
  
  // 确认订单
  POST /api/v1/orders/:orderId/confirm
  Body: { operatorId: string }
  
  // 取消订单
  POST /api/v1/orders/:orderId/cancel
  Body: { reason: string; operatorId: string }
  
  // 办理入住
  POST /api/v1/orders/:orderId/checkin
  Body: { roomNumbers: string[]; operatorId: string }
  
  // 办理退房
  POST /api/v1/orders/:orderId/checkout
  Body: { operatorId: string }

  // ========== Webhook推送（PMS → Shadow-Bees）==========
  
  // PMS需要实现的Webhook接收端（由Shadow-Bees提供）
  POST https://shadow-bees.huamei.com/webhook/pms-events
  Body: {
    eventType: 'order_created' | 'order_cancelled' | 'inventory_changed' | 'price_changed';
    hotelId: string;
    data: any;
    timestamp: string;
    signature: string;  // 签名验证
  }
}
```

### 3.2 可选接口（增强功能）

```typescript
interface HuameiPMSAPI_Optional {
  // 财务数据（用于报表）
  GET /api/v1/hotels/:hotelId/finance/revenue
  Query: { startDate: string; endDate: string }
  
  // 渠道数据（OTA vs 直销占比）
  GET /api/v1/hotels/:hotelId/channels/stats
  
  // 会员数据（用于私域运营）
  GET /api/v1/hotels/:hotelId/guests
  
  // 发票数据
  GET /api/v1/hotels/:hotelId/invoices
}
```

---

## 4. 实施路线图

### Phase 1: 接口对接（2周）

```
Week 1-2: PMS接口对接
├── Day 1-3: 接口文档对齐
│   ├── 客户提供API文档
│   ├── 双方技术对接会议
│   └── 确定数据映射关系
│
├── Day 4-7: 适配器开发
│   ├── 实现HuameiPMSAdapter
│   ├── 接口联调测试
│   └── 错误处理机制
│
└── Day 8-14: Webhook对接
    ├── Shadow-Bees提供Webhook接收端
    ├── PMS配置事件推送
    └── 端到端测试
```

### Phase 2: 功能验证（1周）

```
Week 3: 功能验证
├── 单店操作验证
│   ├── 定价修改 → PMS同步
│   ├── 库存调整 → PMS同步
│   └── 订单处理 → PMS同步
│
├── 批量操作验证
│   ├── 批量调价（10家店）
│   ├── 批量库存调整
│   └── 性能测试
│
└── 数据一致性验证
    ├── PMS修改 → Shadow-Bees实时更新
    ├── 并发操作测试
    └── 异常场景测试
```

### Phase 3: 外部API对接（可选，并行）

```
并行进行（需要商务资源）：
├── 高德地图API（竞品/事件数据）
│   ├── 申请企业Key
│   ├── 接入竞品价格查询
│   └── 接入周边事件查询
│
└── 非标平台API（闲鱼/小红书/微信）
    ├── 商务洽谈
    ├── 申请API权限
    └── 适配器开发
```

---

## 5. 技术风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|-----|-----|-----|---------|
| 客户PMS接口不完善 | 高 | 高 | 提前对接口文档评审，制定fallback方案 |
| 数据同步延迟 | 中 | 高 | 设计缓存策略，异步补偿机制 |
| PMS并发性能瓶颈 | 中 | 中 | 限流保护，批量操作拆分 |
| 数据不一致 | 中 | 高 | 对账机制，定期数据校验 |
| 外部API申请延迟 | 高 | 低 | MVP不依赖外部API，后续迭代 |

---

## 6. 给客户的技术方案说明

### 6.1 对接清单（需要客户配合）

```
为了Shadow-Bees与您现有PMS系统的集成，需要您提供以下支持：

1. API接口文档
   ├── 酒店/房型基础数据查询接口
   ├── 库存/房态查询与更新接口
   ├── 价格查询与更新接口
   ├── 订单查询与状态更新接口
   └── 认证授权机制（API Key / OAuth2）

2. Webhook推送配置
   ├── 订单创建事件推送
   ├── 订单状态变更推送
   ├── 房态变更推送
   └── 价格变更推送

3. 测试环境
   ├── 沙箱环境访问权限
   ├── 测试酒店数据（建议5-10家）
   └── 测试账号（不同角色权限）

4. 技术支持
   ├── 技术对接人（接口问题沟通）
   ├── 联调时间窗口
   └── 上线支持
```

### 6.2 Shadow-Bees提供的内容

```
1. 企业版前端系统
   ├── 集团视角数据看板
   ├── 单店穿透操作台
   ├── 批量操作功能
   └── iframe嵌入支持

2. PMS适配器
   ├── 华美会PMS专用适配器
   ├── 接口映射配置
   └── 数据转换逻辑

3. 后端服务（部署在客户环境）
   ├── 定价引擎服务
   ├── AI文案生成服务
   ├── 策略引擎服务
   └── Webhook接收服务

4. 集成文档
   ├── 接口对接文档
   ├── 部署指南
   └── 运维手册
```

---

## 7. 修正后的企业版功能清单

基于以上分析，企业版最终功能：

### 核心功能（复用 + 新增）

| 功能模块 | 来源 | 数据依赖 | 说明 |
|---------|------|---------|------|
| **经营大盘** | 集团端复用 | PMS订单数据 | 集团GMV、门店排名 |
| **AI价值** | 集团端复用 | PMS订单数据 | AI采纳率、收益提升 |
| **酒店操作台-定价** | 酒店端复用 | PMS价格接口 | 实时修改酒店价格 |
| **酒店操作台-库存** | 酒店端复用 | PMS库存接口 | 实时调整房态 |
| **酒店操作台-订单** | 酒店端复用 | PMS订单接口 | 确认/取消/退款 |
| **批量操作** | 新增 | PMS批量接口 | 批量调价/库存/内容 |
| **内容工厂** | 酒店端复用 | DeepSeek API | AI文案生成（独立） |
| **事件情报** | 酒店端复用 | 高德Events API | 周边事件（可选） |
| **策略中心** | 集团端复用 | PMS价格接口 | 策略下发到PMS |

### 不包含的功能

| 功能 | 原因 |
|-----|------|
| AI客服演示 | 演示性质，非生产 |
| 竞品分析 | 依赖高德API，可选功能 |
| 公域发布 | 未对接闲鱼/小红书API |
| 私域运营 | 运营工具，非核心功能 |

---

## 8. 总结

```
核心结论：

1. 后端架构可以正常实现
   ├── 微服务架构已搭建
   ├── 核心业务逻辑（定价、AI）已可用
   └── 只需要实现PMS Adapter适配器

2. PMS库存房态对接方案
   ├── Shadow-Bees不再自建库存数据库
   ├── 通过Adapter读取/写入客户PMS
   └── 双向同步（API调用 + Webhook推送）

3. 外部API对接现状
   ├── AI文案生成：✅ 已可用（DeepSeek）
   ├── 事件数据：⚠️ 需申请高德API
   ├── 竞品数据：⚠️ 需申请高德API
   └── 非标平台：❌ 需商务洽谈（暂不做）

4. 客户需要提供的
   ├── PMS API接口文档
   ├── Webhook推送配置
   └── 测试环境支持

5. 开发周期
   ├── 企业版前端：2周
   ├── PMS接口对接：2周
   ├── 联调测试：1周
   └── 总计：5周
```

---

**下一步行动**：
1. 与客户技术团队对接，获取PMS API文档
2. 评审接口完备性，识别风险点
3. 启动企业版前端开发（并行）
