# Shadow-Bees V52 数据流文档

## 概述

本文档描述 Shadow-Bees V52 企业版的核心数据流，包括实时推演、渠道配额管理、订单联动等业务逻辑。

**当前状态**: 所有数据来自 Mock API，后续只需替换 API 实现即可对接真实后端。

---

## 一、历史+实时数据架构

### 1.1 数据分层模型

```
┌─────────────────────────────────────────────────────────────────┐
│                     数据聚合层（页面展示）                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   实时成交 = 历史Mock数据 + 实时推演数据                          │
│       │                                                         │
│       ├── 历史数据（Mock API）                                   │
│       │   ├── 今日订单（00:00 - 当前时间）                       │
│       │   ├── 本周订单（周一 - 当前）                            │
│       │   ├── 本月订单（1号 - 当前）                             │
│       │   └── 本年订单（1月1号 - 当前）                          │
│       │                                                         │
│       └── 实时数据（推演生成）                                   │
│           ├── SIM订单（实时生成）                                │
│           ├── 统计更新（GMV/订单数/房晚）                         │
│           └── 配额扣减（实时扣减）                                │
│                                                                 │
│   数据勾稽：本年 > 本月 > 今日 > 实时                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 历史数据来源

| 数据类型 | API | Mock数据 | 后期替换 |
|---------|-----|---------|---------|
| 订单数据 | `orderApi.getOrders()` | `MOCK_ORDERS` | 华美会API |
| 酒店数据 | `hotelApi.getHotels()` | `MOCK_HOTELS` | 华美会API |
| 内容数据 | `contentApi.getContents()` | `MOCK_CONTENTS` | 内容服务API |
| 客服数据 | `aichatApi.getMessages()` | `MOCK_MESSAGES` | 客服服务API |
| 库存配额 | `inventoryApi.getInventory()` | 本地生成 | 华美会API |

### 1.3 实时数据流

```
实时推演 → 生成SIM订单 → 合并到orders列表 → 页面实时更新
                ↓
         扣减渠道配额（channelQuotas）
                ↓
         触发ORDER_CREATED事件
                ↓
         更新今日统计（realtimeSimulation.todayStats）
```

### 1.4 数据合并逻辑

```typescript
// 订单列表 = 历史订单 + 推演订单
const allOrders = [...mockOrders, ...simulationOrders];

// 今日统计 = 历史今日 + 实时推演
const todayGMV = 
  mockTodayOrders.reduce((sum, o) => sum + o.totalAmount, 0) +
  realtimeSimulation.todayStats.totalGMV;

// 页面展示时按时间排序
const sortedOrders = allOrders.sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);
```

---

## 二、API层架构（Mock → 真实）

### 2.1 API目录结构

```
src/enterprise/api/
├── index.ts              # API统一导出
├── types.ts              # 类型定义
├── mockData.ts           # Mock数据（后期移除）
│
├── hotelApi.ts           # 酒店API ✅
├── orderApi.ts           # 订单API ✅
├── contentApi.ts         # 内容API ✅
├── aichatApi.ts          # 客服API ✅
├── inventoryApi.ts       # 库存API ✅
├── pricingApi.ts         # 定价API ✅
├── dashboardApi.ts       # 数据看板API ✅
├── channelApi.ts         # 渠道API ✅
├── pmsApi.ts             # PMS对接API ⏳
└── auditApi.ts           # 审计API ✅
```

### 2.2 Mock → 真实替换指南

```typescript
// 当前实现（Mock）
export async function getOrders(params?: OrderFilters): Promise<ApiResponse<Order[]>> {
  await delay(300);  // 模拟网络延迟
  
  let list = [...MOCK_ORDERS];  // 从Mock数据读取
  
  // 本地筛选
  if (params?.hotelId) {
    list = list.filter(o => o.hotelId === params.hotelId);
  }
  
  return { success: true, data: list };
}

// 对接后实现（真实API）
export async function getOrders(params?: OrderFilters): Promise<ApiResponse<Order[]>> {
  const response = await fetch('/api/v1/orders', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify(params),
  });
  
  return response.json();
}
```

### 2.3 API切换开关设计

```typescript
// config/api.ts
export const API_CONFIG = {
  // 当前使用 Mock 还是真实 API
  useMock: import.meta.env.VITE_USE_MOCK === 'true',
  
  // API基础URL
  baseURL: import.meta.env.VITE_API_URL || 'https://api.shadowbees.com',
  
  // PMS API配置
  pms: {
    baseURL: import.meta.env.VITE_PMS_API_URL,
    apiKey: import.meta.env.VITE_PMS_API_KEY,
  },
};

