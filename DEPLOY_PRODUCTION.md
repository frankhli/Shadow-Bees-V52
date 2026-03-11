# Shadow-Bees V2 生产部署指南

> 本文档适用于支撑 **500-1000 家酒店** 的生产环境部署
> 
> 最后更新：2026-02-25（已集成性能优化）

---

## 📋 部署前准备

### 1. 云资源准备（优化后配置）

| 资源 | 推荐配置 | 预估费用 | 说明 |
|------|---------|---------|------|
| ECS 服务器 | 4核8G × 3台 | ¥900/月 | Gateway + 微服务多实例部署 |
| RDS PostgreSQL | 4核8G + 只读实例 | ¥1200/月 | 主从架构，支撑千万级数据 |
| Redis | 4G 主从 | ¥300/月 | 缓存 + 会话 + 限频 |
| SLB 负载均衡 | 标准型 | ¥100/月 | 流量分发 |
| OSS 存储 | 500GB | ¥100/月 | 图片存储 |
| CDN | 100GB | ¥100/月 | 前端资源加速 |
| **总计** | | **¥2800/月** | **支撑 500-1000 家酒店** |

### 2. 性能优化已完成 ✅

本次部署已内置以下优化：

- ✅ **数据库连接池**：20 连接池，支撑 500+ 并发
- ✅ **Redis 缓存**：API 响应时间从 200ms 降至 50ms
- ✅ **事务隔离优化**：ReadCommitted 提升库存操作性能
- ✅ **数据库索引**：15+ 索引优化，覆盖高频查询场景
- ✅ **安全加固**：Helmet 安全头 + CORS 限制

### 3. 域名与备案

- [ ] 注册域名（推荐：your-domain.com）
- [ ] 完成 ICP 备案（国内服务器必须）
- [ ] 申请 SSL 证书（Let's Encrypt 或阿里云）

### 4. 安全配置

```bash
# 生成安全的 JWT Secret
openssl rand -base64 32

# 生成数据库密码（16位以上）
openssl rand -base64 24
```

---

## 🚀 部署步骤

### 第一步：配置环境变量

```bash
# 1. 复制模板文件
cp .env.production.template .env.production

# 2. 编辑配置（填入实际值）
vim .env.production

# 关键配置项：
# - DATABASE_URL: 包含 connection_limit=20 连接池配置
# - REDIS_URL: 阿里云 Redis 地址
# - FRONTEND_URL/ADMIN_URL/GROUP_URL: 前端域名（用于 CORS）

# 3. 验证配置
source .env.production
echo $DATABASE_URL
```

### 第二步：数据库初始化

```bash
# 1. 连接 RDS 并创建数据库
psql -h <RDS_ENDPOINT> -U <MASTER_USER> -c "CREATE DATABASE shadowbees;"

# 2. 创建用户并授权
psql -h <RDS_ENDPOINT> -U <MASTER_USER> -c "
  CREATE USER sb_admin WITH PASSWORD '<STRONG_PASSWORD>';
  GRANT ALL PRIVILEGES ON DATABASE shadowbees TO sb_admin;
"

# 3. 执行表结构迁移
cd backend/packages/shared
export DATABASE_URL="postgresql://sb_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/shadowbees?connection_limit=20"
npx prisma migrate deploy

# 4. 执行索引优化（几百家酒店必须）
psql $DATABASE_URL -f ../../scripts/optimize-database.sql

# 5. 验证索引
psql $DATABASE_URL -c "\di"
```

### 第三步：构建前端

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 验证构建输出
ls -la dist/
```

### 第四步：构建后端 Docker 镜像

```bash
cd backend

# 构建所有服务
docker-compose -f docker-compose.prod.yml build

# 查看镜像
docker images | grep shadow-bees
```

### 第五步：启动服务

```bash
cd backend

# 1. 启动服务（后台运行）
docker-compose -f docker-compose.prod.yml up -d

# 2. 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 3. 查看日志
docker-compose -f docker-compose.prod.yml logs -f gateway
```

### 第六步：验证部署

```bash
# 1. 健康检查
curl https://your-domain.com/api/health
curl https://your-domain.com/api/health/ready

# 2. API 测试（应走缓存，响应 < 100ms）
time curl https://your-domain.com/api/bff/hotel/today-overview?hotelId=<HOTEL_ID>

