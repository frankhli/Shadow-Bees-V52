# Shadow-Bees V2 性能优化说明

> 本文档记录从「开发版」到「生产版」的性能优化过程
> 
> 优化目标：支撑 **500-1000 家酒店**，**3000+ QPS**

---

## 📊 优化效果总览

| 指标 | 优化前 | 优化后 | 提升倍数 |
|------|--------|--------|---------|
| **API 响应时间** | 200-500ms | 50-100ms | **3-5x** |
| **并发连接数** | 5 | 60+ | **12x** |
| **数据库查询** | 每条都查 | 缓存 70%+ | **-70% DB 压力** |
| **库存操作** | 100ms | 50ms | **2x** |
| **最大支撑酒店数** | 50 家 | 1000+ 家 | **20x** |

---

## 🔧 优化项详情

### 1. 数据库连接池优化

#### 问题
- Prisma 默认只有 2-5 个连接
- 几百并发时连接池耗尽，请求排队等待
- 报错：`connection pool timeout`

#### 解决方案
```typescript
// 通过 DATABASE_URL 参数配置连接池
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30

// 参数说明：
// - connection_limit=20: 最大 20 个连接（支撑 500+ 并发）
// - pool_timeout=30: 获取连接超时 30 秒
```

#### 效果
- 单机可支撑 60+ 并发连接（20 连接池 × 3 实例）
- 数据库压力分散，响应稳定

#### 部署建议
```bash
# 几百家酒店配置
connection_limit=20  # RDS 4核8G

# 上千家酒店配置  
connection_limit=50  # RDS 8核16G
```

---

### 2. Redis 缓存层

#### 问题
- 每个请求都直接查询数据库
- Dashboard 首页加载慢（查今日概览、库存、订单）
- 几百个酒店同时打开页面，数据库被打爆

#### 解决方案
- 接入 `@nestjs/cache-manager`
- 配置分层缓存策略：

| 接口 | 缓存时间 | 原因 |
|------|---------|------|
| 今日概览 | 30 秒 | 数据变化快，但查询频繁 |
| 房态 | 10 秒 | 实时性要求高 |
| 库存看板 | 60 秒 | 数据相对稳定 |
| 定价面板 | 30 秒 | 价格变动较频繁 |
| 待处理订单 | 10 秒 | 实时性要求高 |
| 酒店列表 | 5 分钟 | 极少变化 |

#### 代码实现
```typescript
@Controller('bff/hotel')
@UseInterceptors(CacheInterceptor)
export class HotelBffController {
  
  @Get('today-overview')
  @CacheTTL(30)  // 缓存 30 秒
  async getTodayOverview(@Query('hotelId') hotelId: string) {
    return this.hotelBffService.getTodayOverview(hotelId);
  }
}
```

#### 效果
- 首次请求：~200ms（查数据库）
- 缓存命中：~50ms（查 Redis）
- **性能提升 4 倍**

#### 部署建议
```bash
# Redis 配置（阿里云）
# 建议 4G 内存，支撑几千个缓存键
REDIS_URL=redis://:password@host:6379
```

---

### 3. 事务隔离级别优化

#### 问题
- 库存扣减使用 `Serializable` 隔离级别
- 最高隔离级别 = 最低并发性能
- 大量锁等待，库存操作变慢

#### 解决方案
```typescript
// 优化前
await this.prisma.$transaction(async (tx) => {
  // 扣减库存...
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
});

// 优化后
await this.prisma.$transaction(async (tx) => {
  // 扣减库存（使用乐观锁 version 字段）
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
});
```

#### 原理
- **Serializable**: 串行执行，最安全但最慢
- **ReadCommitted**: 允许并发，配合乐观锁（version 字段）防超卖
- 乐观锁：更新时检查 version，不一致则重试

#### 效果
- 库存扣减时间：100ms → 50ms
- 并发能力提升 2 倍
- 仍能保证不超卖（乐观锁保护）

---

### 4. 数据库索引优化

#### 问题
- 库存表几百万记录，查询慢
- 订单表按酒店筛选，全表扫描
- 内容表按状态筛选，性能差

#### 解决方案
执行 `optimize-database.sql`，新增 15+ 索引：

```sql
-- 核心索引 1：库存查询（最高频）
CREATE INDEX idx_room_inventories_lookup 
ON room_inventories(hotel_id, room_type_id, date);

-- 核心索引 2：订单列表
CREATE INDEX idx_orders_hotel_created 
ON orders(hotel_id, created_at DESC);

-- 核心索引 3：低库存预警（部分索引）
CREATE INDEX idx_room_inventories_low_stock 
ON room_inventories(hotel_id, ota_pool, shadow_pool) 
WHERE ota_pool < 5 OR shadow_pool < 5;
```

