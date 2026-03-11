# Shadow-Bees 企业版 - 数据源合规检查报告

> 检查日期：2026-03-08  
> 检查原则：页面应通过 API 层获取数据，不应在组件内部直接定义 Mock 数据

---

## 📊 检查汇总

| 分类 | 数量 | 占比 |
|------|------|------|
| ✅ 符合规范（使用 API 层） | 8 个 | 33% |
| ❌ 存在问题（组件内 Mock 数据） | 16 个 | 67% |
| **总计** | **24 个** | **100%** |

---

## ✅ 符合规范的页面（8个）

| 序号 | 页面名称 | 文件路径 | 说明 |
|------|----------|----------|------|
| 1 | 工单中心 | `pages/TicketCenter/index.tsx` | 使用 `ticketApi` |
| 2 | 数据大盘 | `pages/overview/DataDashboard.tsx` | 使用 `dashboardApi` |
| 3 | 账号管理 | `pages/AccountCenter/AccountPool.tsx` | 导入 API 类型 |
| 4 | 库存日历 | `pages/InventoryCalendar/index.tsx` | 使用 `inventoryApi`, `hotelApi` |
| 5 | 审计日志 | `pages/RiskCenter/AuditLog.tsx` | 使用 `auditApi` |
| 6 | 今日实况 | `pages/overview/TodayOverview.tsx` | 通过 enterpriseStore 获取 |
| 7 | AI效果看板 | `pages/overview/AIDashboard.tsx` | 通过 enterpriseStore 获取 |
| 8 | 全域定价 | `pages/finance/UniversalPricing.tsx` | 部分使用 API，但存在直接导入 mockData |

---

## ❌ 存在问题的页面（16个）

### 🔴 严重问题（直接在组件内定义 Mock 数据）

#### 1. 订单管理
**文件**: `pages/OrderManagement/index.tsx`

**问题**：
- 第 128 行直接定义 `MOCK_ORDERS` 数组
- 第 245 行使用 `useState(MOCK_ORDERS)` 作为初始值

```typescript
const MOCK_ORDERS: NonStandardOrder[] = [
  { id: 'order-001', hotelId: 'hotel_001', ... },
  { id: 'order-002', hotelId: 'hotel_001', ... },
  // ... 更多数据
];

const [orders, setOrders] = useState<NonStandardOrder[]>(MOCK_ORDERS);
```

**建议**：应通过 `orderApi.getOrders()` 获取

---

#### 2. 合规中心
**文件**: `pages/risk/ComplianceCenter.tsx`

**问题**：
- 第 147 行定义 `MOCK_PLATFORM_RULES`
- 第 210 行定义 `MOCK_LEGAL_COMPLIANCE`
- 第 250 行定义 `MOCK_RISK_EVENTS`
- 第 303-305 行直接使用这些 mock 数据作为 state 初始值

```typescript
const MOCK_PLATFORM_RULES: PlatformRule[] = [...];
const MOCK_LEGAL_COMPLIANCE: LegalCompliance[] = [...];
const MOCK_RISK_EVENTS: RiskEvent[] = [...];

const [platformRules, setPlatformRules] = useState(MOCK_PLATFORM_RULES);
const [legalCompliance] = useState(MOCK_LEGAL_COMPLIANCE);
const [riskEvents, setRiskEvents] = useState(MOCK_RISK_EVENTS);
```

**建议**：应通过 `complianceApi.getPlatformRules()` 等 API 获取

---

#### 3. 风险预警
**文件**: `pages/RiskCenter/RiskWarning.tsx`

**问题**：
- 第 292 行定义 `MOCK_PREDICTIONS`
- 第 351 行定义 `MOCK_KNOWLEDGE`
- 直接在页面中渲染这些 mock 数据

```typescript
const MOCK_PREDICTIONS: RiskPrediction[] = [...];
const MOCK_KNOWLEDGE: RiskKnowledge[] = [...];

// 在渲染中直接使用
{MOCK_PREDICTIONS.map(pred => ...)}
{MOCK_KNOWLEDGE.map(knowledge => ...)}
```

---

#### 4. 统一收件箱（AI客服）
**文件**: `pages/aichat/UnifiedInbox.tsx`