# 3. 前端访问
open https://your-domain.com
```

---

## 🔍 性能监控

### 关键指标

| 指标 | 健康值 | 告警阈值 | 检查命令 |
|------|--------|---------|---------|
| API 响应时间 | < 100ms | > 500ms | `time curl /api/health` |
| 数据库连接数 | < 15 | > 18 | `psql -c "SELECT count(*) FROM pg_stat_activity;"` |
| Redis 内存 | < 3G | > 3.5G | `redis-cli INFO memory` |
| CPU 使用率 | < 70% | > 85% | `top` |
| 内存使用率 | < 80% | > 90% | `free -m` |

### 缓存监控

```bash
# 查看缓存命中率（Redis）
redis-cli INFO stats | grep keyspace

# 预期结果：
# keyspace_hits: 高数值（命中次数）
# keyspace_misses: 低数值（未命中次数）
```

---

## 🔧 故障排查

### 数据库连接池耗尽

**症状**：API 响应变慢，报错 `connection pool timeout`

**解决**：
```bash
# 1. 检查当前连接数
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 2. 查看连接详情
psql $DATABASE_URL -c "
  SELECT pid, usename, application_name, state, query_start 
  FROM pg_stat_activity 
  WHERE datname = 'shadowbees';
"

# 3. 重启应用释放连接
docker-compose -f docker-compose.prod.yml restart
```

### 缓存未命中

**症状**：API 响应时间 > 200ms

**解决**：
```bash
# 检查 Redis 连接
docker-compose exec gateway redis-cli ping

# 查看缓存键
redis-cli KEYS "*hotel*" | head -10
```

### 502 Bad Gateway

**症状**：Nginx 返回 502

**解决**：
```bash
# 检查 Gateway 是否运行
docker ps | grep gateway

# 检查 Nginx 配置
nginx -t

# 重启 Nginx
docker-compose restart nginx
```

---

## 📊 扩容指南

### 垂直扩容（单机性能不足）

```bash
# 升级 ECS 配置：4核8G → 8核16G
# 升级 RDS 配置：4核8G → 8核16G
# 升级 Redis 配置：4G → 8G
```

### 水平扩容（实例数量增加）

```bash
# 增加服务实例数量
docker-compose -f docker-compose.prod.yml up -d --scale gateway=3 --scale hotel-service=3
```

### 数据库读写分离（上千家酒店）

```bash
# 1. 配置只读实例地址
# 2. 修改代码：读操作走从库，写操作走主库
# 3. 详见文档：DATABASE_READ_REPLICA_URL
```

---

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建
docker-compose -f docker-compose.prod.yml build

# 3. 滚动更新（零停机）
docker-compose -f docker-compose.prod.yml up -d --no-deps --build [service-name]

# 4. 验证更新
curl https://your-domain.com/api/health
```

---

## 📞 紧急回滚

```bash
# 1. 查看历史版本
docker images | grep shadow-bees

# 2. 回滚到指定版本
docker-compose -f docker-compose.prod.yml down
docker tag [old-image] [current-image]
docker-compose -f docker-compose.prod.yml up -d

# 3. 数据库回滚（谨慎操作）
npx prisma migrate resolve --rolled-back [migration-name]
```

---

## ✅ 部署检查清单

### 部署前
- [ ] 所有环境变量已配置（尤其是连接池参数）
- [ ] 数据库已创建并测试连接
- [ ] Redis 已创建并测试连接
- [ ] SSL 证书已上传
- [ ] 域名解析已配置
- [ ] 防火墙端口已开放（80/443/3000-3005）

### 部署中
- [ ] 数据库迁移成功
- [ ] 索引优化脚本执行成功
- [ ] 所有服务启动成功
- [ ] 健康检查通过
- [ ] API 响应时间 < 100ms

### 部署后
- [ ] 前端页面正常加载
- [ ] 登录/注册功能正常
- [ ] 核心业务功能测试（下单、查库存）
- [ ] 监控告警配置完成
- [ ] 日志收集正常
- [ ] 数据库备份策略生效

---

## 📚 相关文档

- [环境变量模板](./.env.production.template)
- [Docker 生产配置](./backend/docker-compose.prod.yml)
- [Nginx 生产配置](./backend/nginx/nginx.prod.conf)
- [数据库优化脚本](./backend/scripts/optimize-database.sql)
- [API 文档](./backend/docs/API.md)
- [性能优化说明](./PERFORMANCE_OPTIMIZATION.md) ⬅️ 新增

---

**部署问题请联系运维团队**
