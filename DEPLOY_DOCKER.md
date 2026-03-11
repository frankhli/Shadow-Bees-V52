# Shadow-Bees Docker 部署说明

## 提供给运维/技术同事

### 一、服务器要求

| 配置 | 最低 | 建议 |
|-----|------|------|
| CPU | 2核 | 4核 |
| 内存 | 4G | 8G |
| 硬盘 | 50G SSD | 100G SSD |
| 系统 | Ubuntu 22.04 LTS | - |
| 端口 | 22, 80, 443 | - |

### 二、安装 Docker

```bash
# Ubuntu 一键安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 docker-compose
sudo apt install -y docker-compose
```

### 三、部署步骤

#### 1. 复制项目到服务器

```bash
git clone [你的代码仓库] /opt/shadow-bees
cd /opt/shadow-bees
```

#### 2. 配置环境变量

```bash
cp .env.production.template .env.production
# 编辑 .env.production 填入实际配置
```

#### 3. 启动所有服务

```bash
# 构建并启动（第一次运行）
docker-compose -f docker-compose.full.yml up --build -d

# 后续更新
docker-compose -f docker-compose.full.yml up -d
```

#### 4. 验证部署

```bash
# 查看所有容器状态
docker-compose -f docker-compose.full.yml ps

# 查看日志
docker-compose -f docker-compose.full.yml logs -f

# 访问测试
curl http://localhost/health
```

### 四、服务清单

部署后会启动以下服务：

| 服务 | 端口 | 说明 |
|-----|------|------|
| frontend | 80/443 | Nginx 前端 |
| gateway | 3000 | API 网关 |
| hotel-service | 3001 | 酒店服务 |
| order-service | 3002 | 订单服务 |
| inventory-service | 3003 | 库存服务 |
| pricing-service | 3004 | 定价服务 |
| ai-service | 3005 | AI 服务 |
| postgres | 5432 | PostgreSQL 数据库 |
| redis | 6379 | Redis 缓存 |

### 五、常用命令

```bash
# 停止所有服务
docker-compose -f docker-compose.full.yml down

# 重启
docker-compose -f docker-compose.full.yml restart

# 更新代码后重建
docker-compose -f docker-compose.full.yml up -d --build

# 查看日志
docker-compose -f docker-compose.full.yml logs -f [服务名]

# 进入数据库
docker exec -it sb-postgres psql -U sb_admin -d shadowbees
```

### 六、数据备份

```bash
# 备份数据库
docker exec sb-postgres pg_dump -U sb_admin shadowbees > backup.sql

# 备份 Redis
docker exec sb-redis redis-cli save
docker cp sb-redis:/data/dump.rdb ./redis-backup.rdb
```

---

**有问题联系 Frank**
