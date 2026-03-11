# Shadow-Bees × 华美会 架构设计文档

## 核心原则：两端分离，数据上行，配置下行

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    管理端 (Admin Backend)                                │
│                              Shadow-Bees 核心数据大脑                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           数据仓库 (Data Warehouse)                              │  │
│   │                                                                                  │  │
│   │   交易数据        内容数据        客服数据        运营数据                        │  │
│   │   ├─ 订单明细    ├─ 笔记内容     ├─ 对话记录     ├─ 操作日志                     │  │
│   │   ├─ 价格历史    ├─ 商品描述     ├─ 问答对       ├─ 策略效果                     │  │
│   │   ├─ 用户行为    ├─ 图片视频     ├─ 满意度       ├─ A/B测试                     │  │
│   │   └─ 财务流水    └─ 发布效果     └─ 升级记录     └─ 异常事件                     │  │
│   │                                                                                  │  │
│   │   ↓ ETL处理 ↓                                                                   │  │
│   │                                                                                  │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │                      RAG 知识引擎 (PGVector + Neo4j)                     │   │  │
│   │   │                                                                          │   │  │
│   │   │   向量存储                              图数据库                          │   │  │
│   │   │   ├─ 酒店知识库                        ├─ 渠道规则图谱                    │   │  │
│   │   │   ├─ 客服问答对                        ├─ 竞品对标关系                    │   │  │
│   │   │   ├─ 定价策略案例                      ├─ 酒店关联网络                    │   │  │
│   │   │   └─ 内容素材库                        └─ 用户画像图谱                    │   │  │
│   │   │                                                                          │   │  │
│   │   │   ↓ 检索增强 ↓                                                          │   │  │
│   │   │                                                                          │   │  │
│   │   │   Query → Embedding → Vector Search → Re-rank → Context                  │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                              │
│                                          ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           AI 训练与优化中心                                       │  │
│   │                                                                                  │  │
│   │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │  │
│   │   │ 内容生成模型 │   │ 定价决策模型 │   │ 客服对话模型 │   │ 风控检测模型 │        │  │
│   │   │             │   │             │   │             │   │             │        │  │
│   │   │ • 标题生成  │   │ • 需求预测  │   │ • 意图识别  │   │ • 违规检测  │        │  │
│   │   │ • 正文撰写  │   │ • 价格弹性  │   │ • 知识检索  │   │ • 账号风险  │        │  │
│   │   │ • 标签推荐  │   │ • 竞品分析  │   │ • 多轮对话  │   │ • 舆情预警  │        │  │
│   │   │             │   │             │   │             │   │             │        │  │
│   │   │ 训练数据:   │   │ 训练数据:   │   │ 训练数据:   │   │ 训练数据:   │        │  │
│   │   │ 内容库+效果 │   │ 价格+订单   │   │ 客服记录    │   │ 违规案例    │        │  │
│   │   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘        │  │
│   │                                                                                  │  │
│   │   模型迭代: 收集企业端反馈 → 标注数据 → 微调训练 → 灰度发布 → 全量更新             │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                              │
│                                          ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           配置下发中心 (Config Center)                           │  │
│   │                                                                                  │  │
│   │   下发内容:                                                                       │  │
│   │   ├─ AI模型版本    (v2.3.0 → 企业端)                                            │  │
│   │   ├─ 定价算法参数  (elasticity=0.8, competitor_weight=0.6)                      │  │
│   │   ├─ 内容模板库    (春节模板/暑期模板)                                          │  │
│   │   ├─ 客服话术库    (更新FAQ/标准回复)                                           │  │
│   │   ├─ 风控规则      (新违规词库/封号特征)                                        │  │
│   │   └─ 功能开关      (新功能灰度/AB测试分组)                                      │  │
│   │                                                                                  │  │
│   │   下发方式: HTTP推送 / 长轮询 / 企业端定时拉取                                   │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           ↑↓ 数据同步/配置下发
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    企业端 (Enterprise Frontend)                          │
│                              华美会集团代运营操作界面                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           表现层 (React + iframe嵌入)                            │  │
│   │                                                                                  │  │
│   │   模式A: 独立后台 (完整功能)          模式B: iframe嵌入 (华美PMS内)              │  │
│   │   ┌─────────────────────────────┐    ┌─────────────────────────────┐             │  │
│   │   │  [侧边栏] [顶部导航]         │    │  [简化导航] 嵌入PMS页面      │             │  │
│   │   │                             │    │                             │             │  │
│   │   │  ┌───────────────────────┐  │    │  ┌───────────────────────┐  │             │  │
│   │   │  │   内容/定价/订单/数据  │  │    │  │   核心功能模块         │  │             │  │
│   │   │  └───────────────────────┘  │    │  └───────────────────────┘  │             │  │
│   │   └─────────────────────────────┘    └─────────────────────────────┘             │  │
│   │                                                                                  │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                              │
│                                          ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           业务逻辑层                                             │  │
│   │                                                                                  │  │
   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │  │
   │   │   内容中心    │  │  全域定价中心  │  │   订单中心    │  │   账号中心    │        │  │
   │   │              │  │  (AI+多渠道)  │  │              │  │              │        │  │
   │   │ • 调用AI接口 │  │ • AI定价建议 │  │ • 渠道抓取   │  │ • 账号池管理 │        │  │
   │   │ • 批量生成   │  │ • 批量调价   │  │ • 订单聚合   │  │ • 分配酒店   │        │  │
   │   │ • 提交审核   │  │ • 底价保护   │  │ • 同步PMS    │  │ • 状态监控   │        │  │
   │   │ • 发布执行   │  │ • 统控/自控  │  │ • 核销管理   │  │ • 风控预警   │        │  │
   │   │              │  │              │  │              │  │              │        │  │
   │   │ 数据上报 →  │  │ 数据上报 →  │  │ 数据上报 →  │  │ 数据上报 →  │        │  │
   │   │ 内容效果    │  │ 定价效果    │  │ 订单数据    │  │ 账号状态    │        │  │
   │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │  │
   │                                                                                  │  │
   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                          │  │
   │   │  AI客服中心   │  │  渠道分析中心  │  │   风控中心    │                          │  │
   │   │  (统一接量)   │  │ (可扩展插件)  │  │(平台+法规)   │                          │  │
   │   │ • 统一收件箱 │  │ • GMV分析    │  │ • 平台规则   │                          │  │
   │   │ • 智能分发   │  │ • 转化漏斗   │  │ • 广告法合规 │                          │  │
   │   │ • 话术库     │  │ • ROI计算    │  │ • 账号安全   │                          │  │
   │   │ • 人机协作   │  │ • 渠道扩展   │  │ • 实时检测   │                          │  │
   │   │              │  │              │  │              │                          │  │
   │   │ 数据上报 →  │  │ 数据上报 →  │  │ 数据上报 →  │                          │  │
   │   │ 客服记录    │  │ 渠道效果    │  │ 风控事件    │                          │  │
   │   └──────────────┘  └──────────────┘  └──────────────┘                          │  │
   │                                                                                  │  
   │   ┌─────────────────────────────────────────────────────────────────────────┐   │  
   │   │                         实时推演引擎 (简化)                              │   │  
   │   │   • 模拟不同策略效果 (不下发，仅本地计算预览)                             │   │  
   │   │   • 调用管理端预测API获取结果                                          │   │  
   │   └─────────────────────────────────────────────────────────────────────────┘   │  
   └─────────────────────────────────────────────────────────────────────────────────┘  