// 使用方式
export async function getOrders(params?: OrderFilters) {
  if (API_CONFIG.useMock) {
    return mockGetOrders(params);
  }
  return realGetOrders(params);
}
```

---

## 三、顶部酒店选择器数据流

### 3.1 组件结构

```
Layout.tsx (布局容器)
    │
    ├── HotelSelector.tsx (酒店选择器主组件)
    │       │
    │       ├── 搜索框 (名称/城市/区域)
    │       ├── 筛选器 (区域/城市)
    │       ├── 酒店列表 (虚拟滚动)
    │       └── 已选酒店标签
    │
    └── HotelSelectorDropdown.tsx (简化下拉版)
```

### 3.2 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                      酒店选择器数据流                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   App.tsx                                                       │
│       │                                                         │
│       ├── 加载酒店列表（hotelApi.getHotels）                      │
│       │       ↓                                                 │
│       ├── 设置到 enterpriseStore.hotels                          │
│       │       ↓                                                 │
│       └── 默认全选（selectAllHotels）                            │
│               ↓                                                 │
│   Layout.tsx                                                    │
│       │                                                         │
│       ├── 读取 selectedHotelIds                                  │
│       │       ↓                                                 │
│       └── 渲染 HotelSelector                                     │
│               ↓                                                 │
│   HotelSelector.tsx                                             │
│       │                                                         │
│       ├── 搜索过滤 → filteredHotels                              │
│       ├── 区域筛选 → regionFilter                                │
│       ├── 城市筛选 → cityFilter                                  │
│       │       ↓                                                 │
│       └── 用户选择酒店                                           │
│               ↓                                                 │
│       selectMultipleHotels(hotelIds)                             │
│               ↓                                                 │
│       触发 HOTEL_SELECTED 事件                                   │
│               ↓                                                 │
│   各页面监听事件                                                 │
│       │                                                         │
│       ├── TodayOverview: 重新加载数据                            │
│       ├── OrderManagement: 筛选订单                              │
│       ├── ChannelQuota: 加载配额                                 │
│       └── DataDashboard: 更新趋势                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 核心状态

```typescript
// enterpriseStore.ts
interface EnterpriseState {
  hotels: EnterpriseHotel[];           // 所有酒店列表
  selectedHotelIds: string[];          // 选中酒店ID
}

// HotelSelector.tsx
interface HotelSelectorState {
  searchQuery: string;                 // 搜索关键词
  regionFilter: string;                // 区域筛选
  cityFilter: string;                  // 城市筛选
  showFilters: boolean;                // 显示筛选器
}
```

### 3.4 筛选逻辑

```typescript
// 过滤酒店列表
const filteredHotels = useMemo(() => {
  return hotels.filter(hotel => {
    // 1. 权限过滤
    if (onlyOperable && !hotel.permissions?.includes('canOperate')) {
      return false;
    }
    
    // 2. 搜索过滤（名称/城市/区域）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = hotel.name?.toLowerCase().includes(query);
      const matchCity = hotel.city?.toLowerCase().includes(query);
      const matchRegion = hotel.region?.toLowerCase().includes(query);
      if (!matchName && !matchCity && !matchRegion) return false;
    }
    
    // 3. 区域筛选
    if (regionFilter !== 'all' && hotel.region !== regionFilter) {
      return false;
    }
    
    // 4. 城市筛选
    if (cityFilter !== 'all' && hotel.city !== cityFilter) {
      return false;
    }
    
    return true;
  });
}, [hotels, searchQuery, regionFilter, cityFilter, onlyOperable]);
```

### 3.5 页面联动

```typescript
// 各页面监听酒店选择变化
useEffect(() => {
  // 当酒店选择变化时重新加载数据
  loadDashboardData();
  loadOrders();
}, [selectedHotelIds]);  // 依赖 selectedHotelIds

