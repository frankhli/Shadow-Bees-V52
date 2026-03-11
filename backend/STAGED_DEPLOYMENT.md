# 渐进式启用微服务

## 核心思路
保留微服务代码架构，但**分阶段启动**，降低初期运维复杂度。

## 部署阶段

### 阶段1：现在（0-50家酒店）
只启动核心服务，其他模块内嵌在 Gateway 中。

```bash
# 启动命令
cd backend
docker-compose -f docker-compose.staged.yml up -d

# 启动的服务
- PostgreSQL (5432)
- Redis (6379)
- Gateway (3000) - 包含 Order/Inventory/Pricing/Content 模块
- Hotel Service (3001)
```

**Gateway 内部架构：**
```
Gateway (NestJS)
├── 外部路由 → Hotel Service (HTTP)
├── 内部模块 Order (直接import)
├── 内部模块 Inventory (直接import)
├── 内部模块 Pricing (直接import)
└── 内部模块 Content (直接import)
```

**优势：**
- 运维简单（只有4个容器）
- 代码保持模块化（以后好拆）
- 性能更好（内部模块函数调用，不是HTTP）

---

### 阶段2：增长期（50-200家酒店）
拆分出独立服务。

**步骤：**
1. 修改 `docker-compose.staged.yml`，取消 `order-service` 注释
2. 修改 Gateway 配置，把 Order 路由改为 HTTP 调用
3. 重启 Gateway

```yaml
# docker-compose.staged.yml
  order-service:
    build: ./packages/services/order-service
    container_name: sb-order-service
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - DATABASE_URL=...
    networks:
      - sb-network
```

---

### 阶段3：成熟期（200-1000家酒店）
全部服务独立。

**切换到完整微服务：**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 切换检查清单

### 从阶段1 → 阶段2（拆分Order服务）
- [ ] Order 服务独立容器启动正常
- [ ] Gateway 配置改为 HTTP 调用 Order
- [ ] 数据库事务测试（跨服务事务用 Saga 模式）
- [ ] 订单压力测试通过
- [ ] 监控告警配置完成

### 从阶段2 → 阶段3（全拆分）
- [ ] 所有服务独立部署
- [ ] 服务发现配置（Consul/Nacos）
- [ ] 链路追踪配置（Jaeger/SkyWalking）
- [ ] 熔断限流配置（Sentinel/Hystrix）

---

## 关键决策点

### 什么时候进入阶段2？
出现以下任意情况：
1. **Order 模块发布频率**明显高于其他模块（1周>3次）
2. **订单量**占系统负载 50% 以上
3. **团队**有 2+ 人专门维护订单功能

### 什么时候进入阶段3？
1. **单体 Gateway 性能瓶颈**（CPU > 80%，响应 > 500ms）
2. **团队规模** > 15人
3. **需要独立扩容**某个服务（比如 AI 生成需要 GPU）

---

## 代码改造说明

### Gateway 内部模块调用（阶段1）
```typescript
// gateway/src/modules/order/order.module.ts
@Module({
  imports: [
    // 阶段1：直接import本地模块
    OrdersInternalModule,
    
    // 阶段2：改成HTTP调用
    // HttpModule.register({ baseURL: 'http://order-service:3002' }),
  ],
  controllers: [OrderController],
})
export class OrderModule {}
```

### 数据库访问（阶段1）
所有模块共用同一个 Prisma Client：
```typescript
// shared/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  // 单例模式，所有模块共享
}
```

---

## 监控指标

### 阶段1监控（4个容器）
```bash
# 查看所有服务状态
docker-compose -f docker-compose.staged.yml ps

# 查看日志（只有一个网关日志）
docker logs -f sb-gateway

# 数据库连接数
psql -h localhost -U sb_admin -d shadowbees -c "SELECT count(*) FROM pg_stat_activity;"
```

### 阶段2+监控（需要工具）
- Prometheus + Grafana（服务指标）
- Jaeger（链路追踪）
- ELK（日志聚合）

---

## 总结

| 阶段 | 酒店数 | 容器数 | 复杂度 | 适用场景 |
|-----|-------|-------|-------|---------|
| 1 | 0-50 | 4 | 低 | 初期验证 |
| 2 | 50-200 | 6-7 | 中 | 快速增长 |
| 3 | 200+ | 8+ | 高 | 成熟业务 |

**现在就按阶段1部署，代码保持微服务结构！**
