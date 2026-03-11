# ShadowBees SaaS 运营后台 (Admin Portal)

## 访问地址

开发环境：`http://localhost:5173/admin.html`

## 功能模块

### 1. 数据大盘 (Dashboard)
- 实时运营指标展示
- 客户增长趋势
- 收入统计 (MRR/ARR)
- 系统健康状态监控
- 快捷入口导航

### 2. 客户管理 (Customers)
- 客户列表管理
- 客户状态筛选 (试用/正常/停用/过期)
- 套餐分级管理 (免费/入门/专业/企业)
- 客户详情查看
- 营收数据统计

### 3. 财务中心 (Finance)
- 营收概览 (MRR/ARR/本月收入/退款)
- 套餐收入分布分析
- 交易记录管理
- 发票管理
- 财务报表导出

### 4. 内容审核 (Content)
- AI辅助内容审核
- 多类型内容管理 (图片/文本/评价/视频)
- 安全评分系统
- 批量审核操作
- 审核统计面板

### 5. 工单支持 (Support)
- 工单列表管理
- 优先级分级 (紧急/高/中/低)
- 工单状态跟踪 (待处理/处理中/已解决/已关闭)
- 工单详情查看与回复
- 客户满意度统计

### 6. 系统配置 (System)
- 通用设置 (平台名称/客服信息/时区)
- 安全设置 (2FA/登录锁定/会话超时)
- 通知配置 (邮件/短信/Webhook)
- 计费配置 (套餐定价/自动续费)
- 第三方集成管理

## 技术栈

- React 18 + TypeScript
- Vite (支持多入口)
- Tailwind CSS + 霓虹主题
- Zustand (状态管理)
- Framer Motion (动画)
- React Router v6

## 目录结构

```
src/admin/
├── components/
│   └── AdminLayout.tsx    # 布局组件
├── pages/
│   ├── Dashboard.tsx       # 数据大盘
│   ├── customers/          # 客户管理
│   ├── finance/            # 财务中心
│   ├── content/            # 内容审核
│   ├── support/            # 工单支持
│   └── system/             # 系统配置
├── stores/
│   └── adminStore.ts       # 状态管理
├── routes.tsx              # 路由配置
├── index.tsx               # 入口文件
└── styles.css              # 样式文件
```

## 开发说明

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173/admin.html

### 构建生产版本
```bash
npm run build
```

构建后的admin页面将位于 `dist/admin.html`

## Mock 数据

当前使用Mock数据进行演示，包括：
- 6家模拟酒店客户
- 6条内容审核记录
- 3个工单记录
- 财务和运营统计数据

## 状态管理

使用 Zustand + persist 中间件实现状态持久化：
- 客户数据
- 内容审核数据
- 工单数据
- 通知消息
- 管理员信息

## 主题配色

- 青色: `#00f0ff` (主要强调色)
- 紫色: `#b829f7` (次要强调色)
- 绿色: `#00ff88` (成功状态)
- 琥珀色: `#ffaa00` (警告状态)
- 红色: `#ff4444` (错误状态)
