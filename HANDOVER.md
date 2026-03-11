# Shadow-Bees V52 技术交接文档

> 📋 本文档供新接手的开发团队参考，包含项目架构、技术栈、开发规范和运维指南。

---

## 一、项目概述

### 1.1 产品定位

**Shadow-Bees** 是一款面向酒店行业的 AI 智能收益管理系统，采用「酒店端 + 管理端 + 集团端」三端架构：

| 端 | 用户群体 | 核心功能 |
|----|---------|---------|
| **酒店端** | 酒店运营人员 | 经营概览、市场情报、收益管理、内容营销、库存管理 |
| **集团端** | 连锁酒店管理者 | 多店数据汇总、对比分析、统一策略 |
| **管理端** | 平台运营人员 | 客户管理、异常监控、财务合规、系统配置 |

### 1.2 核心特色

- 🤖 **AI 驱动**：智能定价建议、内容生成助手、工单自动分配
- 📊 **数据可视化**：实时数据大盘、多维度经营分析、异常预警
- 🎨 **现代化 UI**：深色主题设计、流畅动画、响应式布局
- 🔒 **权限管控**：基于角色的访问控制(RBAC)，支持多角色协同
- ⌨️ **键盘快捷键**：全站快捷键支持，可自定义配置

### 1.3 访问入口

- 酒店端：`http://localhost:5173/` (或 `index.html`)
- 管理端：`http://localhost:5173/admin.html`
- 集团端：`http://localhost:5173/group.html`

---

## 二、技术架构

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2 | 前端框架 |
| TypeScript | 5.3 | 类型系统 |
| Vite | 5.1 | 构建工具 |
| Tailwind CSS | 3.4 | 样式方案 |
| Zustand | 4.5 | 状态管理 |
| React Router | 6.22 | 路由管理 |
| Framer Motion | 11.0 | 动画库 |
| Recharts | 2.12 | 图表库 |
| Lucide React | 0.344 | 图标库 |

### 2.2 后端技术栈

| 技术 | 用途 | 说明 |
|------|------|------|
| PocketBase | 轻量后端 | 开发/演示环境使用 |
| Spring Boot | 正式后端 | 预留架构（未完全实现） |
| PostgreSQL | 主数据库 | 生产环境数据存储 |
| Redis | 缓存 | 热点数据缓存 |
| RabbitMQ | 消息队列 | 异步任务处理 |

### 2.3 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ 酒店端    │ │ 集团端    │ │ 管理端    │                     │
│  │ (Hotel)  │ │ (Group)  │ │ (Admin)  │                     │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                     │
└───────┼────────────┼────────────┼────────────────────────────┘
        │            │            │
        └────────────┴──────┬─────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│              Nginx (反向代理)                               │
└───────────────────────────┬────────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│              后端服务层                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PocketBase (开发/演示)                                │   │
│  │ - 数据库 + API + 管理后台一体化                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Spring Boot (预留/生产)                              │   │
│  │ - 微服务架构预留                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 三、项目结构

