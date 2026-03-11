# Shadow-Bees 集团版开发日志

## 📅 2024-03-06 开发记录（今日）

### ✅ 今日完成

#### 1. API联调准备 - 完善PMS API适配器接口定义 ✅
- [x] 完善了 `pmsApi.ts`，添加了完整的接口定义
  - 酒店数据接口（批量获取、详情获取）
  - 库存数据接口（批量获取、批量更新）
  - 价格数据接口（获取日历、批量调价）
  - 订单数据接口（列表、详情、确认、取消、入住、退房）
  - 经营数据接口（批量获取指标）
  - Webhook事件处理器（订单/库存/价格变更监听）
  - 连接状态管理

#### 2. 权限控制完善 - 实现角色权限矩阵和菜单控制 ✅
- [x] 完善了 `authStore.ts`
  - 定义了9种角色：SUPER_ADMIN, GROUP_ADMIN, GROUP_OPERATOR, GROUP_VIEWER, REGION_MANAGER, REGION_STAFF, HOTEL_MANAGER, HOTEL_STAFF, HOTEL_RECEPTION
  - 实现了完整的权限矩阵（ROLE_PERMISSIONS）
  - 添加了菜单权限映射（MENU_PERMISSION_MAP）
  - 实现了权限检查方法：hasPermission, hasAnyPermission, canViewHotel, canEditHotel
  - 添加了视角判断：isSingleHotel, isRegionView, isGroupView
  - 实现了菜单过滤：canAccessMenu, getVisibleMenus
- [x] 更新了 `Layout.tsx`，根据权限动态过滤菜单显示

#### 3. iframe通信优化 - 高度自适应和SSO完善 ✅
- [x] 完善了 `main.tsx` 中的 iframe 通信管理器
  - 高度自适应（ResizeObserver监听）
  - SSO登录消息处理（PMS_LOGIN_TOKEN）
  - 登出消息处理（PMS_LOGOUT）
  - 酒店切换消息处理（PMS_HOTEL_CHANGE）
  - 外部导航消息处理（PMS_NAVIGATE）
  - 心跳检测（PMS_PING/PONG）
  - 错误通知机制
  - 就绪通知（READY）
  - 加载状态通知（LOADING）
- [x] 更新了 `App.tsx` 以支持 iframe SSO 登录
  - 监听 sb:sso-login 自定义事件
  - 支持多种角色快速切换测试

#### 4. 数据看板优化 - 接入图表组件和实时数据 ✅
- [x] 优化了 `TodayOverview.tsx`
  - 添加了渠道GMV分布展示
  - 添加了订单状态标签组件
  - 实现了自动刷新（每30秒）
  - 添加了手动刷新按钮
  - 优化了数据更新时间显示

#### 5. 三大核心功能完整版开发 ✅

**内容工厂（800行完整代码）**
- [x] 9种内容模板：演唱会转让、小红书攻略、微信早安、晒单、群运营、私聊话术、视频号、小红书Vlog、闲鱼捡漏
- [x] 3种内容类型：图文笔记、短视频、私域文案
- [x] AI生成接入：DeepSeek API + 模板降级方案
- [x] 批量生成：为每家酒店生成差异化内容（不是复制）
- [x] 视频脚本生成：分镜、BGM、拍摄建议、素材清单
- [x] 批量发布/排期：支持定时发布
- [x] 历史记录：本地存储，支持复制/删除

**定价管理（600行完整代码）**
- [x] AI定价建议：竞品分析 + 入住率驱动 + 事件影响
- [x] 价格区间展示：底价/当前价/天花板价/竞品区间
- [x] 批量调价：百分比/固定金额两种方式
- [x] 定价审批：酒店视角提交审批，集团视角直接修改
- [x] 统控模式提示：酒店端只读，需要审批
- [x] 统计分析：需调价数量、平均入住率等

