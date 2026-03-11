# Shadow-Bees × PMS商深度合作方案

## 1. 需求深度分析

### 1.1 客户画像（华美会案例）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        华美会业务模式                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   华美会 = PMS系统商 + 酒店管理公司                                           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │   PMS系统（软件服务）          酒店管理（运营服务）                   │   │
│   │   ───────────────────          ───────────────────                  │   │
│   │                                                                     │   │
│   │   • 直采商户端（酒店用）        • 运营1000+家酒店                    │   │
│   │   • 集团管理端                  • 统一品牌、统一标准                 │   │
│   │   • 供应链系统                  • 中央预订、中央采购                 │   │
│   │   • 财务结算系统                • 收益管理、营销策划                 │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   核心诉求：                                                                 │
│   1. 需要一个「集中运营平台」来管理1000家酒店的收益                         │
│   2. 希望ShadowBees作为PMS的一个「功能模块」嵌入                             │
│   3. 能够直接在集团视角操作任何一家酒店（不是只看数据）                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心需求拆解

| 需求 | 当前三端能否满足 | 差距分析 |
|-----|-----------------|---------|
| 集团视角看数据 | ✅ 集团端可满足 | 无差距 |
| **直接操作单店** | ❌ **不能满足** | **集团端只能看，不能操作** |
| 批量操作多店 | ❌ 不能满足 | 无批量功能 |
| 嵌入PMS系统 | ⚠️ 需要适配 | 需要iframe/微前端集成 |
| 1000家酒店规模 | ⚠️ 需要优化 | 性能、权限、数据隔离 |

**关键发现**：
- 目前的集团端是「**数据看板**」- 只能看，不能操作
- 客户需要的是「**集中运营平台**」- 既能看，又能直接操作任何酒店

---

## 2. 商业模式思考

### 2.1 合作模式选择

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        三种合作模式对比                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  模式A：软件供应商模式（推荐）                                                │
│  ─────────────────────────────                                              │
│                                                                              │
│   ShadowBees ──▶ 提供「企业版」软件 ──▶ 客户购买/订阅                        │
│       │                                           │                         │
│       │    • 独立部署（客户服务器/云）            │                         │
│       │    • 白标（客户品牌）                     │                         │
│       │    • API对接客户PMS                       │                         │
│       │                                           ▼                         │
│       │                                    客户自有资产                      │
│       │                                    • 自主运营                        │
│       │                                    • 数据自主                        │
│       │                                                                    │
│   收费方式：一次性买断 + 年度维护费 或 订阅制                                │
│   适合：大客户，有自主运营能力                                               │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  模式B：SaaS服务模式                                                         │
│  ───────────────────                                                         │
│                                                                              │
│   ShadowBees ──▶ 多租户SaaS平台 ──▶ 客户开通账号                            │
│       │                                           │                         │
│       │    • 共用基础设施                          │                         │
│       │    • 客户无需运维                          │                         │
│       │    • 按酒店数/功能模块收费                 │                         │
│       │                                           ▼                         │
│       │                                    客户使用服务                      │
│       │                                    • 按用量付费                      │
│       │                                    • 我们负责运维                    │
│       │                                                                    │
│   收费方式：¥X/店/月（量大从优）                                             │
│   适合：中小型客户，希望轻资产                                               │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  模式C：联合运营模式                                                         │
│  ───────────────────                                                         │
│                                                                              │
│   ShadowBees + 客户 ──▶ 成立联合运营团队                                     │
│       │                                                                     │
│       │    • 收益分成（比如：增量收益3:7分）                                   │
│       │    • 我们提供技术+算法                                                 │
│       │    • 客户提供酒店资源+运营                                             │
│       │                                                                     │
│   收费方式：基础费用 + 增量收益分成                                          │
│   适合：深度合作，长期绑定                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 推荐方案：模式A + 模式C 混合

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        推荐合作模式                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Phase 1（前3个月）：软件供应 + 深度定制                                     │
│   ─────────────────────────────────────                                     │
│                                                                              │
│   • ShadowBees 为客户定制「企业版」前端                                      │
│   • 独立部署在客户环境                                                       │
│   • 一次性开发费用 + 定制费用                                                │
│                                                                              │
│   Phase 2（3-12个月）：联合运营验证                                           │
│   ─────────────────────────────────────                                     │
│                                                                              │
│   • 双方共同运营，验证效果                                                   │
│   • 按增量收益分成                                                           │
│   • 收集反馈，持续优化                                                       │
│                                                                              │
│   Phase 3（12个月后）：产品化输出                                             │
│   ─────────────────────────────────────                                     │
│                                                                              │
│   • 将定制化功能沉淀为标准产品                                               │
│   • 向其他PMS商/酒管公司销售                                                 │
│   • 客户成为标杆案例，享受后续分成                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 技术方案设计