```
shadow-bees-v52/
├── 📁 src/                         # 前端源代码
│   ├── 📁 components/              # 公共组件
│   │   ├── 📁 ui/                  # 基础 UI 组件 (Button, Card, Input 等)
│   │   ├── 📁 animations/          # 动画组件 (Skeleton, AnimatedNumber 等)
│   │   ├── 📁 auth/                # 认证相关组件
│   │   ├── 📁 ux/                  # UX 增强组件 (Toast, CommandPalette 等)
│   │   ├── Layout.tsx              # 布局组件
│   │   └── ErrorBoundary.tsx       # 错误边界
│   ├── 📁 pages/                   # 酒店端页面
│   │   ├── TodayOverview.tsx       # 经营概览
│   │   ├── MarketIntelligence.tsx  # 市场情报
│   │   ├── PricingDecision.tsx     # 收益管理
│   │   ├── ContentFactory.tsx      # 内容工厂
│   │   └── ...
│   ├── 📁 stores/                  # 状态管理
│   │   ├── unifiedStore.ts         # 统一状态管理（核心）
│   │   ├── shortcutConfigStore.ts  # 快捷键配置
│   │   └── timeModeStore.ts        # 时间模式状态
│   ├── 📁 hooks/                   # 自定义 Hooks
│   │   ├── useHotkeys.ts           # 快捷键 Hook
│   │   ├── useTimeModeSync.ts      # 时间同步
│   │   └── ...
│   ├── 📁 utils/                   # 工具函数
│   ├── 📁 types/                   # TypeScript 类型定义
│   ├── 📁 data/                    # 静态数据
│   ├── 📁 api/                     # API 抽象层
│   │   ├── index.ts                # API 管理器
│   │   └── mock.ts                 # Mock 数据实现
│   ├── 📁 admin/                   # 管理端代码（独立模块）
│   │   ├── 📁 components/          # 管理端组件
│   │   ├── 📁 pages/               # 管理端页面
│   │   ├── 📁 stores/              # 管理端状态
│   │   └── index.tsx               # 管理端入口
│   ├── 📁 group/                   # 集团端代码（独立模块）
│   │   ├── 📁 components/          # 集团端组件
│   │   ├── 📁 pages/               # 集团端页面
│   │   └── main.tsx                # 集团端入口
│   ├── App.tsx                     # 酒店端主应用
│   └── main.tsx                    # 酒店端入口
├── 📁 backend/                     # 后端代码
│   ├── 📁 pb_data/                 # PocketBase 数据（勿提交）
│   ├── 📁 pb_migrations/           # 数据库迁移脚本
│   ├── 📁 scripts/                 # 启动脚本
│   ├── 📁 springboot/              # Spring Boot 预留代码
│   └── README.md                   # 后端文档
├── 📁 docs/                        # 项目文档
│   ├── SHORTCUTS.md                # 快捷键文档
│   ├── API.md                      # API 接口文档
│   ├── BROADCAST_CHANNEL.md        # 跨窗口通信
│   └── ...
├── 📁 public/                      # 静态资源
├── 📁 dist/                        # 构建输出
├── index.html                      # 酒店端入口 HTML
├── admin.html                      # 管理端入口 HTML
├── group.html                      # 集团端入口 HTML
├── vite.config.ts                  # Vite 配置
├── tailwind.config.js              # Tailwind 配置
├── package.json                    # 依赖管理
└── README.md                       # 项目说明
```

---

## 四、开发环境配置

### 4.1 环境要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 或 **pnpm**: >= 8.0.0

### 4.2 快速开始

```bash
# 1. 进入项目目录
cd /Users/frank/Desktop/shadow-bees-v52

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# 酒店端: http://localhost:5173/
# 管理端: http://localhost:5173/admin.html
# 集团端: http://localhost:5173/group.html
```

### 4.3 环境变量

`.env.development`:

```bash
# API 模式: false = 模拟数据, true = 真实后端
VITE_USE_BACKEND=false

# 后端 API 地址（仅当 VITE_USE_BACKEND=true 时有效）
VITE_API_URL=http://127.0.0.1:8090/api

# 应用信息
VITE_APP_NAME=Shadow-Bees
VITE_APP_VERSION=1.0.0
```

### 4.4 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

---

## 五、核心功能模块

### 5.1 状态管理 (Zustand)

**核心 Store**: `src/stores/unifiedStore.ts`

```typescript
// 主要状态
interface UnifiedState {
  currentHotel: Hotel;           // 当前酒店
  currentRoomType: RoomType;     // 当前房型
  currentTheme: ThemeType;       // 当前主题
  timeMode: TimeMode;            // 时间模式 (realtime/history/sandbox)
  
  // 业务数据
  competitors: Competitor[];     // 竞品数据
  pricing: Pricing;              // 定价数据
  inventory: Inventory;          // 库存数据
  transactions: Transaction[];   // 交易/订单
  contents: ContentItem[];       // 内容发布
  tickets: Ticket[];             // 工单
  refunds: Refund[];             // 退款
  
  // UI 状态
  isLoading: boolean;
  loadingText: string;
  
  // Actions...
}
```

**使用示例**:

