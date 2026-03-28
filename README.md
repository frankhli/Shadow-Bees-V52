# Shadow-Bees V52 - 酒店AI智能管理平台

[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-4.5-orange)](https://github.com/pmndrs/zustand)

> 🏨 面向酒店行业的AI智能收益管理系统，支持酒店端运营管理 + 管理端SaaS平台

![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## ⚠️ 升级建议

> 本版本为 V52，生产环境建议升级至 V55 以获取安全修复和 AI 能力升级。

### 🔴 紧急：安全漏洞修复

| 漏洞 | 影响 | 修复版本 |
|------|------|---------|
| Gateway 无 JWT 鉴权 | 任意用户可访问全部酒店数据 | V55 |
| 敏感数据明文存储 | customerPhone 明文，违反隐私合规 | V55 |
| Token XSS 风险 | 存 localStorage 可被窃取 | V55 |

### 🟠 强烈建议：AI 能力升级

| 功能 | V52 | V55 |
|------|-----|-----|
| RAG 知识库 | ❌ | ✅ |
| 多轮上下文记忆 | ❌ | ✅ |
| 流式 AI 推送 | ❌ | ✅ |
| 智能定价算法 | ❌ | ✅ |

### 🟢 V56 规划功能

- 多平台文案生成（小红书、闲鱼、朋友圈）
- AI 图片生成
- 定时发布 + 效果追踪
- 私域运营自动化

---

## 📋 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [键盘快捷键](#键盘快捷键)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [文档](#文档)
- [部署说明](#部署说明)
- [贡献指南](#贡献指南)
- [更新日志](#更新日志)

## 🎯 项目简介

Shadow-Bees 是一款面向酒店行业的智能化管理平台，采用**酒店端 + 管理端**双端架构：

- **酒店端**：供酒店运营人员使用，提供经营概览、市场情报、收益管理、内容营销等核心功能
- **管理端**：供平台运营人员使用，提供客户管理、异常监控、财务合规、系统配置等SaaS功能

### 核心特色

🤖 **AI驱动**：智能定价建议、内容生成助手、工单自动分配
📊 **数据可视化**：实时数据大盘、多维度经营分析、异常预警
🎨 **现代化UI**：深色主题设计、流畅动画、响应式布局
🔒 **权限管控**：基于角色的访问控制(RBAC)，支持多角色协同
⚡ **性能优化**：路由懒加载、组件按需加载、错误边界保护
⌨️ **键盘快捷键**：全站快捷键支持，可自定义配置，提升操作效率

## ✨ 功能特性

### 酒店端功能

| 模块 | 功能描述 | 状态 |
|------|---------|------|
| 📈 经营概览 | 今日/本周/本月经营数据，收入、订单、入住率实时监控 | ✅ |
| 🎯 市场情报 | 竞品价格监控、事件情报、定价建议 | ✅ |
| 💰 收益管理 | 智能定价、未来预测、价格审批 | ✅ |
| 📝 内容工厂 | AI内容生成、多渠道发布、效果追踪 | ✅ |
| 📦 库存管理 | OTA/灵活池分配、库存调拨、售罄预警 | ✅ |
| 🎫 工单支持 | 客户工单、AI客服、人工介入 | ✅ |
| ⚙️ 系统设置 | 酒店初始化、用户管理、偏好配置 | ✅ |

### 管理端功能

| 模块 | 功能描述 | 状态 |
|------|---------|------|
| 📊 数据大盘 | 平台级运营数据、客户健康度矩阵、异常预警 | ✅ |
| 👥 客户管理 | 酒店客户管理、套餐配置、续费提醒 | ✅ |
| 🚨 异常中心 | 定价异常、库存积压、内容违规统一处理 | ✅ |
| 💳 财务中心 | 对账管理、发票处理、退款审核 | ✅ |
| 📢 内容审核 | 后发监控、异常巡检、代客修改 | ✅ |
| 🎫 工单支持 | 工单分配、SLA监控、满意度评价 | ✅ |
| ⚙️ 系统设置 | 基础配置、用户权限、日志审计 | ✅ |

## ⌨️ 键盘快捷键

Shadow-Bees 提供全站键盘快捷键支持，让操作更高效。

### 快速入门

- **`Ctrl + /`** - 查看快捷键帮助
- **`Ctrl + K`** - 打开命令面板
- **`Ctrl + 1~8`** - 快速导航到主要页面

### 三端快捷键

| 端 | 主导航 | 子页面 | 自定义 |
|---|---|---|---|
| 🏨 酒店端 | `Ctrl + 1~8` | `Ctrl + Shift + 字母` | ✅ 支持 |
| 🏢 集团端 | `Ctrl + 1~9` | - | ✅ 支持 |
| 👨‍💼 管理端 | `Ctrl + 1~8` | `Ctrl + Shift + 字母` | ✅ 支持 |

### 自定义快捷键

进入 **系统设置 → 快捷键** 可以：
- 修改任意快捷键
- 禁用不常用的快捷键
- 恢复默认设置
- 开启/关闭按键提示

📖 [查看完整快捷键文档](./docs/SHORTCUTS.md)

## 🛠 技术架构

### 技术栈

```
前端框架: React 18 + TypeScript
构建工具: Vite 5
样式方案: Tailwind CSS
状态管理: Zustand
路由方案: React Router 6
UI组件库: Lucide Icons + 自定义组件
动画库: Framer Motion
代码规范: ESLint + Prettier
```

### 项目结构

```
shadow-bees-v52/
├── src/
│   ├── components/        # 公共组件
│   │   ├── ui/           # 基础UI组件
│   │   ├── Layout.tsx    # 布局组件
│   │   └── ErrorBoundary.tsx  # 错误边界
│   ├── pages/            # 页面组件
│   ├── stores/           # 状态管理
│   ├── hooks/            # 自定义Hooks
│   ├── utils/            # 工具函数
│   ├── constants/        # 常量定义
│   ├── types/            # 类型定义
│   ├── admin/            # 管理端代码
│   │   ├── components/   # 管理端组件
│   │   ├── pages/        # 管理端页面
│   │   ├── stores/       # 管理端状态
│   │   └── constants/    # 管理端常量
│   ├── App.tsx           # 主应用
│   └── main.tsx          # 入口文件
├── public/               # 静态资源
├── docs/                 # 文档
└── package.json
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd shadow-bees-v52

# 安装依赖
npm install

# 或使用 pnpm
pnpm install
```

### 启动开发服务器

```bash
# 启动酒店端
npm run dev

# 启动管理端（独立入口）
npm run admin
```

### 构建生产版本

```bash
# 构建酒店端
npm run build

# 构建管理端
npm run build:admin

# 预览生产构建
npm run preview
```

## 📚 文档

### 用户文档

- [快捷键使用指南](./docs/SHORTCUTS.md) - 全站键盘快捷键说明
- [故障排查指南](./docs/TROUBLESHOOTING.md) - 常见问题解决
- [竞品分析](./docs/COMPETITOR_ANALYSIS.md) - 与订单来了的详细对比

### 开发文档

- [API 接口文档](./docs/API.md) - 后端接口规范
- [BroadcastChannel 通信](./docs/BROADCAST_CHANNEL.md) - 跨窗口通信机制
- [统一数据源](./docs/UNIFIED_DATA_SOURCE.md) - 数据流设计
- [数据字典](./docs/dictionary/DATA_DICTIONARY.md) - 业务数据定义

### 部署文档

- [生产部署指南](./DEPLOY_PRODUCTION.md) - 完整生产环境部署步骤（支撑 500-1000 家酒店）
- [性能优化说明](./PERFORMANCE_OPTIMIZATION.md) - 数据库连接池、缓存、索引优化详解
- [环境变量模板](./.env.production.template) - 生产环境配置模板
- [部署检查清单](./docs/DEPLOY_CHECKLIST.md) - 部署前检查项

## 💻 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 组件采用函数式编程 + Hooks
- 状态管理使用 Zustand，避免过度使用 Context
- 样式使用 Tailwind CSS，避免内联样式
- 常量定义在 `constants/` 目录，避免魔法数字

### 命名规范

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

### 添加新页面

1. 在 `src/pages/` 创建页面组件
2. 使用默认导出：`export default function PageName() { }`
3. 在 `src/App.tsx` 添加路由配置
4. 在导航菜单中添加入口

### 添加新常量

1. 在 `src/constants/index.ts` 添加常量定义
2. 使用语义化命名，添加注释说明
3. 在代码中引用常量，避免硬编码

```typescript
// constants/index.ts
export const PRICE_DEVIATION = {
  WARNING: 20,
  CRITICAL: 30,
};

// 在组件中使用
import { PRICE_DEVIATION } from '@/constants';

if (deviation > PRICE_DEVIATION.CRITICAL) {
  // ...
}
```

## 📦 部署说明

### 静态部署

```bash
# 构建
npm run build

# 部署 dist/ 目录到 CDN 或静态服务器
```

### Docker 部署

```bash
# 构建镜像
docker build -t shadow-bees .

# 运行容器
docker run -p 80:80 shadow-bees
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/shadow-bees/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://backend-server;
    }
}
```

## 🤝 贡献指南

### 提交规范

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

### 提交示例

```bash
git commit -m "feat: 新增库存调拨功能"
git commit -m "fix: 修复定价异常计算错误"
git commit -m "docs: 更新 API 文档"
```

## 📝 更新日志

### v1.1.0 (2026-02-19)

#### 新增
- ✅ 全站键盘快捷键系统（酒店端/集团端/管理端）
- ✅ 快捷键自定义配置功能
- ✅ 命令面板（Command Palette）快速搜索
- ✅ 快捷键帮助面板（Ctrl + /）
- ✅ Skeleton 加载状态优化
- ✅ 20+ 个假按钮功能修复

#### 优化
- 🚀 所有快捷键添加 Ctrl 修饰键，避免误触
- 🚀 快捷键配置与导航菜单完全对应
- 🚀 快捷键修改后实时生效
- 🚀 表格组件支持排序和动画

#### 修复
- 🐛 修复快捷键硬编码无法修改问题
- 🐛 修复 SLA 设置弹窗无法打开
- 🐛 修复多个页面缺少加载状态
- 🐛 修复 TypeScript 编译错误

### v1.0.0 (2026-02-14)

#### 新增
- ✅ 完整的酒店端功能模块
- ✅ 完整的管理端 SaaS 功能
- ✅ 统一异常检测中心
- ✅ 路由懒加载优化
- ✅ 错误边界保护
- ✅ 常量定义集中管理

#### 优化
- 🚀 数据大盘与异常中心数据联动
- 🚀 库存/定价/订单监控使用统一数据源
- 🚀 渠道效能使用真实内容数据
- 🚀 数据仓库展示真实业务数据

#### 修复
- 🐛 修复 Logo 预览不一致
- 🐛 修复各模块数据不联动问题
- 🐛 修复假数据问题

## 📄 许可证

[MIT](LICENSE)

## 👥 团队

- 产品设计：Shadow-Bees Team
- 前端开发：Shadow-Bees Team
- 后端支持：待补充

---

<p align="center">
  <sub>Built with ❤️ by Shadow-Bees Team</sub>
</p>