### 3.1 新增「企业版」前端（Enterprise Edition）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        四端架构（新增企业版）                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   原三端架构：                                                               │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│   │   酒店端     │  │   集团端     │  │   管理端     │                         │
│   │  (单体酒店)  │  │  (集团看数据) │  │  (平台运营)  │                         │
│   └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                                                              │
│   新增第四端：                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                     │   │
│   │                      企业版 (Enterprise)                            │   │
│   │                  「集中运营管理平台」                                │   │
│   │                                                                     │   │
│   │   核心能力：                                                        │   │
│   │   • 集团视角看数据（继承集团端）                                     │   │
│   │   • 穿透式操作单店（新增）                                          │   │
│   │   • 批量操作多店（新增）                                            │   │
│   │   • 嵌入第三方系统（新增）                                          │   │
│   │                                                                     │   │
│   │   用户场景：                                                        │   │
│   │   总部运营人员 ──▶ 打开企业版                                        │   │
│   │        │                                                           │   │
│   │        ├──▶ 看集团数据大盘                                          │   │
│   │        │                                                           │   │
│   │        ├──▶ 发现某酒店需要调价                                       │   │
│   │        │         │                                                 │   │
│   │        │         ▼                                                 │   │
│   │        │    直接在该酒店定价页面操作（无需切换系统）                   │   │
│   │        │                                                           │   │
│   │        ├──▶ 发现多个酒店库存紧张                                     │   │
│   │        │         │                                                 │   │
│   │        │         ▼                                                 │   │
│   │        │    批量调整这10家酒店的渠道配额                             │   │
│   │        │                                                           │   │
│   │        └──▶ 所有操作实时同步到各酒店的PMS                            │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 企业版核心功能架构