**问题**：
- 第 116 行定义 `MOCK_MESSAGES`
- 第 354 行使用 `useState(MOCK_MESSAGES)`

```typescript
const MOCK_MESSAGES: ChatMessage[] = [...];
const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
```

---

#### 5. 人工转接
**文件**: `pages/aichat/HumanHandoff.tsx`

**问题**：
- 第 60 行定义 `MOCK_HANDOFFS`
- 第 267 行使用 `useState(MOCK_HANDOFFS)`

```typescript
const MOCK_HANDOFFS: HandoffRequest[] = [...];
const [requests, setRequests] = useState<HandoffRequest[]>(MOCK_HANDOFFS);
```

---

#### 6. 人机协作
**文件**: `pages/aichat/HumanAICollab.tsx`

**问题**：
- 第 69 行定义 `MOCK_SESSIONS`
- 第 236-237 行直接使用

```typescript
const MOCK_SESSIONS: CollabSession[] = [...];
const [sessions, setSessions] = useState<CollabSession[]>(MOCK_SESSIONS);
const [selectedSession, setSelectedSession] = useState<CollabSession | null>(MOCK_SESSIONS[0]);
```

---

#### 7. AI客服数据看板
**文件**: `pages/aichat/AIDashboard.tsx`

**问题**：
- 第 85 行定义 `MOCK_SLA_STATS`
- 第 93 行定义 `MOCK_AI_EFFECTIVENESS`
- 第 102 行定义 `MOCK_AGENT_PERFORMANCE`
- 第 110 行定义 `MOCK_CHANNEL_STATS`
- 第 116 行定义 `MOCK_TIME_SERIES`

```typescript
const MOCK_SLA_STATS: SLAStats = { ... };
const MOCK_AI_EFFECTIVENESS: AIEffectiveness = { ... };
const MOCK_AGENT_PERFORMANCE: AgentPerformance[] = [...];
const MOCK_CHANNEL_STATS: ChannelStats[] = [...];
const MOCK_TIME_SERIES: TimeSeriesData[] = [...];
```

**特点**：这个页面完全使用本地 mock 数据，没有任何 API 调用

---

#### 8. AI话术库
**文件**: `pages/aichat/ScriptLibrary.tsx`

**问题**：
- 第 67 行定义 `MOCK_SCRIPTS`
- 第 466 行使用 `useState(MOCK_SCRIPTS)`

```typescript
const MOCK_SCRIPTS: Script[] = [...];
const [scripts, setScripts] = useState<Script[]>(MOCK_SCRIPTS);
```

---

#### 9. 定价策略
**文件**: `pages/StrategyCenter/PricingStrategy.tsx`

**问题**：
- 第 168 行定义 `MOCK_SUGGESTIONS`
- 第 332 行使用 `useState(MOCK_SUGGESTIONS)`

```typescript
const MOCK_SUGGESTIONS: PricingSuggestion[] = [...];
const [suggestions, setSuggestions] = useState<PricingSuggestion[]>(MOCK_SUGGESTIONS);
```

---

#### 10. 内容工厂
**文件**: `pages/ContentCenter/ContentFactory.tsx`

**问题**：
- 第 139 行定义 `mockImageLibrary`

```typescript
const mockImageLibrary = [
  { id: '1', url: '/images/hotel-1.jpg', ... },
  // ...
];
```

---

#### 11. 私域运营
**文件**: `pages/ContentCenter/PrivateDomain.tsx`

**问题**：
- 第 20 行定义空数组 `mockTransactions`
- 第 166 行定义 `mockPrivateContents`
- 第 209 行定义 `mockTasks`
- 第 249 行定义 `mockFollowUps`
- 第 274 行定义空数组 `mockContents`

```typescript
const mockTransactions: any[] = [];
const mockPrivateContents: PrivateContent[] = [...];
const mockTasks: OperationTask[] = [...];
const mockFollowUps: FollowUpRecord[] = [...];
const mockContents: any[] = [];
```

---

#### 12. 发布管理
**文件**: `pages/ContentCenter/PublishStatus.tsx`

**问题**：
- 第 49 行定义 `mockContents`
- 第 88 行定义 `mockTransactions`

```typescript
const mockContents: ContentItem[] = [...];
const mockTransactions: Transaction[] = [...];
```

---

