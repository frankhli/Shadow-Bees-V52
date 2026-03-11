# 企业端问题修复报告

## 修复时间
2026-03-08

## 问题分类汇总

### 一、Mock数据格式不一致（已修复）

**问题描述：**
- `MOCK_HOTELS` 使用 `hotel-001`（短横线格式）
- `MOCK_ORDERS`、`MOCK_TICKETS`、`MOCK_EVENTS` 等使用 `hotel_001`（下划线格式）
- 导致酒店ID无法匹配，筛选后显示为空

**已修复文件：**
- `src/enterprise/api/mockData.ts` - 统一所有Mock数据的hotel ID格式为短横线
- `src/enterprise/Layout.tsx` - 修复SSO登录中的hotel ID
- `src/enterprise/App.tsx` - 修复SSO登录中的hotel ID
- `src/enterprise/services/PMSIntegrationService.ts` - 修复服务中的hotel ID

---

### 二、实时推演不生成订单（已修复）

**问题描述：**
- `generateRealtimeTransaction()` 依赖 `deductQuota()` 扣减库存配额
- `deductQuota()` 需要 `channelQuotas` 数据，但推演开始时没有加载配额数据
- 导致库存检查失败，无法生成订单

**修复内容：**
1. 在 `startRealtimeSimulation()` 中添加配额数据加载逻辑
2. 为每个酒店初始化渠道配置后，自动调用 `loadChannelQuotas()` 加载90天配额数据
3. 优化推演频率：从每15秒30%概率改为每5秒50%概率（平均10秒一单）

**已修复文件：**
- `src/enterprise/stores/enterpriseStore.ts`

---

### 三、TodayOverview页面硬编码数据（已修复）

**问题描述：**
- 指标卡片中的变化率数据硬编码："+12.5% 较昨日"、"+8 较昨日"等
- 实时推演订单未按选中酒店筛选

**修复内容：**
1. 从 `dashboardSummary` 获取真实的同比变化数据
2. 根据变化率动态设置 `trend` 值（up/down/neutral）
3. 修复推演订单筛选，添加 `selectedHotelIds` 过滤

**已修复文件：**
- `src/enterprise/pages/overview/TodayOverview.tsx`

---

### 四、DataDashboard页面问题（已修复）

**问题描述：**
1. 趋势数据API调用未传递 `selectedHotelIds` 参数
2. MetricCard变化率硬编码
3. `AnomalyList` 和 `ChannelPerformance` 组件使用硬编码数据，未根据酒店筛选

**修复内容：**
1. 修复API调用：`dashboardApi.getDashboardTrends(days, selectedHotelIds)`
2. 移除硬编码变化率，改为"实时统计"
3. 为 `AnomalyList` 和 `ChannelPerformance` 组件添加 `selectedHotelIds` 参数
4. 添加API调用获取异常和渠道数据

**已修复文件：**
- `src/enterprise/pages/overview/DataDashboard.tsx`
- `src/enterprise/api/dashboardApi.ts` - 添加 `getDashboardAlerts` 函数

---

### 五、Dashboard页面问题（已修复）

**问题描述：**
1. 未获取 `selectedHotelIds`，统计数据始终基于全部酒店
2. MetricCard变化率硬编码

**修复内容：**
1. 从store获取 `selectedHotelIds`
2. 根据选中酒店筛选有效酒店进行统计
3. 移除硬编码变化率

**已修复文件：**
- `src/enterprise/pages/overview/Dashboard.tsx`

---

### 六、AI客服页面API调用问题（已修复）

**问题描述：**
- `UnifiedInbox` 页面加载消息时未传递 `selectedHotelIds` 参数
- `aichatApi.getMessages` 不支持多酒店筛选

**修复内容：**
1. 修改API调用，添加 `hotelIds` 参数
2. 修改 `aichatApi.getMessages` 支持 `hotelIds` 数组参数
3. 添加空酒店选择处理

**已修复文件：**
- `src/enterprise/pages/aichat/UnifiedInbox.tsx`
- `src/enterprise/api/aichatApi.ts`

---

## 待修复问题清单

### 高优先级

#### 1. AIDashboard页面硬编码数据
**文件：** `src/enterprise/pages/overview/AIDashboard.tsx`
**问题：**
- ROI分析、AI统计数据大量使用硬编码值（50000、50元/小时等）
- `Math.random()` 生成模拟数据
- AI价值卡片趋势值硬编码（18.5%、12.3%等）