```typescript
// 企业版功能架构

interface EnterpriseArchitecture {
  // ========== 1. 数据层（继承集团端）==========
  dataLayer: {
    // 集团数据总览
    groupOverview: {
      totalGMV: number;
      totalOrders: number;
      hotelCount: number;
      avgOccupancy: number;
      avgRevPAR: number;
    };
    
    // 门店列表（1000家）
    hotels: EnterpriseHotel[];
    
    // 区域维度
    regions: Region[];
    
    // 渠道维度
    channels: Channel[];
  };
  
  // ========== 2. 操作层（新增核心能力）==========
  operationLayer: {
    // 穿透式单店操作
    singleHotelOperation: {
      // 选择一家酒店，进入该酒店的操作界面
      enterHotel: (hotelId: string) => HotelOperationContext;
      
      // 定价操作
      pricing: {
        viewCurrentPrices: () => Price[];
        adjustPrice: (roomTypeId: string, newPrice: number) => Promise<void>;
        applyAISuggestion: (suggestionId: string) => Promise<void>;
        setFloorPrice: (roomTypeId: string, price: number) => Promise<void>;
      };
      
      // 库存操作
      inventory: {
        viewCalendar: () => InventoryCalendar;
        adjustAvailability: (date: string, roomTypeId: string, count: number) => Promise<void>;
        setMaintenance: (date: string, roomTypeId: string, count: number) => Promise<void>;
      };
      
      // 订单操作
      orders: {
        viewOrders: (filters: OrderFilters) => Order[];
        confirmOrder: (orderId: string) => Promise<void>;
        cancelOrder: (orderId: string, reason: string) => Promise<void>;
        processRefund: (orderId: string, amount: number) => Promise<void>;
      };
      
      // 内容操作
      content: {
        generateContent: (template: string, params: any) => Promise<Content>;
        publishToPlatform: (contentId: string, platform: Platform) => Promise<void>;
        viewPublished: () => Content[];
      };
    };
    
    // 批量操作多店
    batchOperation: {
      // 选择多家酒店
      selectHotels: (hotelIds: string[]) => BatchOperationContext;
      
      // 批量定价
      batchPricing: {
        // 统一定价策略
        applyUnifiedStrategy: (strategy: PricingStrategy) => Promise<BatchResult>;
        // 按比例调价
        adjustByPercentage: (percent: number) => Promise<BatchResult>;
        // 跟随某家酒店定价
        followLeader: (leaderHotelId: string) => Promise<BatchResult>;
      };
      
      // 批量库存
      batchInventory: {
        // 统一渠道配额
        setChannelAllocation: (allocation: ChannelAllocation) => Promise<BatchResult>;
        // 批量关房/开房
        toggleAvailability: (dates: DateRange, available: boolean) => Promise<BatchResult>;
      };
      
      // 批量内容
      batchContent: {
        // 统一发布内容到多店
        publishToMultiple: (content: Content, hotelIds: string[]) => Promise<BatchResult>;
        // 统一修改内容状态
        updateStatus: (contentIds: string[], status: ContentStatus) => Promise<BatchResult>;
      };
    };
  };
  
  // ========== 3. 集成层（新增）==========
  integrationLayer: {
    // PMS集成
    pmsIntegration: {
      // 实时同步到PMS
      syncToPMS: (hotelId: string, data: SyncData) => Promise<SyncResult>;
      // 接收PMS事件
      onPMSEvent: (event: PMSEvent) => void;
      // PMS登录态打通
      sso: {
        validateToken: (token: string) => Promise<UserInfo>;
        generateToken: (userId: string) => string;
      };
    };
    
    // iframe嵌入支持
    iframeEmbedding: {
      // 高度自适应
      autoResize: () => void;
      // 消息通信
      postMessage: (message: Message) => void;
      // 接收父页面消息
      onParentMessage: (handler: MessageHandler) => void;
    };
  };
}

// 企业版酒店数据模型（比集团端更丰富，包含操作权限）
interface EnterpriseHotel {
  id: string;
  name: string;
  region: string;
  
  // 基础数据（继承集团端）
  metrics: {
    gmv: number;
    orders: number;
    occupancy: number;
    revpar: number;
    healthScore: number;
  };
  
  // 操作权限（新增）
  permissions: {
    canOperate: boolean;      // 是否有操作权限
    canAdjustPrice: boolean;  // 能否调价
    canManageInventory: boolean;  // 能否管理库存
    canProcessOrders: boolean;    // 能否处理订单
  };
  
  // 实时状态（新增）
  realtimeStatus: {
    isOnline: boolean;        // PMS是否在线
    lastSyncAt: Date;         // 最后同步时间
    pendingOperations: number; // 待处理操作数
  };
}
```