│                                          │                                              │
│                                          ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           本地数据层                                             │  │
│   │                                                                                  │  │
│   │   ├─ 账号池缓存      (Redis)          ← 集团分配的账号                          │  │
│   │   ├─ 待发布队列      (Redis)          ← 批量生成待审核内容                       │  │
│   │   ├─ 订单缓存        (Redis)          ← 渠道订单临时存储                         │  │
│   │   └─ 本地配置        (LocalStorage)   ← 用户偏好、草稿                          │  │
│   │                                                                                  │  │
│   │   注: 核心业务数据实时同步至管理端数据仓库，本地仅缓存                           │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                              │
│                                          ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                           外部集成层                                             │  │
│   │                                                                                  │  │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│   │   │  闲鱼API    │  │ 小红书API   │  │  微信API    │  │  华美PMS    │            │  │
│   │   │             │  │             │  │             │  │             │            │  │
│   │   │ • 商品发布  │  │ • 笔记发布  │  │ • 小程序    │  │ • 房态查询  │            │  │
│   │   │ • 订单抓取  │  │ • 私信回复  │  │ • 公众号    │  │ • 订单创建  │            │  │
│   │   │ • 消息通知  │  │ • 订单接入  │  │ • 支付      │  │ • 库存同步  │            │  │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │  │
│   └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 数据流向详解

### 1. 上行数据流 (企业端 → 管理端)

```
企业端操作产生的数据 ──────────────────────────────────────────────────────────────▶ 管理端

内容数据:
  生成内容 → 发布内容 → 内容效果(曝光/点击/转化) ───────────────────────────────▶ 内容库
                                                                             ↓
定价数据:                                                                   RAG
  调价操作 → 价格数据 → 订单转化数据 ──────────────────────────────────────────▶ 价格知识库
                                                                             ↓
客服数据:                                                                   向量
  对话记录 → 满意度评分 → 人工介入记录 ────────────────────────────────────────▶ 客服知识库
                                                                             ↓
订单数据:                                                                   存储
  订单详情 → 用户行为 → 支付/取消/退款 ────────────────────────────────────────▶ 交易数据仓库
                                                                             ↓
账号数据:                                                                   图
  账号操作 → 登录日志 → 风控事件 ──────────────────────────────────────────────▶ 账号图谱
```