// 数据筛选（只显示选中酒店）
const filteredData = useMemo(() => {
  return data.filter(item => selectedHotelIds.includes(item.hotelId));
}, [data, selectedHotelIds]);
```

---

## 四、内容中心数据流

### 4.1 内容模块架构

```
内容中心
    │
    ├── 内容工厂 (ContentFactory)
    │   ├── AI生成内容
    │   ├── 图片管理
    │   └── 模板库
    │
    ├── 内容发布 (PublishStatus)
    │   ├── 发布计划
    │   ├── 发布状态追踪
    │   └── 定时发布
    │
    └── 私域运营 (PrivateDomain)
        ├── 客户管理
        ├── 跟进记录
        └── 运营任务
```

### 4.2 内容数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                      内容中心数据流                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   内容工厂                                                       │
│       │                                                         │
│       ├── 创建内容 → contentApi.createContent()                  │
│       │       ↓                                                 │
│       ├── 存储到 MOCK_CONTENTS                                   │
│       │       ↓                                                 │
│       └── 触发内容创建事件                                       │
│                                                                 │
│   内容发布                                                       │
│       │                                                         │
│       ├── 选择内容 → contentApi.getContents()                    │
│       │       ↓                                                 │
│       ├── 选择渠道（酒店启用渠道）                                │
│       │       ↓                                                 │
│       ├── 发布/定时发布 → contentApi.publishContent()            │
│       │       ↓                                                 │
│       └── 更新内容状态为 published                                │
│               ↓                                                 │
│       触发内容发布事件                                           │
│               ↓                                                 │
│       生成内容曝光数据（用于推演转化率）                          │
│                                                                 │
│   私域运营                                                       │
│       │                                                         │
│       ├── 获取客户列表 → contentApi.getFollowUpRecords()         │
│       ├── 添加跟进记录 → contentApi.addFollowUpRecord()          │
│       └── 查看运营任务 → contentApi.getOperationTasks()          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 内容与推演联动

```typescript
// 内容发布影响推演成交率
startRealtimeSimulation: () => {
  setInterval(() => {
    // 统计各平台发布数
    const platformStats = {};
    contents.forEach(c => {
      if (c.status === 'published') {
        platformStats[c.platform].published++;
      }
    });
    
    // 内容少时自动补量
    if (platformStats.xiaohongshu.published < 3) {
      generateRealtimeContent('xiaohongshu');
    }
    
    // 有内容时增加成交概率
    if (hasPublishedContent && Math.random() > 0.7) {
      generateRealtimeTransaction();
    }
  }, 15000);
}
```

---

## 五、客服中心数据流

### 5.1 客服模块架构

```
AI客服中心
    │
    ├── 统一收件箱 (UnifiedInbox)
    │   ├── 消息列表
    │   ├── 渠道筛选
    │   └── 批量操作
    │
    ├── 人机协作 (HumanAICollab)
    │   ├── 协作会话
    │   ├── AI建议
    │   └── 人工介入
    │
    ├── 人工转接 (HumanHandoff)
    │   ├── 转接请求
    │   ├── 分配客服
    │   └── 处理状态
    │
    ├── 话术库 (ScriptLibrary)
    │   ├── 话术模板
    │   ├── 智能推荐
    │   └── 快捷回复
    │
    └── 数据看板 (AIDashboard)
        ├── SLA监控
        ├── AI效果分析
        └── 客服人效
```

### 5.2 客服数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                      客服中心数据流                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   消息接入                                                       │
│       │                                                         │
│       ├── 各渠道消息 → Webhook推送（对接后）                      │
│       │   ├── 闲鱼消息                                          │
│       │   ├── 小红书消息                                        │
│       │   └── 微信消息                                          │
│       │                                                         │
│       └── Mock数据 → MOCK_MESSAGES                              │
│               ↓                                                 │
│   统一收件箱                                                     │
│       │                                                         │
│       ├── 加载消息 → aichatApi.getMessages()                     │
│       │       ↓                                                 │
│       ├── 按酒店筛选（selectedHotelIds）                          │
│       │       ↓                                                 │
│       ├── AI自动回复（模拟）                                     │
│       │       ↓                                                 │
│       └── 人工处理/转接                                          │
│               ↓                                                 │
│   人机协作                                                       │
│       │                                                         │
│       ├── AI生成回复建议                                        │
│       ├── 客服采纳/修改                                         │
│       └── 发送消息 → aichatApi.sendMessage()                     │
│               ↓                                                 │
│   话术库                                                         │
│       │                                                         │
│       ├── 匹配场景 → 推荐话术                                    │
│       └── 快捷发送                                              │
│                                                                 │
│   数据看板                                                       │
│       │                                                         │
│       ├── 统计SLA指标 → aichatApi.getAIDashboardSummary()        │
│       ├── AI采纳率统计                                           │
│       └── 客服人效分析                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 客服与订单联动

```
客服咨询 → 推荐房型/价格 → 客人确认 → 生成订单
    │                                          │
    │                                          ↓
    │                              订单关联咨询记录
    │                                          │
    │                                          ↓
    └────────────────────────────  客服可查看订单状态
