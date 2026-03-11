# 问题排查手册

## 常见问题速查

### 1. 前端无法访问
```bash
# 检查服务状态
curl http://localhost:5173

# 检查端口占用
lsof -i :5173

# 重启前端服务
npm run dev
```

### 2. 后端 API 500 错误
```bash
# 查看日志
docker logs sb-app

# 检查数据库连接
docker exec sb-postgres pg_isready

# 检查 Redis
docker exec sb-redis redis-cli ping
```

### 3. 数据库连接失败
```bash
# 检查 PostgreSQL 状态
docker ps | grep postgres

# 检查网络连接
docker network ls
docker network inspect shadowbees_sb-network

# 重置数据库（谨慎）
docker-compose down -v
docker-compose up -d
```

### 4. 第三方 API 超时
```bash
# 检查网络连通性
ping api.openai.com

# 检查 API 密钥
env | grep API_KEY

# 查看熔断器状态
# 访问: http://localhost:8080/actuator/health
```

## 错误码对照表

| 错误码 | 可能原因 | 解决方案 |
|--------|---------|---------|
| 40001 | 参数错误 | 检查请求参数格式 |
| 40002 | 酒店不存在 | 确认酒店ID是否正确 |
| 40101 | Token过期 | 重新登录获取Token |
| 40301 | 权限不足 | 联系管理员分配权限 |
| 50001 | 数据库错误 | 检查数据库连接 |
| 50002 | 第三方API超时 | 检查网络/API密钥 |
| 50003 | 消息队列错误 | 检查RabbitMQ状态 |

## 日志查询

### 查看应用日志
```bash
# Docker 方式
docker logs -f sb-app --tail 100

# 本地运行
tail -f logs/application.log
```

### 查看数据库日志
```bash
# PostgreSQL
docker logs sb-postgres

# 慢查询日志（PostgreSQL）
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### 查看 RabbitMQ 日志
```bash
docker logs sb-rabbitmq

# 管理界面
http://localhost:15672
```

## 性能问题排查

### 1. API 响应慢
```bash
# 查看慢请求
# 日志中筛选 > 1000ms 的请求
grep "took [0-9]\{4,\}ms" logs/application.log

# 数据库慢查询
SELECT query, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 2. 内存泄漏
```bash
# 查看内存使用
docker stats sb-app

# JVM 内存分析
jmap -dump:format=b,file=heap.hprof <pid>
```

### 3. 数据库连接池耗尽
```bash
# 查看当前连接
SELECT count(*) FROM pg_stat_activity;

# 查看连接详情
SELECT usename, state, count(*) 
FROM pg_stat_activity 
GROUP BY usename, state;
```

## 数据恢复

### 1. 误删数据恢复
```bash
# 从备份恢复
pg_restore -d shadowbees backup.dump

# 从 WAL 日志恢复（需提前配置）
```

### 2. 数据不一致修复
```bash
# 重新计算统计数据
# 执行数据修复脚本
psql shadowbees -f fix-data.sql
```

## 紧急联系方式

### 内部联系人
- 技术负责人: -
- 运维负责人: -

### 外部支持
- 阿里云客服: 95187
- 腾讯云客服: 4009-100-100
- PMS技术支持: -

## 监控告警

### 关键指标阈值
| 指标 | 警告 | 严重 |
|------|------|------|
| CPU | > 70% | > 90% |
| 内存 | > 80% | > 95% |
| 磁盘 | > 80% | > 95% |
| API响应 | > 500ms | > 2000ms |
| 错误率 | > 1% | > 5% |

### 告警处理流程
1. 收到告警通知
2. 查看监控面板确认问题
3. 查看日志定位原因
4. 根据手册尝试解决
5. 如无法解决，升级至负责人
6. 记录处理过程