### 2. 下行配置流 (管理端 → 企业端)

```
管理端训练优化 ────────────────────────────────────────────────────────────────▶ 企业端应用

AI模型更新:
  新模型版本训练完成 ──────────────────────────────────────────────────────────▶ 模型版本下发
                                                                                  ↓
定价策略优化:                                                                   企业端
  算法参数调优 (elasticity=0.8) ───────────────────────────────────────────────▶ 应用新参数
                                                                                  ↓
内容模板更新:                                                                   自动
  新增"春节大促"模板 ──────────────────────────────────────────────────────────▶ 模板库更新
                                                                                  ↓
客服话术升级:                                                                   生效
  FAQ知识库更新 ───────────────────────────────────────────────────────────────▶ 知识库同步
                                                                                  ↓
风控规则更新:
  新增违规词/封号特征 ─────────────────────────────────────────────────────────▶ 规则引擎更新
```

---

## 管理端核心模块

### 数据仓库设计

```typescript
// 管理端数据仓库 Schema
interface DataWarehouse {
  // 交易数据表
  orders: {
    orderId: string;
    channel: 'xianyu' | 'xiaohongshu' | 'wechat';
    hotelId: string;
    groupId: string;
    roomTypeId: string;
    checkIn: Date;
    checkOut: Date;
    basePrice: number;
    sellPrice: number;
    platformFee: number;
    commission: number;
    status: 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
    createdAt: Date;
    userSegment: string;  // 用于用户画像
  };
  
  // 内容数据表
  content: {
    contentId: string;
    type: 'note' | 'product' | 'moment';
    channel: string;
    hotelId: string;
    aiGenerated: boolean;
    aiModelVersion: string;
    rawContent: string;
    publishedContent: string;
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      engagement: number;
    };
    createdAt: Date;
  };
  
  // 客服数据表
  conversations: {
    sessionId: string;
    channel: string;
    hotelId: string;
    messages: Message[];
    aiHandled: boolean;
    aiModelVersion: string;
    satisfaction: number;
    escalated: boolean;
    escalationReason: string;
    resolution: string;
    createdAt: Date;
  };
  
  // 操作日志表 (用于审计和回溯)
  operations: {
    operationId: string;
    type: string;
    operatorId: string;
    hotelId: string;
    details: object;
    beforeState: object;
    afterState: object;
    timestamp: Date;
  };
}
```

### RAG 知识引擎

```typescript
// 管理端 RAG 服务
interface RAGEngine {
  // 知识库构建
  indexBuilding: {
    // 从数据仓库构建向量索引
    buildHotelKnowledge(): Promise<void>;
    buildPricingKnowledge(): Promise<void>;
    buildServiceKnowledge(): Promise<void>;
    buildComplianceKnowledge(): Promise<void>;
  };
  
  // 检索服务 (供AI模型调用)
  retrieval: {
    // 为内容生成检索相关素材
    retrieveContentContext(hotelId: string, topic: string): Promise<Context[]>;
    
    // 为定价决策检索历史案例
    retrievePricingContext(hotelId: string, dateRange: DateRange): Promise<Context[]>;
    
    // 为客服回复检索FAQ
    retrieveServiceContext(query: string, hotelId: string): Promise<Context[]>;
    
    // 为风控检索违规案例
    retrieveComplianceContext(content: string): Promise<Context[]>;
  };
  
  // 知识更新
  update: {
    incrementalUpdate(): Promise<void>;  // 增量更新
    fullRebuild(): Promise<void>;        // 全量重建
  };
}
```

### 配置下发服务

```typescript
// 管理端配置中心
interface ConfigCenter {
  // 配置类型
  configs: {
    aiModels: {
      contentModel: { version: string; endpoint: string; parameters: object };
      pricingModel: { version: string; endpoint: string; parameters: object };
      serviceModel: { version: string; endpoint: string; parameters: object };
    };
    
    templates: {
      contentTemplates: ContentTemplate[];  // 内容模板库
      replyTemplates: ReplyTemplate[];      // 回复话术库
    };
    
    rules: {
      pricingRules: PricingRule[];          // 定价规则
      complianceRules: ComplianceRule[];    // 合规规则
      riskRules: RiskRule[];                // 风控规则
    };
    
    features: {
      featureFlags: Record<string, boolean>; // 功能开关
      abTestConfig: ABTestConfig;           // AB测试配置
    };
  };
  
  // 下发接口
  distribution: {
    // 推送给指定企业端
    pushToEnterprise(enterpriseId: string, config: Config): Promise<void>;
    
    // 批量推送给多个企业
    batchPush(enterpriseIds: string[], config: Config): Promise<void>;
    
    // 企业端拉取配置
    pullConfig(enterpriseId: string, version: string): Promise<Config>;
  };
  
  // 版本管理
  versioning: {
    createVersion(config: Config): string;
    rollbackVersion(version: string): Promise<void>;
    compareVersions(v1: string, v2: string): Diff;
  };
}
```

