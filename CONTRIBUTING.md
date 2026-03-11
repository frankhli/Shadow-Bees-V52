# 贡献指南

## Git 提交规范

### 提交格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 说明
| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat(api): 添加订单导出功能 |
| `fix` | 修复Bug | fix(ui): 修复价格显示错误 |
| `docs` | 文档更新 | docs: 更新API文档 |
| `style` | 代码格式 | style: 统一缩进 |
| `refactor` | 重构 | refactor: 优化定价算法 |
| `perf` | 性能优化 | perf: 减少渲染次数 |
| `test` | 测试相关 | test: 添加订单测试用例 |
| `chore` | 构建/工具 | chore: 更新依赖 |
| `ci` | CI/CD | ci: 添加自动化部署 |
| `build` | 构建相关 | build: 优化打包配置 |
| `revert` | 回滚 | revert: 回滚错误提交 |

### Scope 说明
- `api` - 后端接口
- `ui` - 前端界面
- `db` - 数据库
- `config` - 配置
- `docs` - 文档
- `test` - 测试

### 提交示例
```bash
# 新功能
feat(api): 添加智能定价接口

# 修复Bug
fix(ui): 修复房型切换时价格不更新问题
Closes #123

# 文档
docs: 更新部署文档

# 重构
refactor(pricing): 优化定价算法性能

# 带详细说明的提交
feat: 添加订单导出功能

- 支持 Excel 和 CSV 格式
- 可导出指定日期范围的订单
- 添加导出进度提示

Closes #456
```

## 开发流程

### 1. 创建分支
```bash
# 从 main 分支创建
git checkout -b feat/order-export
```

### 2. 开发提交
```bash
git add .
git commit -m "feat(api): 添加订单导出接口"
```

### 3. 推送分支
```bash
git push origin feat/order-export
```

### 4. 创建 PR
- 在 GitHub 创建 Pull Request
- 填写 PR 模板
- 等待 Code Review

### 5. 合并代码
- CI 检查通过后
- Squash Merge 到 main

## 代码审查清单

- [ ] 代码符合 ESLint 规范
- [ ] TypeScript 类型正确
- [ ] 添加必要的测试
- [ ] 更新相关文档
- [ ] 提交信息符合规范
