# 🚀 Shadow-Bees 后端快速上手指南

## 一分钟启动

```bash
# 1. 启动后端（新终端窗口）
bash backend/scripts/start.sh

# 2. 等待显示 "管理界面: http://127.0.0.1:8090/_/"

# 3. 启动前端（原终端窗口）
npm run dev

# 4. 浏览器访问 http://localhost:5173
```

## 两种模式对比

| 功能 | 模拟模式 (Mock) | 后端模式 (Backend) |
|------|-----------------|-------------------|
| 启动命令 | `npm run dev` | 先启动后端，再 `npm run dev` |
| 数据存储 | 浏览器 localStorage | PocketBase 数据库 |
| 刷新页面 | 数据保留 | 数据保留 |
| 多设备访问 | ❌ 仅限本机 | ✅ 局域网可访问 |
| 适用场景 | 客户演示、开发测试 | 试用部署、多用户测试 |

## 模式切换

### 方式1：环境变量（推荐）

```bash
# 编辑 .env.development
VITE_USE_BACKEND=false   # 模拟模式
VITE_USE_BACKEND=true    # 后端模式
```

### 方式2：运行时切换

```javascript
// 浏览器控制台（F12）
api.setMode('backend');  // 切到后端
api.setMode('mock');     // 切回模拟
```

### 方式3：URL 参数（临时）

```
http://localhost:5173?api=backend
```

## 常用操作

### 查看后端数据

1. 打开 http://127.0.0.1:8090/_/
2. 登录（admin@shadowbees.com / shadowbees123）
3. 点击左侧 Collections 查看各表数据

### 手动添加订单

```bash
curl -X POST http://127.0.0.1:8090/api/collections/orders/records \
  -H "Content-Type: application/json" \
  -d '{
    "hotel": "sanlitun",
    "room_type": "xxx",
    "order_no": "ORD001",
    "platform": "xianyu",
    "price": 350,
    "status": "paid"
  }'
```

### 备份数据

```bash
# 复制数据库文件
cp backend/pb_data/data.db backup_$(date +%Y%m%d).db
```

## 演示场景建议

### 场景A：客户现场演示（推荐 Mock 模式）

```bash
# 提前准备好数据（localStorage 已持久化）
npm run dev

# 向客户展示：
# - 所有功能完整可用
# - 数据修改后刷新还在
# - 无需网络连接
```

### 场景B：客户试用（推荐 Backend 模式）

```bash
# 启动后端服务
bash backend/scripts/start.sh

# 同一局域网内的其他电脑访问：
# http://你的IP:5173
```

### 场景C：开发调试

```bash
# 终端1：启动后端
bash backend/scripts/start.sh

# 终端2：启动前端
npm run dev

# 浏览器同时打开：
# http://localhost:5173（前端）
# http://127.0.0.1:8090/_/（后端管理）
```

## 常见问题

### Q: 后端启动失败（端口被占用）

```bash
# 查看占用 8090 的进程
lsof -i :8090

# 杀死进程（替换 PID）
kill -9 <PID>

# 或使用其他端口
bash backend/scripts/start.sh --http="127.0.0.1:8080"
```

### Q: 前端无法连接后端

```bash
# 检查后端是否运行
curl http://127.0.0.1:8090/api/health

# 检查环境变量
cat .env.development
```

### Q: 数据不一致（Mock vs Backend）

- Mock 和 Backend 的数据是独立的
- 切换模式后数据不会自动同步
- 如需同步，手动导出导入 JSON

## 下一步

1. **现在**: 验证后端能正常启动
2. **演示**: 使用 Mock 模式给客户演示
3. **试用**: 客户试用时切换到 Backend 模式
4. **上线**: 签约后迁移到正式后端（NestJS/Java）

## 需要帮助？

- 查看 `backend/README.md` 详细文档
- 查看 `src/api/README.md` API 使用说明
- PocketBase 官方文档：https://pocketbase.io/docs/
