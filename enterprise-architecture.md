# ShadowBees 聚合版（Enterprise）架构设计

## 1. 项目结构

```
shadow-bees-v52/
├── enterprise.html              # 新入口文件
├── src/
│   ├── enterprise/              # 聚合版代码目录
│   │   ├── App.tsx              # 主应用组件
│   │   ├── Layout.tsx           # 统一布局（融合双端导航）
│   │   ├── router.tsx           # 路由配置
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # 首页（根据角色展示）
│   │   │   ├── hotel/           # 酒店端功能
│   │   │   │   └── ...          # 复用现有页面组件
│   │   │   └── group/           # 集团端功能
│   │   │       └── ...          # 复用现有页面组件
│   │   ├── components/
│   │   │   ├── RoleSwitcher.tsx # 角色切换器（酒店↔集团视图）
│   │   │   ├── HotelSelector.tsx # 酒店选择器
│   │   │   └── EnterpriseNav.tsx # 企业版导航菜单
│   │   ├── stores/
│   │   │   └── enterpriseStore.ts # 统一状态管理
│   │   └── hooks/
│   │       └── useEnterprise.ts   # 聚合版业务hook
│   └── ...
```

## 2. 角色权限模型

```typescript
// 企业版用户角色
enum EnterpriseRole {
  // 酒店视角
  HOTEL_MANAGER = 'hotel_manager',      // 店长 - 只看自己酒店
  HOTEL_STAFF = 'hotel_staff',          // 店员 - 受限功能
  
  // 区域视角
  REGION_MANAGER = 'region_manager',    // 区域经理 - 看多店
  REGION_STAFF = 'region_staff',        // 区域专员
  
  // 集团视角
  GROUP_ADMIN = 'group_admin',          // 集团管理员 - 看全部
  GROUP_VIEWER = 'group_viewer',        // 集团查看者 - 只读
}

// 权限矩阵
interface PermissionMatrix {
  // 酒店端功能
  pricing: boolean;          // 定价决策
  inventory: boolean;        // 库存管理
  content: boolean;          // 内容工厂
  orders: boolean;           // 订单管理
  
  // 集团端功能
  multiHotelView: boolean;   // 多店视图
  strategy: boolean;         // 策略中心
  comparison: boolean;       // 门店对比
  channelAnalysis: boolean;  // 渠道分析
}
```

## 3. 核心功能融合

### 3.1 导航融合
```
企业版导航结构：
├── 📊 经营概览（新）
│   ├── 今日概况（酒店端）
│   └── 集团数据（集团端）
├── 💰 收益管理
│   ├── 智能定价（酒店端）
│   ├── 策略中心（集团端）
│   └── 渠道分析（集团端）
├── 🏨 房态库存
│   ├── 库存日历（酒店端/集团端）
│   └── 房态管理（酒店端）
├── 📝 内容运营
│   ├── 内容工厂（酒店端）
│   └── 集团内容库（集团端）
├── 📦 订单中心
│   ├── 订单管理（酒店端）
│   └── 集团订单（集团端）
└── ⚙️ 系统设置
```

### 3.2 酒店选择器
- **单店用户**：自动选中，隐藏选择器
- **区域经理**：显示区域内酒店下拉选择
- **集团管理员**：支持多选/全选酒店

### 3.3 视图切换
- 通过 `?view=hotel` 或 `?view=group` 参数控制
- 支持一键切换视角（店长→区域→集团）

## 4. iframe集成适配

### 4.1 高度自适应
```typescript
// enterprise/stores/enterpriseStore.ts
const useEnterpriseStore = create(() => ({
  // 监听内容高度变化，通知父页面
  notifyHeightChange: (height: number) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'SHADOW_BEES_RESIZE',
        height,
        timestamp: Date.now(),
      }, '*');
    }
  },
}));
```

### 4.2 免登集成
```typescript
// 接收父页面传递的token
window.addEventListener('message', (event) => {
  if (event.data.type === 'PMS_LOGIN_TOKEN') {
    const { token, userInfo } = event.data;
    // 用PMS的token换取ShadowBees的session
    enterpriseStore.ssoLogin(token, userInfo);
  }
});
```

### 4.3 跳转拦截
```typescript
// 拦截路由跳转，通知父页面
const handleNavigation = (path: string) => {
  window.parent.postMessage({
    type: 'SHADOW_BEES_NAVIGATE',
    path,
  }, '*');
};
```

## 5. 客户PMS侧集成代码

```javascript
// 客户需要在他们的PMS中添加以下代码：

// 1. 嵌入ShadowBees
<iframe 
  id="shadowBeesFrame"
  src="https://shadowbees-client-domain.com/enterprise"
  style="width: 100%; border: none;"
/>

// 2. 高度自适应
window.addEventListener('message', (e) => {
  if (e.data.type === 'SHADOW_BEES_RESIZE') {
    document.getElementById('shadowBeesFrame').style.height = 
      e.data.height + 'px';
  }
});

// 3. 单点登录
document.getElementById('shadowBeesFrame').onload = function() {
  this.contentWindow.postMessage({
    type: 'PMS_LOGIN_TOKEN',
    token: getPmsToken(),
    userInfo: {
      id: user.id,
      name: user.name,
      role: user.role,  // 根据PMS角色映射到ShadowBees角色
      hotels: user.hotelIds,  // 可管理的酒店列表
    }
  }, '*');
};
```

## 6. 部署方案

### 6.1 独立域名部署
```
客户独立部署：
https://shadowbees-{client}.com/enterprise

或子路径部署：
https://pms.huameihuihotel.com/shadowbees/enterprise
```

### 6.2 多租户支持（可选后期升级）
```typescript
// 根据域名或参数识别租户
const tenantId = new URLSearchParams(window.location.search).get('tenant');
// 加载对应租户的配置（logo、主题色、功能开关）
```

## 7. 1000家酒店性能考虑

### 7.1 数据分页与懒加载
- 酒店列表：虚拟滚动 + 分页加载
- 数据看板：按需加载，默认只看关键指标

### 7.2 缓存策略
```typescript
// 本地缓存酒店列表
const hotelListCache = {
  data: [],
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5分钟
};
```

### 7.3 接口优化
- 批量查询接口（一次查多个酒店数据）
- 数据聚合接口（服务端预聚合）
- WebSocket实时推送（关键指标）

## 8. 开发计划

### Week 1：基础架构
- [ ] 新建 enterprise.html 入口
- [ ] 创建 src/enterprise/ 目录结构
- [ ] 实现企业版路由和布局
- [ ] 角色权限模型实现

### Week 2：功能融合
- [ ] 整合酒店端页面
- [ ] 整合集团端页面
- [ ] 酒店选择器组件
- [ ] 角色切换功能

### Week 3：集成适配
- [ ] iframe高度自适应
- [ ] SSO免登集成
- [ ] 消息通信机制
- [ ] 客户PMS集成文档

### Week 4：测试优化
- [ ] 1000家酒店数据压力测试
- [ ] 各角色权限测试
- [ ] 集成测试
- [ ] 部署上线

## 9. 风险评估

| 风险 | 概率 | 影响 | 应对 |
|-----|-----|-----|-----|
| 客户技术对接困难 | 中 | 高 | 提供完整集成文档+技术支持 |
| 1000家酒店性能问题 | 中 | 高 | 提前做压力测试，预留优化时间 |
| 需求变更 | 高 | 中 | 分阶段交付，MVP优先 |
| iframe被浏览器拦截 | 低 | 高 | 提供独立访问链接备用 |