### 🟡 次要问题（从 mockData.ts 直接导入，而非通过 API 层）

#### 13. 事件情报
**文件**: `pages/IntelligenceCenter/EventsIntel.tsx`

**问题**：
- 第 17 行直接从 mockData 导入函数

```typescript
import { getEventsForHotel, generateCompetitorsByTier } from '../../api/mockData';
```

**建议**：应通过 `eventsApi.getEventsForHotel()` 调用

---

#### 14. 全域定价
**文件**: `pages/finance/UniversalPricing.tsx`

**问题**：
- 第 26 行直接从 mockData 导入

```typescript
import { getCompetitorPriceRange, RoomCategory } from '../../api/mockData';
```

**建议**：应通过 `pricingApi.getCompetitorPriceRange()` 调用

---

### 🟠 其他问题（在 Layout/App 中定义酒店数据）

#### 15. App.tsx
**文件**: `App.tsx`

**问题**：
- 第 84-199 行直接在组件内定义酒店数组

```typescript
setHotels([
  { id: 'hotel_001', name: '北京三里屯店', ... },
  { id: 'hotel_002', name: '北京国贸店', ... },
  // ... 更多酒店
]);
```

---

#### 16. 门店对比
**文件**: `pages/overview/HotelComparison.tsx`（疑似）

需要进一步确认是否直接使用本地数据...

---

## 📋 需要创建的 API 模块

根据检查发现，以下 API 模块尚未创建或完善：

| 模块 | 状态 | 说明 |
|------|------|------|
| `orderApi` | ✅ 存在 | 但页面未使用 |
| `complianceApi` | ❌ 缺失 | 合规中心需要 |
| `riskApi` | ❌ 缺失 | 风险预警需要 |
| `aichatApi` | ❌ 缺失 | AI客服相关页面需要 |
| `scriptApi` | ❌ 缺失 | 话术库需要 |
| `strategyApi` | ❌ 缺失 | 定价策略需要 |
| `contentApi` | ✅ 存在 | 但内容工厂未使用 |
| `eventsApi` | ❌ 缺失 | 事件情报需要 |

---

## 🎯 修复优先级建议

### P0（高优先级）
1. `pages/OrderManagement/index.tsx` - 核心业务
2. `pages/RiskCenter/RiskWarning.tsx` - 风控核心
3. `pages/aichat/AIDashboard.tsx` - AI核心看板

### P1（中优先级）
4. `pages/aichat/UnifiedInbox.tsx` - AI客服
5. `pages/aichat/HumanHandoff.tsx` - 人工转接
6. `pages/aichat/HumanAICollab.tsx` - 人机协作
7. `pages/StrategyCenter/PricingStrategy.tsx` - 定价策略

### P2（低优先级）
8. `pages/risk/ComplianceCenter.tsx` - 合规中心
9. `pages/ContentCenter/ContentFactory.tsx` - 内容工厂
10. `pages/ContentCenter/PrivateDomain.tsx` - 私域运营
11. `pages/ContentCenter/PublishStatus.tsx` - 发布管理
12. `pages/aichat/ScriptLibrary.tsx` - 话术库

### P3（最低优先级）
13. `App.tsx` - 初始化酒店数据（实际接入PMS后会替换）
14. `pages/IntelligenceCenter/EventsIntel.tsx` - 事件情报
15. `pages/finance/UniversalPricing.tsx` - 已部分使用API

---

## 📝 修复示例

### 错误做法 ❌
```typescript
// 直接在页面中定义 mock 数据
const MOCK_ORDERS = [...];
const [orders, setOrders] = useState(MOCK_ORDERS);
```

### 正确做法 ✅
```typescript
// 1. 在 api/orderApi.ts 中定义
export async function getOrders(params) {
  // 现在是 mock 数据
  return Promise.resolve({ data: MOCK_ORDERS });
  // 未来替换为真实 API
  // return axios.get('/api/orders', { params });
}

// 2. 在页面中通过 API 层获取
import { orderApi } from '../../api';

const [orders, setOrders] = useState([]);

useEffect(() => {
  orderApi.getOrders().then(res => {
    if (res.success) {
      setOrders(res.data);
    }
  });
}, []);
```

---

**报告生成完成** - 共检查 24 个功能页面，发现 16 个页面存在问题