---

## 企业端核心模块

### 内容中心 (Content Center)

```typescript
interface ContentCenter {
  // 内容生成 (调用管理端AI API)
  generation: {
    // 批量生成内容
    batchGenerate(params: {
      hotelIds: string[];
      platform: 'xianyu' | 'xiaohongshu' | 'wechat';
      template: string;
      dateRange: DateRange;
    }): Promise<GeneratedContent[]>;
  };
  
  // 内容审核 (本地初审 + 管理端复审)
  review: {
    localReview(content: GeneratedContent): ReviewResult;
    submitToManagement(content: GeneratedContent): Promise<void>;
  };
  
  // 内容发布 (对接渠道API)
  publishing: {
    publishToXianyu(content: Content): Promise<void>;
    publishToXiaohongshu(content: Content): Promise<void>;
    publishToWechat(content: Content): Promise<void>;
  };
  
  // 效果追踪 (上报管理端)
  tracking: {
    syncMetrics(): Promise<void>;  // 定时同步效果数据
  };
}
```

### 定价中心 (Pricing Center)

```typescript
interface PricingCenter {
  // 定价建议 (调用管理端AI API)
  recommendation: {
    getRecommendations(params: {
      hotelId: string;
      dateRange: DateRange;
    }): Promise<PricingRecommendation[]>;
  };
  
  // 批量调价
  batchUpdate: {
    applyToHotels(hotelIds: string[], prices: PriceUpdate[]): Promise<void>;
    syncToPMS(hotelId: string, prices: PriceUpdate[]): Promise<void>;
  };
  
  // 底价保护
  floorPrice: {
    checkFloorPrice(hotelId: string, price: number): boolean;
    getFloorPrice(hotelId: string, date: Date): number;
  };
}
```

### 订单中心 (Order Center)

```typescript
interface OrderCenter {
  // 渠道订单抓取
  fetch: {
    fetchXianyuOrders(): Promise<Order[]>;
    fetchXiaohongshuOrders(): Promise<Order[]>;
    fetchWechatOrders(): Promise<Order[]>;
  };
  
  // 订单同步至PMS
  sync: {
    createPMSOrder(order: Order): Promise<void>;
    syncStatus(orderId: string, status: OrderStatus): Promise<void>;
  };
  
  // 核销管理
  fulfillment: {
    verifyOrder(orderId: string): Promise<void>;
    cancelOrder(orderId: string, reason: string): Promise<void>;
  };
}
```

---

## 权限模型

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              权限分层设计                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   管理端权限 (管理端内部角色)                                                        │
│   ├─ 超级管理员: 系统配置、模型训练、全局下发                                        │
│   ├─ 数据分析师: 数据分析、报表导出                                                  │
│   ├─ 算法工程师: 模型调优、参数配置                                                  │
│   └─ 运维人员: 配置发布、监控告警                                                    │
│                                                                                     │
│   企业端权限 (华美会组织内角色)                                                      │
│   ├─ 集团管理员 (华美会总部运营)                                                    │
│   │   ├─ 可见范围: 所有酒店数据                                                     │
│   │   ├─ 批量操作: 内容/定价/账号                                                   │
│   │   ├─ 审核权限: 内容审核通过                                                     │
│   │   └─ 配置权限: 统控/自控模式切换                                                │
│   │                                                                                 │
│   └─ 酒店操作员 (单店店长/前台)                                                     │
│       ├─ 可见范围: 本酒店数据                                                       │
│       ├─ 操作权限: 内容生成(需审核)/订单核销                                         │
│       └─ 定价权限: 仅查看(统控模式) or 调价(自控模式，受底价限制)                   │
│                                                                                     │
│   模式配置 (集团可配置)                                                              │
│   ├─ content: 'group_control' | 'hotel_self'   // 集团审核 or 酒店自主             │
│   ├─ pricing:  'group_control' | 'hotel_self'   // 集团统控 or 酒店自控            │
│   └─ service:  'group_control' | 'hotel_self'   // 集团统一 or 酒店自主            │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 实施要点

### 1. 数据同步策略

| 数据类型 | 同步方式 | 频率 | 说明 |
|---------|---------|------|------|
| 订单数据 | Webhook + 定时补偿 | 实时 | 渠道订单实时抓取，即时同步PMS |
| 内容效果 | 批量上报 | 每小时 | 曝光/点击数据汇总上报 |
| 客服对话 | 实时上报 | 实时 | 对话结束后立即上报 |
| 配置下发 | 长连接推送 | 实时 | 新配置即时推送到企业端 |