**修复建议：**
```typescript
// 添加真实API调用
const [aiStats, setAiStats] = useState(null);
useEffect(() => {
  const fetchAIStats = async () => {
    const res = await aichatApi.getAIDashboardSummary(selectedHotelIds);
    if (res.success) setAiStats(res.data);
  };
  fetchAIStats();
}, [selectedHotelIds]);
```

---

#### 2. 内容中心API调用问题
**文件：** 
- `src/enterprise/pages/ContentCenter/ContentFactory.tsx`
- `src/enterprise/pages/ContentCenter/PublishStatus.tsx`
- `src/enterprise/pages/ContentCenter/PrivateDomain.tsx`

**问题：**
- 定价数据硬编码（basePrice: 580、competitorAvg: 680）
- 内容生成保存到 `localStorage`，未调用API
- API调用未传递 `selectedHotelIds` 参数

**修复建议：**
1. 实现 `contentApi.createContent()` 和 `contentApi.publishContent()` 真实API调用
2. 所有API调用添加 `hotelIds` 参数

---

#### 3. 定价策略页面问题
**文件：**
- `src/enterprise/pages/StrategyCenter/PricingStrategy.tsx`
- `src/enterprise/pages/finance/UniversalPricing.tsx`

**问题：**
- `PricingStrategy` 参与度配置是前端mock生成
- `UniversalPricing` 几乎所有数据都是mock生成（房型价格、渠道价格、AI建议等）
- 没有任何真实API调用

**修复建议：**
1. 实现参与度配置API
2. 实现定价建议生成API
3. 实现房型、渠道价格API

---

#### 4. 渠道和库存页面问题
**文件：**
- `src/enterprise/pages/ChannelQuota/index.tsx`
- `src/enterprise/pages/channels/ChannelDashboard.tsx`

**问题：**
- `ChannelQuota` 配额修改只更新本地状态，未调用API保存
- `ChannelDashboard` 完全使用mock数据，无API调用

**修复建议：**
1. 添加配额保存API调用
2. 实现渠道数据API

---

#### 5. 风险和管理页面问题
**文件：**
- `src/enterprise/pages/RiskCenter/FinanceReconciliation.tsx`
- `src/enterprise/pages/RiskCenter/RiskWarning.tsx`
- `src/enterprise/pages/Management/CustomerManagement.tsx`
- `src/enterprise/pages/Management/SettlementCenter.tsx`

**问题：**
- `FinanceReconciliation` 完全使用mock数据
- `RiskWarning` 驾驶舱指标硬编码
- `CustomerManagement` 完全使用mock数据
- `SettlementCenter` 完全使用mock数据

**修复建议：**
1. 实现对应的API调用

---

### 中优先级

#### 6. 其他AI客服页面
**文件：**
- `src/enterprise/pages/aichat/HumanAICollab.tsx`
- `src/enterprise/pages/aichat/HumanHandoff.tsx`
- `src/enterprise/pages/aichat/ScriptLibrary.tsx`
- `src/enterprise/pages/aichat/SmartDispatch.tsx`

**问题：**
- 所有API调用未传递 `selectedHotelIds` 参数
- 大量硬编码配置数据

---

#### 7. 酒店工作台页面
**文件：** `src/enterprise/pages/hotel-workbench/index.tsx`

**问题：**
- 刷新同步状态仅使用setTimeout模拟
- 各Tab操作函数仅使用alert，无真实API调用

---

### 低优先级

#### 8. 类型定义完善
**建议：**
- 为所有API参数添加类型定义
- 统一API响应格式

---

## 修复统计

| 优先级 | 问题数 | 已修复 | 待修复 |
|--------|--------|--------|--------|
| 高 | 5 | 2 | 3 |
| 中 | 2 | 0 | 2 |
| 低 | 1 | 0 | 1 |
| **总计** | **8** | **2** | **6** |

---

## 测试建议

1. **实时推演测试：**
   - 进入「今日实况」页面
   - 点击「开始推演」按钮
   - 等待5-10秒，观察是否生成订单

2. **酒店选择联动测试：**
   - 在顶部酒店选择器中选择不同酒店
   - 检查各页面数据是否正确筛选

3. **API调用测试：**
   - 打开浏览器开发者工具
   - 切换酒店选择，观察API请求是否包含hotelIds参数

---

## 后续建议

1. **建立API标准：**
   - 所有API函数必须支持 `hotelIds` 参数用于多酒店筛选
   - 统一API错误处理逻辑

2. **数据层优化：**
   - 添加React Query或SWR进行数据缓存
   - 添加loading和error状态管理

3. **Mock数据策略：**
   - 区分开发环境和生产环境
   - 添加Mock数据开关配置