### 3.3 企业版页面架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        企业版页面架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  左侧导航栏（10大模块）：                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  📊 经营大盘（继承集团端）                                           │   │
│  │  ├── 集团数据总览                                                    │   │
│  │  ├── 区域效能对比                                                    │   │
│  │  └── 异常告警中心                                                    │   │
│  │                                                                     │   │
│  │  🏨 酒店运营（核心 - 新增穿透式操作）                                 │   │
│  │  ├── 酒店列表（1000家）                                              │   │
│  │  ├── 酒店详情（★点击进入该酒店的操作台）                              │   │
│  │  │   ├── 定价管理（可操作）                                          │   │
│  │  │   ├── 库存日历（可操作）                                          │   │
│  │  │   ├── 订单处理（可操作）                                          │   │
│  │  │   └── 内容发布（可操作）                                          │   │
│  │  └── 批量操作（★新增）                                               │   │
│  │      ├── 批量调价                                                    │   │
│  │      ├── 批量库存调整                                                │   │
│  │      └── 批量内容发布                                                │   │
│  │                                                                     │   │
│  │  🎯 收益策略（继承集团端 + 增强）                                     │   │
│  │  ├── 策略配置                                                        │   │
│  │  ├── 策略下发（★支持批量下发到1000家店）                             │   │
│  │  └── 策略执行监控                                                    │   │
│  │                                                                     │   │
│  │  📈 渠道分析（继承集团端）                                           │   │
│  │  📅 库存总览（继承集团端）                                           │   │
│  │  💰 财务报表（继承集团端）                                           │   │
│  │  🎫 工单中心（继承集团端）                                           │   │
│  │  ⚙️ 系统设置（增强）                                                 │   │
│  │  └── PMS集成配置（★新增）                                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  核心创新页面：                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. 酒店操作台（Hotel Workbench）                                    │   │
│  │     ─────────────────────────────                                  │   │
│  │     点击某酒店后进入，界面类似酒店端，但带「返回集团」按钮             │   │
│  │                                                                     │   │
│  │     ┌─────────────────────────────────────────────────────────┐    │   │
│  │     │  🔙 返回集团    北京国贸店    店长：张三    在线 ✅     │    │   │
│  │     ├─────────────────────────────────────────────────────────┤    │   │
│  │     │                                                         │    │   │
│  │     │  [定价] [库存] [订单] [内容] [数据]                      │    │   │
│  │     │                                                         │    │   │
│  │     │  ┌─────────────────────────────────────────────────┐   │    │   │
│  │     │  │  当前定价（可操作）                              │   │    │   │
│  │     │  │  • 大床房：¥380  [修改] [AI建议]                │   │    │   │
│  │     │  │  • 双床房：¥420  [修改] [AI建议]                │   │    │   │
│  │     │  └─────────────────────────────────────────────────┘   │    │   │
│  │     │                                                         │    │   │
│  │     │  ┌─────────────────────────────────────────────────┐   │    │   │
│  │     │  │  库存日历（可操作）                              │   │    │   │
│  │     │  │  • 3/15 可售：5间  [调整]                        │   │    │   │
│  │     │  │  • 3/16 可售：3间  [调整] [紧张⚠️]              │   │    │   │
│  │     │  └─────────────────────────────────────────────────┘   │    │   │
│  │     │                                                         │    │   │
│  │     └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                     │   │
│  │  2. 批量操作台（Batch Workbench）                                    │   │
│  │     ─────────────────────────────                                  │   │
│  │     选择多家酒店后进行批量操作                                       │   │
│  │                                                                     │   │
│  │     ┌─────────────────────────────────────────────────────────┐    │   │
│  │     │  已选择：华东地区 32 家酒店                              │    │   │
│  │     │                                                         │    │   │
│  │     │  [批量调价] [批量库存] [批量内容] [导出]                │    │   │
│  │     │                                                         │    │   │
│  │     │  批量调价：                                             │    │   │
│  │     │  • 大床房：当前均价 ¥380 ──▶ 新价格 ¥420 (+10%)       │    │   │
│  │     │  • 双床房：当前均价 ¥420 ──▶ 新价格 ¥450 (+7%)        │    │   │
│  │     │                                                         │    │   │
│  │     │  [预览影响] [确认执行]                                  │    │   │
│  │     │  ⚠️ 将影响 32 家酒店，预计增收 ¥12,000/天              │    │   │
│  │     └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 技术实现方案

### 4.1 代码架构

```
src/
├── enterprise/                    # 新增：企业版代码目录
│   ├── App.tsx                    # 企业版主应用
│   ├── Layout.tsx                 # 企业版布局（含酒店选择器）
│   ├── router.tsx                 # 企业版路由
│   │
│   ├── pages/                     # 企业版页面
│   │   ├── Dashboard/             # 经营大盘（继承集团端）
│   │   │   └── index.tsx
│   │   ├── HotelWorkbench/        # ★ 酒店操作台（新增核心）
│   │   │   ├── index.tsx          # 主页面
│   │   │   ├── PricingTab.tsx     # 定价操作
│   │   │   ├── InventoryTab.tsx   # 库存操作
│   │   │   ├── OrdersTab.tsx      # 订单操作
│   │   │   └── ContentTab.tsx     # 内容操作
│   │   ├── BatchWorkbench/        # ★ 批量操作台（新增）
│   │   │   ├── index.tsx
│   │   │   ├── BatchPricing.tsx
│   │   │   └── BatchInventory.tsx
│   │   ├── HotelList/             # 酒店列表（增强版）
│   │   └── Settings/              # 设置（含PMS集成配置）
│   │
│   ├── components/                # 企业版组件
│   │   ├── HotelSelector/         # 酒店选择器（支持1000家）
│   │   ├── BatchSelector/         # 批量选择器
│   │   ├── OperationPanel/        # 操作面板
│   │   └── SyncStatus/            # 同步状态显示
│   │
│   ├── stores/                    # 企业版状态管理
│   │   ├── enterpriseStore.ts     # 主store
│   │   ├── hotelOperationStore.ts # 单店操作store
│   │   └── batchOperationStore.ts # 批量操作store
│   │
│   ├── hooks/                     # 企业版hooks
│   │   ├── useHotelOperation.ts   # 单店操作hook
│   │   ├── useBatchOperation.ts   # 批量操作hook
│   │   └── usePMSSync.ts          # PMS同步hook
│   │
│   └── services/                  # 企业版服务
│       ├── pmsIntegration.ts      # PMS集成服务
│       ├── batchService.ts        # 批量操作服务
│       └── syncService.ts         # 数据同步服务
│
├── group/                         # 现有集团端（可复用部分代码）
├── admin/                         # 现有管理端
└── ...

public/
├── enterprise.html                # 新增：企业版入口HTML
```

