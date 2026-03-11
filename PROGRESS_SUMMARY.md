# Shadow-Bees 企业版开发进度总结

> 日期：2026-03-06  
> 版本：V52 企业版（集团代运营工作台）

---

## 一、产品定位

### 1.1 是什么？
**Shadow-Bees 企业版** = 嵌入华美会PMS的 **AI助手模块**，面向：
- 集团运营人员
- 酒店店长

### 1.2 核心价值
- **AI数据洞察** → 帮管理层看全局
- **AI运营工具** → 帮运营人员提效
- **AI客服中心** → 帮客服团队减负
- **全域定价** → AI实时调价 + 未来预测
- **内容中心** → AI生成小红书/闲鱼文案

---

## 二、今天完成的工作

### 2.1 导航结构重新设计（7大模块）

```
1. AI数据洞察      → 今日实况、数据大盘、AI效果看板、门店对比
2. AI市场情报      → 事件情报、竞品监控（实时监测+趋势预测）
3. AI运营工具      → 全域定价、定价策略、库存日历、非标订单、批量操作台
4. AI内容中心      → AI内容工厂、发布管理、私域运营
5. 渠道与账号      → 渠道大盘、渠道配置、账号管理
6. AI客服中心      → 统一收件箱、AI话术库、智能分发、人机协作
7. 风控与系统      → 风控预警、财务对账、操作审计、合规中心、客户管理、结算中心、工单
```

### 2.2 全域定价中心（全新整合版）

**三大视图：**
- **实时定价** - 多房型AI建议价、渠道差异化定价
- **未来预测** - 7/14/30天价格日历、事件影响标记、库存状态
- **配置中心** - 三种集成模式（建议/控制/复用）、统控/自控权限

**技术亮点：**
- 保留原有三种集成模式配置
- 复用酒店端实时定价逻辑
- 复用酒店端未来预测引擎
- 与事件情报数据打通（事件影响系数）

### 2.3 UI 优化

| 改动项 | 说明 |
|--------|------|
| 移除emoji | UI组件中的🎵🐝等替换为Lucide图标 |
| 保留文案emoji | 内容模板中的营销emoji保留（真实感） |
| 导航图标 | 全部使用Lucide专业图标 |
| 酒店选择器 | 恢复侧边栏底部入口，弹窗选择 |

### 2.4 代码质量

- ✅ TypeScript 零错误构建
- ✅ 12个功能页面完整迁移
- ✅ 导航重组无功能遗漏

---

## 三、架构设计

### 3.1 目录结构

```
src/enterprise/
├── Layout.tsx              # 布局+导航（7大模块）
├── App.tsx                 # 路由配置
├── components/             # 通用组件
│   ├── HotelSelector.tsx      # 酒店选择器（弹窗版）
│   ├── HotelSelectorVirtual.tsx  # 虚拟滚动版（1000+酒店）
│   ├── HotelSelectorDropdown.tsx # 下拉版
│   └── PageTemplate.tsx
├── pages/                  # 页面模块
│   ├── overview/           # AI数据洞察
│   ├── IntelligenceCenter/ # AI市场情报
│   ├── finance/            # 全域定价（重点）
│   ├── operations/         # 库存、订单、批量
│   ├── ContentCenter/      # AI内容工厂
│   ├── channels/           # 渠道大盘、配置
│   ├── aichat/             # AI客服中心
│   ├── RiskCenter/         # 风控合规
│   └── Management/         # 系统管理
├── stores/                 # 状态管理
│   ├── enterpriseStore.ts  # 酒店数据、选择状态
│   └── authStore.ts        # 权限、SSO
├── api/                    # API层（Mock数据在这里）
│   ├── hotelApi.ts
│   ├── contentApi.ts
│   ├── pricingApi.ts
│   └── mockData.ts         # 所有Mock数据
└── adapters/               # 数据适配器
    ├── PricingAdapter.tsx
    ├── ContentAdapter.tsx
    └── OrdersAdapter.tsx
```

### 3.2 数据流设计

```
真实PMS接入（未来）
    ↓
API Layer (src/enterprise/api/)
    ↓
Adapters (数据转换)
    ↓
Stores (Zustand状态管理)
    ↓
Pages & Components
```

### 3.3 Mock数据策略

