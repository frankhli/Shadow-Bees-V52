# Shadow-Bees 后端服务

基于 [PocketBase](https://pocketbase.io/) 的轻量级后端方案，支持快速原型验证和后期平滑迁移。

## 目录结构

```
backend/
├── pb_data/           # 数据库文件（自动生成，勿删）
├── pb_migrations/     # 数据库迁移脚本
│   ├── 001_init_schema.js   # 初始化表结构
│   └── 002_seed_data.js     # 初始数据
├── scripts/
│   └── start.sh       # 启动脚本
└── README.md
```

## 快速开始

### 1. 启动后端服务

```bash
# 进入项目根目录
cd /Users/frank/Desktop/shadow-bees-v52

# 启动 PocketBase
bash backend/scripts/start.sh
```

首次启动会自动下载 PocketBase 并创建数据库。

### 2. 访问管理界面

- **管理后台**: http://127.0.0.1:8090/_/
- **默认账号**: `admin@shadowbees.com`
- **默认密码**: `shadowbees123`

### 3. 切换前端到后端模式

```bash
# 方式1：修改环境变量
echo "VITE_USE_BACKEND=true" > .env.development

# 方式2：运行时切换（浏览器控制台）
api.setMode('backend')  // 切换到后端模式
api.setMode('mock')     // 切换回模拟模式
```

## 数据库 Schema

### 核心表

| 表名 | 说明 |
|------|------|
| `hotels` | 酒店基础信息 |
| `room_types` | 房型配置（底价/库存等） |
| `orders` | 订单数据 |
| `price_calendar` | 价格日历（365天） |
| `competitor_prices` | 竞品价格抓取记录 |
| `price_audit_logs` | 价格调整审计日志 |
| `contents` | 内容发布记录 |

## API 接口

### 通用格式

```http
GET    /api/collections/{collection}/records
POST   /api/collections/{collection}/records
PATCH  /api/collections/{collection}/records/{id}
DELETE /api/collections/{collection}/records/{id}
```

### 常用接口

```http
# 获取酒店列表
GET /api/collections/hotels/records

# 获取房型
GET /api/collections/room_types/records?filter=(hotel='sanlitun')

# 获取订单（带过滤）
GET /api/collections/orders/records?filter=(hotel='sanlitun' && status='paid')&sort=-timestamp

# 创建订单
POST /api/collections/orders/records
Content-Type: application/json

{
  "hotel": "sanlitun",
  "room_type": "xxx",
  "order_no": "ORD20240213001",
  "platform": "xianyu",
  "price": 350,
  "status": "paid"
}
```

## 切换到正式后端

当需要迁移到正式后端（NestJS/Java）时：

1. **保留数据库设计**: PostgreSQL 表结构可直接复用
2. **保留前端代码**: 修改 `VITE_API_URL` 指向新后端
3. **迁移数据**: 使用 PocketBase 导出功能生成 SQL

```bash
# 导出 PocketBase 数据为 SQL
./pocketbase export --db=pb_data/data.db --format=sql > migration.sql
```

## 注意事项

1. **不要提交 pb_data/**: 数据库文件包含敏感数据，已加入 `.gitignore`
2. **定期备份**: 生产环境务必配置自动备份
3. **安全**: 默认仅监听 localhost，公网访问需配置反向代理

## 故障排查

### 端口冲突
```bash
# 修改启动脚本中的端口号
./pocketbase serve --http="127.0.0.1:8080"
```

### 重置数据库
```bash
# 删除数据目录（会丢失所有数据！）
rm -rf backend/pb_data
```

### 查看日志
```bash
# PocketBase 日志在控制台输出
# 或查看 pb_data/logs.db
```