### 2. 关键技术决策

1. **管理端AI服务**: 独立部署，通过API向企业端提供服务
2. **RAG存储**: PGVector (向量) + Neo4j (图谱)
3. **配置下发**: WebSocket长连接 + 降级轮询
4. **数据仓库**: ClickHouse (分析) + PostgreSQL (事务)

### 3. 复用策略

| 组件 | 来源 | 复用方式 |
|-----|------|---------|
| ContentEditor | 酒店端 | UI组件复用，增加批量功能 |
| AI生成API | 现有服务 | 接入管理端API |
| 订单表格 | 企业版 | 样式复用，增加渠道聚合 |
| 权限控制 | 企业版 | 扩展角色体系 |


---

## 企业端补充模块

### AI客服中心 (AI Service Center)

```typescript
interface AIServiceCenter {
  // 统一接量入口
  unifiedInbox: {
    // 聚合所有渠道咨询
    channels: ['xianyu', 'xiaohongshu', 'wechat', 'douyin', 'mafengwo'];
    // 统一消息格式
    messageFormat: {
      channel: string;        // 来源渠道
      hotelId: string;        // 所属酒店
      guestId: string;        // 客户标识
      content: string;        // 消息内容
      timestamp: Date;
      orderContext?: Order;   // 关联订单
    };
  };
  
  // 智能分发
  dispatch: {
    // AI自动处理常见问题
    autoHandle: (message: Message) => Promise<Response>;
    // 复杂问题转人工
    escalateToHuman: (message: Message, reason: string) => Promise<void>;
    // 酒店专人对接
    assignToHotel: (message: Message, hotelId: string) => Promise<void>;
  };
  
  // 话术库管理
  scriptLibrary: {
    // 集团统一话术
    groupScripts: Script[];
    // 酒店自定义话术
    hotelScripts: Map<hotelId, Script[]>;
    // AI推荐话术
    aiSuggestions: (context: ChatContext) => Promise<Script[]>;
  };
  
  // 人机协作
  collaboration: {
    // AI辅助回复建议
    aiAssist: (conversation: Conversation) => Promise<SuggestedReply[]>;
    // 人工审核AI回复
    humanReview: (reply: AIReply) => Promise<ApprovedReply>;
    // 满意度追踪
    satisfactionTracking: (sessionId: string) => Promise<SatisfactionScore>;
  };
}
```

**核心功能**：
- **统一接量**：华美会运营团队在一个界面处理所有酒店的所有渠道咨询
- **智能分发**：AI自动回答"有没有停车场"等标准问题，复杂问题转人工或转给具体酒店
- **话术库**：集团可配置统一话术，各酒店也可保留特色回复
- **人机协作**：AI生成回复建议，人工确认后发送，或AI直接处理简单问题

---

### 渠道分析中心 (Channel Analytics Center)

```typescript
interface ChannelAnalyticsCenter {
  // 渠道效果分析
  performance: {
    // 各渠道GMV对比
    gmvByChannel: Map<ChannelType, GMVData>;
    // 转化率漏斗
    conversionFunnel: {
      impressions: number;
      clicks: number;
      inquiries: number;
      orders: number;
      conversionRate: number;
    };
    // ROI计算
    roiAnalysis: (channel: ChannelType) => Promise<ROIResult>;
  };
  
  // 渠道扩展架构（插件化）
  channelPlugins: {
    // 三类渠道定义
    channelTypes: {
      content: {  // 内容种草类
        examples: ['xiaohongshu', 'douyin', 'mafengwo', 'qiongyou'];
        features: ['笔记发布', '视频挂载', '种草转化'];
      };
      c2c: {  // C2C成交类
        examples: ['xianyu', 'zhuanzhuan'];
        features: ['商品发布', '价格议价', '即时成交'];
      };
      private: {  // 私域运营类
        examples: ['wechat', 'wecom', 'sms'];
        features: ['朋友圈', '私聊', '社群', '公众号'];
      };
    };
    // 新增渠道插件接口
    pluginInterface: {
      register: (plugin: ChannelPlugin) => Promise<void>;
      unregister: (channelId: string) => Promise<void>;
    };
  };
  
  // 渠道配置（华美会自选）
  channelConfig: {
    // 启用/禁用渠道
    enabledChannels: ChannelType[];
    // 渠道配额分配
    quotaAllocation: Map<ChannelType, number>;
    // 渠道定价策略（可选与主定价不同）
    pricingStrategy: Map<ChannelType, PricingStrategy>;
  };
}
```

**核心功能**：
- **渠道效果**：对比小红书/闲鱼/微信等渠道的GMV、转化率、ROI
- **可扩展设计**：支持新增渠道（如抖音、马蜂窝），按三类渠道模型扩展
- **自选配置**：华美会可自主选择启用哪些渠道，分配配额