**当前：** 所有数据在 `src/enterprise/api/mockData.ts`
**未来：** 替换为真实API调用，保持数据结构不变

```typescript
// Mock数据示例
export const mockHotels = [...]
export const mockEvents = [...]
export const mockPricingData = [...]

// API函数示例
export async function fetchHotels() {
  // 现在：return Promise.resolve(mockHotels)
  // 未来：return axios.get('/api/hotels')
}
```

---

## 四、关键功能状态

### 4.1 已完成 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| 7大模块导航 | ✅ | 重组完成，12页面全 |
| 全域定价 | ✅ | 实时+预测+配置三合一 |
| 事件情报 | ✅ | 雷达图+日历+事件详情 |
| 竞品监控 | ✅ | 价格趋势+对比 |
| 内容工厂 | ✅ | AI生成+多酒店选择 |
| 发布管理 | ✅ | 发布状态追踪 |
| 私域运营 | ✅ | 账号管理+内容日历 |
| 渠道大盘 | ✅ | GMV+转化率可视化 |
| 统一收件箱 | ✅ | 多平台消息聚合 |
| 风控预警 | ✅ | 实时告警+规则引擎 |
| 财务对账 | ✅ | 差异分析+核销 |
| 操作审计 | ✅ | 全链路日志 |
| 酒店选择器 | ✅ | 虚拟滚动+弹窗 |

### 4.2 待完善 ⚠️

| 功能 | 优先级 | 说明 |
|------|--------|------|
| SSO接入 | 高 | 华美会PMS单点登录 |
| 真实API对接 | 高 | 替换Mock数据 |
| 定价策略引擎 | 中 | AI自动调价规则配置 |
| 内容发布API | 中 | 小红书/闲鱼接口 |
| 消息同步 | 中 | 各平台私信聚合 |
| 报表导出 | 低 | Excel/PDF导出 |

---

## 五、明天计划

### 5.1 核心议题

1. **企业版边界确认**
   - 与华美会PMS的功能边界
   - 数据权限设计（集团/酒店/个人）

2. **SSO接入方案**
   - iframe嵌套 or 独立页面
   - token传递机制
   - 权限映射

3. **真实数据对接**
   - 华美会API接口清单
   - 数据映射表
   - 灰度切换方案

4. **定价策略细化**
   - 事件-定价联动规则
   - 自动调价阈值配置
   - 审批流程设计

### 5.2 技术债务

- [ ] 清理未使用的导入
- [ ] 统一错误处理
- [ ] API层添加loading状态
- [ ] 虚拟滚动性能优化（1000+酒店）

---

## 六、关键文件速查

| 文件 | 用途 |
|------|------|
| `src/enterprise/Layout.tsx` | 导航配置+布局 |
| `src/enterprise/api/mockData.ts` | 所有Mock数据 |
| `src/enterprise/pages/finance/UniversalPricing.tsx` | 全域定价（重点） |
| `src/enterprise/stores/enterpriseStore.ts` | 酒店数据状态 |
| `src/enterprise/components/HotelSelectorVirtual.tsx` | 高性能酒店选择器 |

---

## 七、设计决策记录

### 7.1 为什么这样组织导航？

**目标：** 符合华美会PMS风格（业务导向，非数据导向）

**对比：**
```
酒店端（操作导向）    企业版（AI能力导向）
- 经营概览           - AI数据洞察
- 市场情报           - AI市场情报
- 去卖货             - AI内容中心
- 钱货盘点           - AI运营工具
- 客户咨询           - AI客服中心
```

### 7.2 为什么全域定价要三合一？

**原因：** 事件情报有"实时监测+趋势预测"，定价也要对应
- 实时定价 → 对应实时监测
- 未来预测 → 对应趋势预测
- 配置中心 → 基础能力

### 7.3 Mock数据如何切换真实API？

**方案：** 同文件内替换，保持接口不变
```typescript
// 现在
export const fetchHotels = async () => mockHotels;

// 未来
export const fetchHotels = async () => {
  const res = await axios.get('/api/hotels');
  return res.data;
};
```

---

## 八、截图留存

| 截图 | 位置 |
|------|------|
| 华美会PMS界面 | `/Users/frank/Desktop/截图/` |
| 企业版当前效果 | 需补充 |

---

**下一步行动：** 与产品确认SSO方案和真实API接口清单。
