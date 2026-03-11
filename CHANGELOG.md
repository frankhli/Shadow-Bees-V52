# Changelog

所有项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且该项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 基础架构搭建（React + TypeScript + Vite）
- 三酒店演示数据（三里屯/崇礼/大理）
- 核心功能模块：
  - 经营概览（今日/本周/本月）
  - 市场情报（竞品分析/事件库）
  - 智能定价（三平台联动）
  - 内容工厂（AI文案生成）
  - 订单管理（状态流转）
  - 库存管理（双池分配）
- 三种时间态：实时推演/历史回放/沙盘模拟
- 权限系统（老板/经理/员工）

## [1.2.0] - 2026-02-19

### 新增
- 全站键盘快捷键系统
  - 酒店端：Ctrl+1~8 主导航，Ctrl+Shift+字母 子页面
  - 集团端：Ctrl+1~9 主导航
  - 管理端：Ctrl+1~8 主导航，Ctrl+Shift+字母 子页面
  - 命令面板（Ctrl+K）快速搜索
  - 快捷键帮助（Ctrl+/）
- 快捷键自定义配置功能
  - 系统设置中可修改任意快捷键
  - 支持禁用/启用快捷键
  - 冲突检测和提示
- Skeleton 加载状态优化
  - PageSkeleton 页面级骨架屏
  - TableSkeleton 表格骨架屏
  - CardSkeleton 卡片骨架屏
- SortableTable 可排序表格组件

### 优化
- 所有快捷键添加 Ctrl 修饰键，避免误触
- 快捷键配置与导航菜单完全对应
- 快捷键修改后实时生效
- 20+ 个假按钮功能修复为实际功能

### 修复
- 修复快捷键硬编码无法修改问题
- 修复 SLA 设置弹窗无法打开
- 修复多个页面缺少加载状态
- 修复 TypeScript 编译错误

## [1.1.0] - 2024-02-13

### 新增
- 后端架构准备：
  - Docker Compose 配置（PostgreSQL + Redis + RabbitMQ）
  - Java Spring Boot 脚手架
  - 数据库迁移工具（Flyway）
  - API 抽象层（Mock/Backend 双模式）
- 生产准备：
  - CI/CD 流水线（GitHub Actions）
  - 代码规范（ESLint + Prettier + TS严格模式）
  - 自动化测试框架（Vitest）
  - Git 提交规范（Commitlint + Husky）
  - API 文档（Swagger + Postman）
- 部署相关：
  - Nginx 生产配置（SSL + Gzip + 限流）
  - PWA 配置（Service Worker + Manifest）
  - 健康检查接口（/actuator/health）
  - 错误监控（Sentry）
  - 访问统计（百度/Google Analytics）
- 文档：
  - 数据字典
  - 部署检查清单
  - 问题排查手册
  - 贡献指南

### 变更
- 优化前端 API 层，支持后端切换
- 完善 .gitignore 规则

## [1.0.0] - 2024-02-12

### 新增
- 初始版本发布
- 56项完整功能实现
- 三酒店演示系统
- 完整的 UI/UX 设计

---

## 版本说明

### 版本号格式
`主版本号.次版本号.修订号`

- **主版本号**：重大架构变更，不兼容的 API 修改
- **次版本号**：新增功能，向下兼容
- **修订号**：问题修复，向下兼容

### 标签说明
- `[未发布]` - 开发中的变更，尚未发布
- `新增` - 新功能
- `变更` - 现有功能的变更
- `弃用` - 即将移除的功能
- `移除` - 已移除的功能
- `修复` - 问题修复
- `安全` - 安全相关修复

---

## 升级指南

### 从 1.0.0 升级到 1.1.0

1. **安装新依赖**
```bash
npm install
```

2. **初始化后端环境**
```bash
cd backend
docker-compose up -d
flyway migrate
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 填入必要配置
```

4. **验证安装**
```bash
npm run test
npm run build
```

---

## 贡献者

感谢以下贡献者（按字母顺序）：

- DOOMESEE Team

---

## 相关链接

- [项目主页](https://shadowbees.com)
- [API 文档](docs/API.md)
- [部署指南](docs/DEPLOY_CHECKLIST.md)
- [问题排查](docs/TROUBLESHOOTING.md)