---

### 风控中心 (Risk Control Center)

```typescript
interface RiskControlCenter {
  // 平台规则风控（实时同步）
  platformCompliance: {
    // 闲鱼规则
    xianyuRules: {
      forbiddenWords: string[];        // 违禁词库
      priceLimits: { min: number; max: number };
      dailyPostLimit: number;
      updateFrequency: 'realtime';     // 实时同步平台规则
    };
    // 小红书规则
    xiaohongshuRules: {
      sensitiveWords: string[];
      commercialLimits: { postsPerDay: number; productsPerPost: number };
      contentGuidelines: ContentPolicy;
      updateFrequency: 'realtime';
    };
    // 微信规则
    wechatRules: {
      antiSpam: AntiSpamPolicy;
      paymentCompliance: PaymentPolicy;
      miniProgramRules: MiniProgramPolicy;
      updateFrequency: 'realtime';
    };
  };
  
  // 法律法规风控
  legalCompliance: {
    // 广告法合规
    advertisingLaw: {
      forbiddenTerms: ['最便宜', '第一', '国家级'];  // 极限词
      priceClaims: { requireProof: true };           // 价格宣称需凭证
    };
    // 消费者权益保护
    consumerProtection: {
      cancellationPolicy: { minimumAdvance: number };  // 退改政策
      refundGuarantee: boolean;                        // 退款保障
    };
    // 税务合规
    taxCompliance: {
      invoiceRequired: boolean;      // 发票要求
      transactionRecord: boolean;    // 交易记录留存
    };
    // 数据隐私
    dataPrivacy: {
      gdpr?: boolean;               // 欧盟GDPR（海外酒店）
      pipl: boolean;                // 中国个保法
      dataRetention: number;        // 数据保留期限
    };
  };
  
  // 账号安全风控
  accountSecurity: {
    // 封号风险检测
    banRiskDetection: (account: Account) => Promise<RiskScore>;
    // 异常行为监控
    anomalyDetection: {
      loginAnomaly: boolean;        // 登录异常
      postingFrequency: boolean;    // 发布频率异常
      messagePattern: boolean;      // 消息模式异常
    };
    // 账号健康度评分
    healthScore: (accountId: string) => Promise<HealthReport>;
  };
  
  // 实时检测引擎
  detectionEngine: {
    // 内容发布前检测
    prePublishCheck: (content: Content) => Promise<ComplianceResult>;
    // 实时监控
    realtimeMonitor: (account: Account) => Promise<Alert[]>;
    // 违规处置
    violationHandling: {
      autoFix: (violation: Violation) => Promise<FixedContent>;
      manualReview: (violation: Violation) => Promise<ReviewResult>;
      accountRotation: (accountId: string) => Promise<void>;  // 账号轮换
    };
  };
}
```

**核心功能**：
- **平台规则**：实时同步闲鱼/小红书/微信的最新规则，自动检测违禁词、违规图片
- **法律法规**：广告法合规（极限词检测）、消费者权益保护、税务合规、数据隐私
- **账号安全**：封号风险预警、异常行为检测、账号健康度评分

---

### 全域定价中心 (Universal Pricing Center)

```typescript
interface UniversalPricingCenter {
  // 全域定价能力（复用现有成熟系统）
  pricingEngine: {
    // AI定价建议（已做好，直接复用）
    aiRecommendation: {
      factors: ['inventory', 'competitor', 'event', 'demand', 'history'];
      models: ['deep_learning', 'time_series', 'ensemble'];
      output: {
        suggestedPrice: number;
        confidence: number;
        reasoning: string;
        factors: FactorWeight[];
      };
    };
    
    // 多渠道统一定价
    multiChannelPricing: {
      // 基础价格（来自华美会PMS或Shadow-Bees建议）
      basePrice: number;
      // 渠道差异化
      channelAdjustments: Map<ChannelType, Adjustment>;
      // 示例：小红书可溢价10%（种草价值），闲鱼可降价5%（价格敏感）
      examples: {
        xiaohongshu: { adjustment: +0.10, reason: '内容种草溢价能力' };
        xianyu: { adjustment: -0.05, reason: 'C2C价格敏感' };
        wechat: { adjustment: 0, reason: '私域原价' };
      };
    };
    
    // 与华美会定价系统的关系
    integrationMode: {
      // 模式A：Shadow-Bees建议，华美会决策（推荐）
      suggestionMode: {
        shadowBees: '提供AI定价建议';
        huameiPMS: '采纳或调整，最终定价权在PMS';
        sync: '建议价格实时同步到PMS';
      };
      // 模式B：Shadow-Bees直接控制（需授权）
      controlMode: {
        shadowBees: 'AI自动调价';
        huameiPMS: '设置底价/天花板价约束';
        sync: '价格直接写入PMS';
      };
      // 模式C：完全复用华美会定价（不启用Shadow-Bees定价）
      bypassMode: {
        shadowBees: '仅做渠道分析，不参与定价';
        huameiPMS: '完全自主定价';
      };
    };
  };
  
  // 定价策略（集团统控 or 分店自主）
  pricingStrategy: {
    // 统控模式
    groupControl: {
      lockPriceRange: { min: number; max: number };  // 锁定价格区间
      uniformAdjustment: number;                      // 统一调价幅度
      eventResponse: 'group_unified';                 // 事件统一响应
    };
    // 自控模式
    hotelSelf: {
      floorPrice: number;        // 底价（集团设定）
      ceilingPrice: number;      // 天花板价（集团设定）
      adjustmentRange: number;   // 可调价幅度
    };
  };
}
```