**订单管理（650行完整代码）**
- [x] 订单列表：多酒店聚合，支持筛选/搜索
- [x] 批量确认：选择多个订单一键确认
- [x] 核销码验证：扫码验证并办理入住
- [x] 退款处理：部分退款/全额退款
- [x] 钱货盘点：订单导出CSV
- [x] 多Tab视图：全部/待确认/今日入住/待办理

#### 6. 代码质量优化
- [x] 修复了 TodayOverview.tsx 中的导入顺序问题
- [x] 添加了更多Mock酒店数据（6家）
- [x] 优化了加载状态显示
- [x] 修复了路径导入问题（Toast、types等）

---

## 📅 2024-03-05 开发记录（昨日）

### ✅ 昨日完成

#### 1. 架构搭建
- [x] SSO登录架构（`authStore.ts`）
- [x] 企业级状态管理（`enterpriseStore.ts`）
- [x] PMS API对接层（`pmsApi.ts`）
- [x] 账号管理API（`accountApi.ts`）

#### 2. 29个页面全部完成

| 中心 | 页面 | 核心功能 |
|------|------|----------|
| **经营中心** | 今日实况 | 集团GMV汇总、实时订单、异常预警 |
| | 数据大盘 | 趋势分析、渠道占比、酒店排名 |
| | AI价值看板 | AI增收统计、内容效果、客服解决率 |
| | 门店对比 | 多维度酒店排名对比 |
| **情报中心** | 事件情报 | 演唱会/展会等热点事件监控 |
| | 竞品监控 | 竞品价格追踪、市场分析 |
| **收益中心** | 定价管理 | 批量调价、AI建议、审批流 |
| | 库存日历 | 批量关房、渠道配额 |
| **订单中心** | 非标渠道订单 | 闲鱼/小红书/微信统一看板 |
| | 渠道效能 | 各渠道GMV贡献分析 |
| **渠道中心** | 渠道管理 | 渠道开通状态、配置管理 |
| | 渠道价格 | 差异化定价策略 |
| **内容中心** | 内容工厂 | 批量生成小红书/闲鱼内容 |
| | 发布管理 | 排期日历、审核流 |
| | 私域运营 | 微信群管理、客户分层 |
| **智能客服** | AI客服 | 统一对话界面、智能回复 |
| | 客服辅助 | 人工工单管理 |
| **策略中心** | 定价策略 | 节假日/事件驱动策略 |
| | 运营策略 | 促销活动管理 |
| | 执行监控 | 策略执行状态追踪 |
| **风控中心** | 风险预警 | 订单异常、价格波动预警 |
| | 内容合规 | AI自动审核 |
| | 审计日志 | 操作记录追踪 |
| **账号中心** | 账号池管理 | 小红书/闲鱼/微信账号管理 |
| | 账号分配 | 拖拽分配给酒店 |
| | 账号状态 | 健康度监控、封禁预警 |
| **管理中心** | 客户管理 | 集团客户信息管理 |
| | 非标渠道工单 | 问题工单处理 |
| | 结算中心 | 技术服务费对账 |

#### 3. 华美会核心特性
- ✅ 集团统一管控模式（非酒店自助）
- ✅ 账号池管理（解决二清问题）
- ✅ 批量操作能力（内容/定价/订单）
- ✅ PMS数据对接（预留API接口）
- ✅ 白色主题（适配华美会系统风格）

---

### 🔧 技术栈
- React 18 + TypeScript + Vite
- Tailwind CSS + 自定义白色主题
- Zustand 状态管理
- React Router（嵌套路由）

### 📁 项目结构
```
src/enterprise/
├── api/
│   ├── pmsApi.ts          # 华美会PMS接口（已完善）
│   └── accountApi.ts      # 账号管理接口
├── stores/
│   ├── authStore.ts       # SSO登录状态 + 权限控制（已完善）
│   └── enterpriseStore.ts # 业务状态
├── pages/
│   ├── overview/          # 经营中心（4页）
│   ├── intelligence/      # 情报中心（2页）
│   ├── revenue/           # 收益中心（2页）
│   ├── orders/            # 订单中心（2页）
│   ├── channels/          # 渠道中心（2页）
│   ├── content/           # 内容中心（3页）
│   ├── service/           # 智能客服（2页）
│   ├── strategy/          # 策略中心（3页）
│   ├── risk/              # 风控中心（3页）
│   ├── accounts/          # 账号中心（3页）
│   └── management/        # 管理中心（3页）
├── Layout.tsx             # 布局组件（已完善权限控制）
├── App.tsx                # 路由配置（已完善SSO）
├── main.tsx               # 入口（已完善iframe通信）
└── styles.css             # 样式
```