### 4.2 关键技术实现

```typescript
// ==========================================
// 1. 酒店操作台核心逻辑
// ==========================================

// src/enterprise/stores/hotelOperationStore.ts
import { create } from 'zustand';

interface HotelOperationState {
  // 当前操作的酒店
  currentHotel: EnterpriseHotel | null;
  
  // 操作上下文（复用酒店端逻辑）
  operationContext: {
    pricing: PricingContext;
    inventory: InventoryContext;
    orders: OrdersContext;
    content: ContentContext;
  } | null;
  
  // Actions
  enterHotel: (hotelId: string) => Promise<void>;
  exitHotel: () => void;
  
  // 定价操作
  adjustPrice: (roomTypeId: string, newPrice: number) => Promise<void>;
  applyAISuggestion: (suggestionId: string) => Promise<void>;
  
  // 库存操作
  adjustInventory: (params: InventoryAdjustment) => Promise<void>;
  
  // 订单操作
  confirmOrder: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
}

export const useHotelOperationStore = create<HotelOperationState>((set, get) => ({
  currentHotel: null,
  operationContext: null,
  
  // 进入酒店操作台
  enterHotel: async (hotelId: string) => {
    // 1. 加载酒店信息
    const hotel = await fetchHotelDetail(hotelId);
    
    // 2. 检查操作权限
    if (!hotel.permissions.canOperate) {
      throw new Error('无权操作该酒店');
    }
    
    // 3. 加载操作上下文（复用酒店端API）
    const context = await fetchOperationContext(hotelId);
    
    set({ currentHotel: hotel, operationContext: context });
  },
  
  // 退出酒店操作台
  exitHotel: () => {
    set({ currentHotel: null, operationContext: null });
  },
  
  // 调价操作（实时同步到PMS）
  adjustPrice: async (roomTypeId: string, newPrice: number) => {
    const { currentHotel } = get();
    if (!currentHotel) return;
    
    // 1. 本地更新
    await updateLocalPrice(currentHotel.id, roomTypeId, newPrice);
    
    // 2. 同步到PMS
    await syncPriceToPMS(currentHotel.id, roomTypeId, newPrice);
    
    // 3. 记录操作日志
    await logOperation({
      type: 'PRICE_ADJUST',
      hotelId: currentHotel.id,
      roomTypeId,
      newPrice,
      operator: getCurrentUser(),
    });
  },
  
  // ... 其他操作
}));


// ==========================================
// 2. 批量操作核心逻辑
// ==========================================

// src/enterprise/stores/batchOperationStore.ts
interface BatchOperationState {
  // 选中的酒店
  selectedHotels: string[];
  
  // 批量操作状态
  operationStatus: {
    isExecuting: boolean;
    progress: number;
    results: BatchResult[];
  };
  
  // Actions
  selectHotels: (hotelIds: string[]) => void;
  clearSelection: () => void;
  
  // 批量操作
  batchAdjustPrice: (params: BatchPricingParams) => Promise<void>;
  batchAdjustInventory: (params: BatchInventoryParams) => Promise<void>;
}

export const useBatchOperationStore = create<BatchOperationState>((set, get) => ({
  selectedHotels: [],
  operationStatus: { isExecuting: false, progress: 0, results: [] },
  
  // 选择酒店
  selectHotels: (hotelIds: string[]) => {
    set({ selectedHotels: hotelIds });
  },
  
  // 批量调价
  batchAdjustPrice: async (params: BatchPricingParams) => {
    const { selectedHotels } = get();
    
    set({ operationStatus: { isExecuting: true, progress: 0, results: [] } });
    
    const results: BatchResult[] = [];
    
    // 串行执行（避免并发过大）
    for (let i = 0; i < selectedHotels.length; i++) {
      const hotelId = selectedHotels[i];
      
      try {
        await adjustHotelPrice(hotelId, params);
        results.push({ hotelId, success: true });
      } catch (error) {
        results.push({ hotelId, success: false, error: error.message });
      }
      
      set({ operationStatus: { 
        isExecuting: true, 
        progress: ((i + 1) / selectedHotels.length) * 100,
        results 
      }});
    }
    
    set({ operationStatus: { isExecuting: false, progress: 100, results } });
  },
}));


// ==========================================
// 3. PMS集成服务
// ==========================================

// src/enterprise/services/pmsIntegration.ts
export class PMSIntegrationService {
  private config: PMSConfig;
  
  constructor(config: PMSConfig) {
    this.config = config;
  }
  
  // 同步价格到PMS
  async syncPrice(hotelId: string, roomTypeId: string, price: number): Promise<SyncResult> {
    const endpoint = `${this.config.baseUrl}/api/v1/hotels/${hotelId}/room-types/${roomTypeId}/price`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price, source: 'shadow-bees' }),
    });
    
    if (!response.ok) {
      throw new Error(`PMS同步失败: ${response.statusText}`);
    }
    
    return { success: true, timestamp: new Date() };
  }
  
  // 同步库存到PMS
  async syncInventory(hotelId: string, inventoryData: InventoryData): Promise<SyncResult> {
    // 实现类似...
  }
  
  // 接收PMS事件（Webhook）
  handleWebhook(event: PMSEvent): void {
    switch (event.type) {
      case 'ORDER_CREATED':
        // 处理新订单
        this.handleNewOrder(event.data);
        break;
      case 'INVENTORY_CHANGED':
        // 处理库存变更
        this.handleInventoryChange(event.data);
        break;
      // ...
    }
  }
  
  // SSO验证
  async validateToken(token: string): Promise<UserInfo> {
    const endpoint = `${this.config.baseUrl}/api/v1/auth/validate`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    return response.json();
  }
}


// ==========================================
// 4. iframe嵌入支持
// ==========================================

// src/enterprise/hooks/useIframeIntegration.ts
export function useIframeIntegration() {
  useEffect(() => {
    // 只在iframe中运行
    if (window.parent === window) return;
    
    // 1. 高度自适应
    const resizeObserver = new ResizeObserver((entries) => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({
        type: 'SHADOW_BEES_RESIZE',
        height,
      }, '*');
    });
    
    resizeObserver.observe(document.body);
    
    // 2. 接收父页面消息
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'PMS_LOGIN_TOKEN':
          // SSO登录
          handleSSOLogin(payload.token);
          break;
          
        case 'PMS_NAVIGATE':
          // 父页面要求跳转
          navigate(payload.path);
          break;
          
        case 'PMS_HOTEL_SWITCH':
          // 父页面切换酒店
          switchHotel(payload.hotelId);
          break;
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // 3. 通知父页面加载完成
    window.parent.postMessage({ type: 'SHADOW_BEES_READY' }, '*');
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('message', handleMessage);
    };
  }, []);
}
```