```

---

## 六、实时推演数据流（已包含，略）

见上文"一、实时推演数据流"

---

## 七、渠道-酒店关联数据流（已包含，略）

见上文"二、渠道-酒店关联数据流"

---

## 八、配额管理数据流（已包含，略）

见上文"三、配额管理数据流"

---

## 九、订单数据流（已包含，略）

见上文"四、订单数据流"

---

## 十、PMS对接数据流（已包含，略）

见上文"五、PMS对接数据流"

---

## 十一、完整业务链路

### 11.1 内容→客服→成交→订单→财务→数据

```
┌─────────────────────────────────────────────────────────────────┐
│                      完整业务链路                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   内容发布                                                       │
│       │ contentApi.publishContent()                             │
│       ▼                                                         │
│   内容曝光（metrics.views）                                      │
│       │                                                         │
│       ├── 自然流量                                              │
│       └── 推广投放                                              │
│       ▼                                                         │
│   客服咨询                                                       │
│       │ aichatApi.getMessages()                                 │
│       ▼                                                         │
│   人机协作回复                                                   │
│       │                                                         │
│       ├── AI自动回复                                            │
│       └── 人工介入                                              │
│       ▼                                                         │
│   意向确认                                                       │
│       │                                                         │
│       ├── 发送报价                                              │
│       └── 确认房型/日期                                         │
│       ▼                                                         │
│   成交转化                                                       │
│       │                                                         │
│       ├── 实时推演生成（SIM订单）                                │
│       └── 真实渠道成交（NS订单）                                  │
│       ▼                                                         │
│   订单生成                                                       │
│       │ orderApi.getOrders()                                    │
│       ▼                                                         │
│   库存扣减                                                       │
│       │ deductQuota()                                           │
│       ▼                                                         │
│   同步PMS                                                        │
│       │ pmsApi.syncOrder() ⏳（对接后）                          │
│       ▼                                                         │
│   财务结算                                                       │
│       │                                                         │
│       ├── 渠道费用计算                                          │
│       └── 实收金额统计                                          │
│       ▼                                                         │
│   数据看板                                                       │
│       │ dashboardApi.getDashboardSummary()                      │
│       ▼                                                         │
│   经营分析                                                       │
│       ├── GMV统计                                               │
│       ├── 转化率分析                                            │
│       └── 渠道效能                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 十二、调试与验证

### 12.1 验证数据勾稽

```bash
# 1. 检查酒店选择
console.log(store.selectedHotelIds);
console.log(store.getSelectedHotels());

# 2. 检查推演订单
console.log(store.orders.filter(o => o.id.startsWith('SIM-')));
console.log(store.realtimeSimulation.todayStats);

# 3. 检查配额扣减
console.log(store.channelQuotas['hotelId']);

# 4. 检查内容发布
console.log(store.contents.filter(c => c.status === 'published'));

# 5. 检查客服消息
console.log(store.tickets);  // 或 aichatApi.getMessages()
```

### 12.2 常见问题排查

| 问题 | 原因 | 解决 |
|-----|------|------|
| 页面无数据 | 酒店未选中 | 检查 selectedHotelIds |
| 推演不生成订单 | 酒店无启用渠道 | 检查 hotelChannelConfigs |
| 配额不扣减 | 剩余不足 | 检查 deductQuota 返回值 |
| 内容不显示 | 未按酒店筛选 | 检查 contents 筛选逻辑 |
| 客服消息不加载 | 未初始化 | 检查 loadMessages 调用 |

---

**文档版本**: V1.1  
**更新日期**: 2025-03-08  
**适用版本**: Shadow-Bees V52

**更新说明**:
- V1.1: 添加历史+实时架构、API层设计、酒店选择器、内容中心、客服中心数据流
- V1.0: 初始版本，包含推演、配额、订单数据流