```typescript
import { useUnifiedStore } from '@/stores/unifiedStore';

function MyComponent() {
  const { currentHotel, pricing, updateBasePrice } = useUnifiedStore();
  
  return (
    <div>{currentHotel.name}</div>
  );
}
```

### 5.2 路由系统

**酒店端路由** (`src/App.tsx`):

| 路径 | 页面 | 快捷键 |
|------|------|--------|
| `/` | 经营概览 | `Ctrl + 1` |
| `/market` | 市场情报 | `Ctrl + 2` |
| `/pricing` | 收益管理 | `Ctrl + 3` |
| `/content` | 内容工厂 | `Ctrl + 4` |
| `/inventory` | 钱货盘点 | `Ctrl + 5` |
| `/service` | 客户咨询 | `Ctrl + 6` |
| `/support` | 工单支持 | `Ctrl + 7` |
| `/settings` | 系统设置 | `Ctrl + 8` |

**管理端路由** (`src/admin/routes.tsx`):

| 路径 | 页面 | 快捷键 |
|------|------|--------|
| `/` | 数据大盘 | `Ctrl + 1` |
| `/customers` | 客户管理 | `Ctrl + 2` |
| `/pricing-insights` | 算法与数据中心 | `Ctrl + 3` |
| `/anomalies` | 异常监控中心 | `Ctrl + 4` |
| `/channels` | 渠道运营 | `Ctrl + 5` |
| `/support` | 工单支持 | `Ctrl + 6` |
| `/finance` | 财务中心 | `Ctrl + 7` |
| `/system` | 系统配置 | `Ctrl + 8` |

### 5.3 快捷键系统

**核心文件**:
- `src/hooks/useHotkeys.ts` - 快捷键 Hook
- `src/hooks/useConfiguredHotkeys.ts` - 配置化快捷键
- `src/stores/shortcutConfigStore.ts` - 快捷键配置存储

**常用快捷键**:
- `Ctrl + /` - 打开快捷键帮助
- `Ctrl + K` - 打开命令面板
- `Ctrl + 1~8` - 主导航
- `Ctrl + Shift + *` - 子页面导航

### 5.4 API 层

**核心文件**: `src/api/index.ts`

支持两种模式切换：

```typescript
import { api } from '@/api';

// 切换模式
api.setMode('backend');  // 使用真实后端
api.setMode('mock');     // 使用模拟数据

// 使用 API
const hotels = await api.getHotels();
const orders = await api.getOrders({ hotelId: 'xxx', status: 'paid' });
```

---

## 六、后端架构

### 6.1 PocketBase（当前使用）

PocketBase 是一个轻量级的后端方案，适合快速原型验证：

**启动方式**:
```bash
bash backend/scripts/start.sh
```

**管理后台**: http://127.0.0.1:8090/_/
- 默认账号: `admin@shadowbees.com`
- 默认密码: `shadowbees123`

**核心表结构**:
| 表名 | 说明 |
|------|------|
| `hotels` | 酒店基础信息 |
| `room_types` | 房型配置 |
| `orders` | 订单数据 |
| `price_calendar` | 价格日历 |
| `competitor_prices` | 竞品价格 |
| `contents` | 内容发布 |

### 6.2 Spring Boot（预留架构）

已预留 Spring Boot 项目结构，位于 `backend/springboot/`，包含：
- 外部 API 客户端抽象层
- RabbitMQ 消息队列配置
- 定价服务骨架

### 6.3 迁移到正式后端

当需要迁移到正式后端时：

1. 修改环境变量: `VITE_USE_BACKEND=true`
2. 更新 API 地址: `VITE_API_URL=http://your-backend/api`
3. 保留前端代码不变（API 层抽象保证兼容性）

---

## 七、开发规范

### 7.1 代码规范

- 使用 **TypeScript 严格模式**
- 组件采用**函数式编程 + Hooks**
- 状态管理使用 **Zustand**，避免过度使用 Context
- 样式使用 **Tailwind CSS**，避免内联样式
- 常量定义在 `constants/` 目录，避免魔法数字

### 7.2 命名规范