**核心功能**：
- **全域定价**：复用已做好的AI定价系统，覆盖所有渠道
- **渠道差异**：支持不同渠道不同定价策略（如小红书溢价、闲鱼降价）
- **灵活集成**：三种模式可选——建议模式（推荐）、控制模式、完全复用华美会定价
- **统控/自控**：集团可统一定价策略，也可放权给酒店自主调价（在底价范围内）

---

### 外部AI模型接入 (External AI Integration)

```typescript
interface ExternalAIIntegration {
  // 多模型路由
  modelRouter: {
    // 主模型
    primary: {
      provider: 'deepseek';
      model: 'deepseek-chat-v3';
      usage: ['content_generation', 'pricing_analysis', 'customer_service'];
    };
    // 备用模型（自动降级）
    fallback: [
      { provider: 'baidu', model: 'ernie-4.0', priority: 1 },
      { provider: 'alibaba', model: 'qwen-max', priority: 2 },
      { provider: 'openai', model: 'gpt-4o', priority: 3 },
    ];
    // 路由策略
    routingStrategy: {
      default: 'primary';
      onFailure: 'fallback_to_next';
      loadBalance: 'round_robin';
    };
  };
  
  // 模型专用场景
  modelSpecialization: {
    contentGeneration: {
      preferred: 'deepseek';      // 中文内容生成效果好
      backup: ['baidu', 'alibaba'];
    };
    pricingAnalysis: {
      preferred: 'deepseek';      // 逻辑推理能力强
      backup: ['openai'];
    };
    customerService: {
      preferred: 'deepseek';      // 对话自然度高
      backup: ['baidu'];
    };
    complianceCheck: {
      preferred: 'alibaba';       // 国内合规理解更深
      backup: ['deepseek'];
    };
  };
  
  // 模型管理
  modelManagement: {
    // API密钥管理
    apiKeys: Map<Provider, EncryptedKey>;
    // 调用配额控制
    quotaControl: {
      dailyLimit: number;
      rateLimit: number;
      costBudget: number;
    };
    // 效果监控
    monitoring: {
      latency: number;
      successRate: number;
      tokenUsage: number;
      costPerCall: number;
    };
  };
}
```

**核心功能**：
- **多模型备份**：DeepSeek为主，百度文心/阿里通义/OpenAI为备用，自动降级
- **场景专用**：不同场景优选不同模型（如合规检测优选阿里）
- **配额控制**：API调用配额管理，成本控制

---

### 集团AI效果看板 (Group AI Dashboard)

```typescript
interface GroupAIDashboard {
  // AI采纳率分析
  adoptionRate: {
    // 整体采纳率
    overall: number;
    // 分酒店采纳率
    byHotel: Map<HotelId, number>;
    // 分模块采纳率
    byModule: {
      pricing: number;      // 定价建议采纳率
      content: number;      // 内容生成采纳率
      service: number;      // 客服AI处理率
    };
    // 采纳趋势
    trend: TimeSeriesData;
  };
  
  // 收益提升分析
  revenueUplift: {
    // AI带来的增量收益
    incrementalGMV: number;
    // RevPAR提升
    revparUplift: number;
    // 对比分析（用AI vs 不用AI的酒店）
    comparison: {
      withAI: { revpar: number; occupancy: number };
      withoutAI: { revpar: number; occupancy: number };
      uplift: number;
    };
    // 归因分析
    attribution: {
      pricingContribution: number;    // 定价贡献
      contentContribution: number;    // 内容贡献
      serviceContribution: number;    // 客服贡献
    };
  };
  
  // 人效提升分析
  efficiencyGain: {
    // 节省人工时间
    timeSaved: number;          // 小时/月
    // 人力成本节省
    laborCostSaved: number;     // 元/月
    // 具体场景
    byTask: {
      contentCreation: number;  // 内容创作节省
      customerService: number;  // 客服节省
      pricingDecision: number;  // 定价决策节省
    };
  };
  
  // ROI计算
  roi: {
    // 投入成本
    investment: {
      aiServiceFee: number;
      implementationCost: number;
      trainingCost: number;
    };
    // 回报收益
    return: {
      revenueUplift: number;
      costSavings: number;
    };
    // ROI比率
    roiRatio: number;           // (Return - Investment) / Investment
    paybackPeriod: number;      // 回本周期（月）
  };
}
```

