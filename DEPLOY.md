# Shadow-Bees V52 部署指南

## 🚀 快速部署（3种方式）

### 方式一：本地运行（已部署✅）

服务已在运行中：
```
🌐 http://localhost:5173
```

如需重新启动：
```bash
cd /Users/frank/Desktop/shadow-bees-v52
npm run dev
```

---

### 方式二：Vercel 部署（推荐）

#### 步骤 1: 安装 Vercel CLI
```bash
npm i -g vercel
```

#### 步骤 2: 登录 Vercel
```bash
vercel login
```

#### 步骤 3: 部署
```bash
cd /Users/frank/Desktop/shadow-bees-v52
vercel --prod
```

#### 或使用 Git 部署
1. 创建 GitHub 仓库
2. 推送代码到仓库
3. 在 Vercel 导入项目
4. 自动部署

---

### 方式三：静态文件部署

#### 构建生产版本
```bash
cd /Users/frank/Desktop/shadow-bees-v52
npm run build
```

#### 部署 dist 目录到任意静态服务器
```bash
# 方式 A: 使用 serve
npx serve dist

# 方式 B: 使用 Python
python3 -m http.server 8080 --directory dist

# 方式 C: 复制到 Nginx/Apache
sudo cp -r dist/* /var/www/html/
```

---

## 📋 部署配置说明

### 项目已配置
- ✅ `vercel.json` - Vercel 部署配置
- ✅ `vite.config.ts` - 构建配置
- ✅ `deploy.sh` - 一键部署脚本

### 环境要求
- Node.js 18+
- npm 8+

### 构建输出
- 构建目录: `dist/`
- 入口文件: `dist/index.html`

---

## 🔧 常见问题

### 问题 1: 端口被占用
```bash
# 查找占用 5173 的进程
lsof -i :5173

# 结束进程
kill -9 <PID>
```

### 问题 2: 构建失败
```bash
# 清理缓存重新安装
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 问题 3: CORS 错误
如部署后遇到跨域问题，在 `vite.config.ts` 中添加：
```typescript
server: {
  cors: true
}
```

---

## 🌐 公网访问地址

部署成功后可访问：

| 环境 | 地址 |
|------|------|
| 本地开发 | http://localhost:5173 |
| Vercel预览 | https://shadow-bees-v52-xxx.vercel.app |
| 生产环境 | https://shadow-bees-v52.vercel.app |

---

## 📦 一键部署命令

```bash
# 给部署脚本添加执行权限
chmod +x /Users/frank/Desktop/shadow-bees-v52/deploy.sh

# 运行部署脚本
/Users/frank/Desktop/shadow-bees-v52/deploy.sh
```

---

## ✅ 部署验证清单

- [ ] 页面正常加载无白屏
- [ ] 酒店切换功能正常
- [ ] 定价滑块可以拖动
- [ ] 实时成交有滚动动画
- [ ] 所有图片/Logo正常显示
- [ ] 响应式布局正常

---

**当前状态**: ✅ 本地部署成功，运行中