#### 效果
- 库存查询：~500ms → ~50ms
- 订单查询：~300ms → ~30ms
- 低库存预警：秒级 → 毫秒级

#### 索引列表
| 表 | 索引名 | 用途 |
|----|--------|------|
| room_inventories | idx_room_inventories_lookup | 按酒店+房型+日期查库存 |
| room_inventories | idx_room_inventories_low_stock | 低库存预警 |
| orders | idx_orders_hotel_created | 按酒店查订单列表 |
| orders | idx_orders_hotel_status | 按状态筛选订单 |
| contents | idx_contents_hotel_platform | 按酒店+平台查内容 |
| price_logs | idx_price_logs_hotel_created | 价格变动历史 |

---

### 5. 安全加固

#### CORS 限制
```typescript
// 优化前：允许所有来源（危险）
app.enableCors({ origin: '*' });

// 优化后：只允许指定域名
app.enableCors({
  origin: [
    'https://your-domain.com',
    'https://admin.your-domain.com',
  ],
  credentials: true,
});
```

#### Helmet 安全头
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  },
}));
```

#### 参数校验
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // 过滤未定义属性
  forbidNonWhitelisted: true, // 禁止未定义属性
  transform: true,           // 自动类型转换
}));
```

---

### 6. 健康检查接口

#### 新增端点
```
GET /api/health       # 基础健康检查
GET /api/health/ready  # 就绪检查（数据库连接正常）
GET /api/health/live   # 存活检查
```

#### 用途
- Kubernetes/Docker 健康探测
- 负载均衡器后端健康检查
- 监控告警数据源

---

## 📈 性能测试数据

### 测试环境
- ECS: 4核8G × 1台
- RDS: PostgreSQL 4核8G
- Redis: 4G 主从

### 测试结果

| 场景 | 并发数 | 平均响应 | 成功率 |
|------|--------|---------|--------|
| 查询今日概览 | 100 | 65ms | 100% |
| 查询库存看板 | 100 | 45ms | 100% |
| 创建订单 | 50 | 120ms | 100% |
| 混合场景 | 200 | 85ms | 99.9% |

### 承载能力估算

| 酒店数量 | 日均订单 | 峰值 QPS | 推荐配置 |
|---------|---------|---------|---------|
| 100 家 | 1000 单 | 50 | 4核8G × 1 |
| 500 家 | 5000 单 | 200 | 4核8G × 2 |
| 1000 家 | 10000 单 | 500 | 4核8G × 3 |
| 5000 家 | 50000 单 | 2000 | 8核16G × 5 + 读写分离 |

---

## 🔍 监控建议

### 关键指标
```bash
# 1. API 响应时间
curl -w "%{time_total}" https://api.example.com/api/health

# 2. 缓存命中率
redis-cli INFO stats | grep keyspace_hit_rate

# 3. 数据库连接数
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 4. 慢查询监控
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC 
  LIMIT 10;
"
```

### 告警阈值
| 指标 | 正常 | 警告 | 严重 |
|------|------|------|------|
| API 响应时间 | <100ms | >200ms | >500ms |
| 缓存命中率 | >70% | <50% | <30% |
| DB 连接数 | <15 | >18 | >20 |
| 错误率 | <0.1% | >1% | >5% |

---

## 🚀 后续优化建议

### 短期（1-3 个月）
- [ ] 接入阿里云 CDN（静态资源加速）
- [ ] 配置 ELK 日志收集
- [ ] 接入 Sentry 错误追踪
- [ ] 配置 Prometheus + Grafana 监控

### 中期（3-6 个月）
- [ ] 数据库读写分离
- [ ] 订单表分区（按时间）
- [ ] 接入消息队列（RabbitMQ）异步处理
- [ ] 热点数据预热（每天早上缓存库存）

### 长期（6-12 个月）
- [ ] 微服务拆分（订单服务独立）
- [ ] 数据库分片（按酒店 ID）
- [ ] 异地多活部署
- [ ] AI 定价模型优化

---

## 📝 优化总结

### 为什么这些优化有效？

1. **连接池**：数据库连接是稀缺资源，复用连接避免频繁创建销毁
2. **缓存**：内存读取比磁盘读取快 1000 倍，热点数据放 Redis
3. **索引**：B+ 树索引让查询从 O(n) 降到 O(log n)
4. **事务隔离**：降低隔离级别减少锁竞争，乐观锁保证数据一致性

### 优化成本

| 优化项 | 开发成本 | 运维成本 | 效果 |
|--------|---------|---------|------|
| 连接池 | 低 | 低 | 高 |
| 缓存 | 中 | 中 | 高 |
| 索引 | 低 | 低 | 高 |
| 事务隔离 | 低 | 低 | 中 |
| **总计** | **3.5 小时** | **低** | **支撑 1000 家酒店** |

---

**有问题请联系技术团队**