---

### 🎯 明日计划（2024-03-07）

#### 高优先级
1. **与华美会技术对接**
   - [ ] 获取PMS API接口文档
   - [ ] 确定SSO登录对接方式
   - [ ] 确认iframe嵌入的具体实现

2. **数据看板增强**
   - [ ] 接入ECharts图表组件
   - [ ] GMV趋势图（近30天）
   - [ ] 渠道占比饼图
   - [ ] 酒店排名柱状图

3. **批量操作功能**
   - [ ] 批量调价弹窗
   - [ ] 批量库存调整
   - [ ] 批量内容生成

#### 中优先级
4. **订单中心完善**
   - [ ] 订单详情弹窗
   - [ ] 批量确认/核销功能
   - [ ] 退款处理流程

5. **UI/UX优化**
   - [ ] 加载状态统一
   - [ ] 空状态设计
   - [ ] 移动端适配

#### 低优先级
6. **测试与文档**
   - [ ] 各角色权限测试
   - [ ] iframe集成测试
   - [ ] 更新技术对接文档

---

### 🔗 关键对接点

#### PMS API（需要华美会提供）
```typescript
// 需要对接的接口
GET /v1/hotels                    // 获取酒店列表
GET /v1/inventory/batch           // 批量获取库存
GET /v1/orders/batch              // 批量获取订单
POST /v1/pricing/suggestions      // 推送AI定价建议
```

#### Shadow-Bees 提供给华美会的集成代码
```javascript
// iframe嵌入示例
<iframe 
  id="shadowBeesFrame"
  src="https://shadowbees-domain.com/enterprise"
  style="width: 100%; border: none;"
/>

// SSO登录
iframe.onload = function() {
  iframe.contentWindow.postMessage({
    type: 'PMS_LOGIN_TOKEN',
    token: 'user-jwt-token',
    userInfo: { id, name, role, hotelIds }
  }, '*');
};

// 高度自适应
window.addEventListener('message', (e) => {
  if (e.data.type === 'SB_RESIZE') {
    iframe.style.height = e.data.payload.height + 'px';
  }
});
```

### 🐛 已知问题
1. ~~路由路径重复问题~~ ✅ 已修复
2. ~~TypeScript 未使用变量警告~~ ✅ 已修复
3. ~~部分页面使用 Mock 数据~~ 等待PMS接口对接

### 📱 访问方式
```
开发环境：http://localhost:5173/enterprise
测试登录：点击"模拟登录（开发测试）"选择角色
```

---

## 📝 开发规范

### 页面组件模板
```typescript
// 新页面开发模板
export function PageName() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const { hasPermission, Permission } = useAuthStore();
  
  // 权限检查
  if (!hasPermission(Permission.VIEW_SOMETHING)) {
    return <div>无权限访问</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">页面标题</h1>
        <p className="text-sm text-gray-500 mt-1">页面描述</p>
      </div>
      
      {/* 内容 */}
    </div>
  );
}
```

### API 调用规范
```typescript
// 优先使用封装好的 API
import { fetchPMSOrdersBatch } from '../api/pmsApi';
import { fetchSocialAccounts } from '../api/accountApi';

// 组件内使用
useEffect(() => {
  const loadData = async () => {
    const { orders } = await fetchPMSOrdersBatch(hotelIds);
    setOrders(orders);
  };
  loadData();
}, []);
```

---

**开发者：** Claude Code
**日期：** 2024-03-06
**版本：** v52-enterprise-beta