### 4.3 多入口配置更新

```typescript
// vite.config.ts 更新
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'multi-entry-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/enterprise')) {
            req.url = '/enterprise.html';
          } else if (req.url?.startsWith('/group')) {
            req.url = '/group.html';
          } else if (req.url?.startsWith('/admin')) {
            req.url = '/admin.html';
          }
          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),        // 酒店端
        admin: path.resolve(__dirname, 'admin.html'),       // 管理端
        group: path.resolve(__dirname, 'group.html'),       // 集团端
        enterprise: path.resolve(__dirname, 'enterprise.html'), // ★ 新增企业版
      },
    },
  },
});
```

---

## 5. 实施计划

### 5.1 开发周期（4周）

```
Week 1: 基础架构搭建
├── Day 1-2: 创建 enterprise/ 目录结构
├── Day 3-4: 实现 Layout + 酒店选择器（支持1000家）
└── Day 5-7: 实现 Dashboard（继承集团端功能）

Week 2: 核心功能开发
├── Day 1-3: 实现 HotelWorkbench（单店穿透式操作）
│   ├── 定价操作
│   ├── 库存操作
│   └── 订单操作
├── Day 4-5: 实现 BatchWorkbench（批量操作）
└── Day 6-7: 实现 PMSIntegrationService

Week 3: 集成与优化
├── Day 1-3: iframe嵌入适配
├── Day 4-5: SSO单点登录集成
└── Day 6-7: 性能优化（1000家酒店虚拟滚动、懒加载）

Week 4: 测试与交付
├── Day 1-3: 功能测试、权限测试
├── Day 4-5: 与客户PMS联调
└── Day 6-7: 文档、部署、培训
```