**核心功能**：
- **AI采纳率**：集团各酒店、各模块的AI建议采纳情况
- **收益提升**：AI带来的GMV增量、RevPAR提升、对比分析
- **人效提升**：节省人工时间、人力成本
- **ROI计算**：投入产出比、回本周期

---

## 功能边界与复用策略（补充）

### Shadow-Bees vs 华美会PMS 功能边界

| 功能模块 | 华美会PMS | Shadow-Bees | 集成方式 |
|---------|-----------|-------------|---------|
| **房价管理** | ✅ 自动续价、AI控价 | ⚠️ AI定价建议（可选） | 建议模式：Shadow-Bees建议 → 华美会决策 |
| **库存管理** | ✅ 房态日历、库存管理 | ⚠️ 库存查询+渠道配额 | Shadow-Bees查PMS库存，分配私域配额 |
| **订单管理** | ✅ 订单处理、入住退房 | ⚠️ 私域订单抓取+写入 | Shadow-Bees抓取私域订单 → 写入PMS |
| **财务报表** | ✅ 财务中心 | ❌ 不做 | 完全复用华美会 |
| **AI内容生成** | ❌ 无 | ✅ 做 | Shadow-Bees核心能力 |
| **AI客服** | ❌ 无 | ✅ 做 | Shadow-Bees核心能力 |
| **私域账号管理** | ❌ 无 | ✅ 做 | Shadow-Bees核心能力 |
| **渠道分析** | ❌ 无 | ✅ 做 | Shadow-Bees核心能力 |
| **事件情报** | ❌ 无 | ⚠️ 弱化做 | 作为AI定价输入因子，不做独立页面 |

### 关键数据流向（补充）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         数据流向补充说明                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. 订单流向（关键）                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  私域渠道   │───▶│ Shadow-Bees │───▶│  华美会PMS  │                     │
│  │ 下单        │    │ 订单抓取    │    │ 创建订单    │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                           │                                                 │
│                           ▼                                                 │
│                    订单数据上报管理端（用于AI学习）                           │
│                                                                              │
│  2. 库存流向                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  华美会PMS  │───▶│ Shadow-Bees │───▶│  私域渠道   │                     │
│  │ 总库存      │    │ 配额分配    │    │ 可售库存    │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                              │
│  3. 定价流向（可选）                                                          │
│  模式A（建议）：Shadow-Bees AI建议 ──▶ 华美会PMS决策 ──▶ 各渠道              │
│  模式B（控制）：Shadow-Bees AI决策 ──▶ 直接写入PMS ──▶ 各渠道                │
│  模式C（复用）：完全使用华美会PMS定价，Shadow-Bees不参与                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 实施要点补充

### 4. 渠道扩展接入规范

```typescript
// 新增渠道接入标准流程
interface ChannelExtensionGuide {
  // 步骤1：渠道分类
  classify: (channel: NewChannel) => ChannelType;  // content | c2c | private
  
  // 步骤2：实现适配器
  implementAdapter: {
    orderFetch: () => Promise<Order[]>;      // 订单抓取
    contentPublish: () => Promise<void>;     // 内容发布
    messageReply: () => Promise<void>;       // 消息回复
    metricsQuery: () => Promise<Metrics>;    // 数据查询
  };
  
  // 步骤3：规则配置
  configureRules: {
    complianceRules: ComplianceRule[];       // 平台规则
    pricingStrategy: PricingStrategy;        // 定价策略
    quotaAllocation: number;                 // 配额分配
  };
  
  // 步骤4：测试上线
  testing: {
    sandbox: boolean;                        // 沙箱测试
    pilot: string[];                         // 试点酒店
    rollout: 'gradual' | 'full';             //  rollout策略
  };
}
```

### 5. 风控规则同步机制

| 规则类型 | 同步来源 | 同步频率 | 更新机制 |
|---------|---------|---------|---------|
| 闲鱼规则 | 闲鱼开放平台 | 实时 | Webhook推送 |
| 小红书规则 | 小红书开放平台 | 实时 | Webhook推送 |
| 微信规则 | 微信开放平台 | 实时 | Webhook推送 |
| 广告法 | 国家市监总局 | 定期 | 人工更新 |
| 个保法 | 法规数据库 | 定期 | 人工更新 |

**版权所有**: Shadow-Bees Team  
**最后更新**: 2026-03-06