```typescript
// 组件: PascalCase
function MyComponent() { }

// 变量/函数: camelCase
const myVariable = '';
function myFunction() { }

// 常量: UPPER_SNAKE_CASE
const MAX_COUNT = 100;

// 类型/接口: PascalCase
interface UserInfo { }
type Status = 'active' | 'inactive';
```

### 7.3 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 新增功能
fix: 修复问题
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 代码重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

---

## 八、部署说明

### 8.1 构建生产版本

```bash
npm run build
```

构建输出位于 `dist/` 目录：
- `index.html` - 酒店端
- `admin.html` - 管理端
- `group.html` - 集团端
- `assets/` - 静态资源

### 8.2 Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/shadow-bees/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 管理端
    location /admin {
        try_files $uri $uri/ /admin.html;
    }

    # 集团端
    location /group {
        try_files $uri $uri/ /group.html;
    }

    # API 代理
    location /api {
        proxy_pass http://backend-server;
    }
}
```

### 8.3 Docker 部署

```bash
# 构建镜像
docker build -t shadow-bees .

# 运行容器
docker run -p 80:80 shadow-bees
```

---

## 九、常见问题

### 9.1 开发问题

**Q: 快捷键不生效？**
- 检查快捷键开关是否打开（系统设置 → 快捷键）
- 检查当前焦点是否在输入框中
- 刷新页面后重试

**Q: 如何切换到真实后端？**
```bash
# 修改环境变量
echo "VITE_USE_BACKEND=true" > .env.development

# 或在浏览器控制台执行
api.setMode('backend')
```

**Q: 如何调试状态管理？**
- 安装 Zustand DevTools 浏览器扩展
- 或在控制台执行：`useUnifiedStore.getState()`

### 9.2 后端问题

**Q: PocketBase 端口冲突？**
```bash
# 修改启动脚本中的端口号
./pocketbase serve --http="127.0.0.1:8080"
```

**Q: 如何重置数据库？**
```bash
# 删除数据目录（会丢失所有数据！）
rm -rf backend/pb_data
```

---

## 十、维护建议

### 10.1 代码维护

1. **定期更新依赖**
   ```bash
   npm outdated
   npm update
   ```

2. **保持 TypeScript 严格模式**
   - 不要关闭 `strict: true`
   - 尽量避免使用 `any`

3. **性能优化**
   - 页面组件使用懒加载 (`lazy`)
   - 大列表使用虚拟滚动
   - 图表按需渲染

### 10.2 数据维护

1. **定期备份 PocketBase 数据**
   ```bash
   # 备份数据目录
   cp -r backend/pb_data backup/pb_data_$(date +%Y%m%d)
   ```

2. **导出数据迁移 SQL**
   ```bash
   ./pocketbase export --db=pb_data/data.db --format=sql > migration.sql
   ```

### 10.3 扩展建议

1. **接入真实后端**
   - 完善 Spring Boot 服务
   - 实现所有 API 接口
   - 配置消息队列处理异步任务

2. **增强安全性**
   - 接入 JWT 认证
   - 实现接口权限控制
   - 添加数据加密

3. **性能优化**
   - 实现数据分页加载
   - 添加 Redis 缓存
   - 配置 CDN 加速

---

## 十一、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 项目 README | `README.md` | 项目总体介绍 |
| 后端文档 | `backend/README.md` | 后端服务说明 |
| 管理端文档 | `src/admin/README.md` | 管理端开发指南 |
| 快捷键文档 | `docs/SHORTCUTS.md` | 快捷键使用指南 |
| API 文档 | `docs/API.md` | 后端接口规范 |
| 部署清单 | `docs/DEPLOY_CHECKLIST.md` | 生产部署步骤 |
| 故障排查 | `docs/TROUBLESHOOTING.md` | 常见问题解决 |

---

## 十二、联系信息

- **项目路径**: `/Users/frank/Desktop/shadow-bees-v52`
- **版本**: v1.1.0
- **最后更新**: 2026-02-21

---

<p align="center">
  <sub>本文档由 Shadow-Bees Team 维护</sub>
</p>