### 5.2 关键里程碑

| 里程碑 | 交付物 | 验收标准 |
|-------|--------|---------|
| Week 1 结束 | 基础框架 | 企业版页面可访问，酒店列表可展示1000家 |
| Week 2 结束 | 核心功能 | 可穿透操作单店，可批量操作多店 |
| Week 3 结束 | 集成完成 | 可嵌入客户PMS，SSO登录正常 |
| Week 4 结束 | 正式上线 | 客户验收通过，生产环境稳定运行 |

---

## 6. 风险评估与应对

| 风险 | 概率 | 影响 | 应对策略 |
|-----|-----|-----|---------|
| 1000家酒店性能问题 | 中 | 高 | 虚拟滚动、数据分页、WebSocket推送 |
| PMS接口不稳定 | 高 | 高 | 设计重试机制、离线队列、补偿策略 |
| 客户需求变更 | 高 | 中 | 敏捷开发、每周演示、快速迭代 |
| 数据安全问题 | 中 | 高 | 独立部署、数据加密、操作审计 |
| 权限控制复杂 | 中 | 中 | RBAC权限模型、数据范围控制 |

---

## 7. 客户沟通要点

### 7.1 方案演示重点

1. **穿透式操作演示**
   - 从集团大盘 → 点击某酒店 → 直接操作定价/库存
   - 强调「无需切换系统」

2. **批量操作演示**
   - 选择10家酒店 → 批量调价 → 一键执行
   - 强调「规模化运营效率」

3. **集成效果演示**
   - 在客户PMS中嵌入ShadowBees
   - SSO免登、高度自适应

### 7.2 定价建议

```
方案A：一次性买断（推荐首次合作）
├── 企业版定制开发：¥150,000
├── 集成对接服务：¥30,000
├── 首年维护费：¥20,000
└── 合计：¥200,000

方案B：订阅制
├──  setup费：¥50,000
├── 月费：¥5,000（含1000家店）
└── 首年合计：¥110,000

方案C：效果分成（长期合作）
├──  setup费：¥30,000
├── 基础月费：¥3,000
└── 增量收益分成：5%（当AI带来的增收超过¥100,000/月时）
```

---

## 附录：技术架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        企业版技术架构全景                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  用户层                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  华美会PMS                                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  iframe嵌入                                                   │   │   │
│  │  │  ┌───────────────────────────────────────────────────────┐   │   │   │
│  │  │  │                  ShadowBees 企业版                     │   │   │   │
│  │  │  │  ┌──────────────┬──────────────┬──────────────┐       │   │   │   │
│  │  │  │  │  经营大盘     │ 酒店操作台   │ 批量操作台   │       │   │   │   │
│  │  │  │  └──────────────┴──────────────┴──────────────┘       │   │   │   │
│  │  │  └───────────────────────────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│  服务层                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ShadowBees Backend                                                  │   │
│  │  ├── API Gateway                                                     │   │
│  │  ├── Hotel Operation Service  ← 新增：单店操作API                    │   │
│  │  ├── Batch Operation Service  ← 新增：批量操作API                    │   │
│  │  ├── PMS Integration Service  ← 新增：PMS对接服务                    │   │
│  │  └── ... 其他现有服务                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│  集成层                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PMS Integration Layer                                               │   │
│  │  ├── REST API Adapter（华美会PMS接口适配）                           │   │
│  │  ├── Webhook Handler（接收PMS事件）                                  │   │
│  │  └── SSO Integration（单点登录）                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│  客户系统                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  华美会PMS Backend                                                   │   │
│  │  ├── 酒店数据                                                        │   │
│  │  ├── 订单系统                                                        │   │
│  │  └── 库存系统                                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**文档版本**: v1.0  
**编制日期**: 2026-03-05  
**下一步**: 与客户确认方案，进入开发阶段
