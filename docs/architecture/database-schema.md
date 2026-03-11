# Shadow-Bees × 华美会 数据库模型设计

**版本**: v1.0  
**日期**: 2026-03-06  
**数据库**: PostgreSQL 15  
**缓存**: Redis 7  

---

## 1. 核心实体关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           实体关系图                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│   │   Hotel     │◄───────►│   Account   │◄───────►│   Content   │          │
│   │   (酒店)    │  1:N    │   (账号)    │  1:N    │   (内容)    │          │
│   └──────┬──────┘         └─────────────┘         └─────────────┘          │
│          │                                                                  │
│          │ 1:N                                                              │
│          ▼                                                                  │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│   │    Order    │◄───────►│  OrderItem  │         │   Message   │          │
│   │   (订单)    │  1:N    │  (订单项)   │         │   (消息)    │          │
│   └──────┬──────┘         └─────────────┘         └─────────────┘          │
│          │                                                                  │
│          │ N:1                                                              │
│          ▼                                                                  │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│   │  Customer   │         │   Policy    │         │   Finance   │          │
│   │   (客户)    │         │   (政策)    │         │   (财务)    │          │
│   └─────────────┘         └─────────────┘         └─────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 酒店与账号模块

### 2.1 酒店表 (hotels)

```sql
CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    huamei_hotel_id VARCHAR(64) UNIQUE NOT NULL COMMENT '华美会酒店ID',
    name VARCHAR(255) NOT NULL COMMENT '酒店名称',
    city VARCHAR(100) NOT NULL COMMENT '城市',
    address TEXT COMMENT '详细地址',
    star_rating INT COMMENT '星级',
    room_count INT COMMENT '房间总数',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
    
    -- 集团关联
    group_id UUID COMMENT '所属集团ID',
    
    -- PMS配置
    pms_config JSONB COMMENT 'PMS系统配置',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_huamei_id (huamei_hotel_id),
    INDEX idx_group_id (group_id),
    INDEX idx_city (city)
);
```

### 2.2 房型表 (room_types)

```sql
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    huamei_room_type_id VARCHAR(64) COMMENT '华美会房型ID',
    name VARCHAR(100) NOT NULL COMMENT '房型名称',
    total_rooms INT NOT NULL COMMENT '总房间数',
    area DECIMAL(5,2) COMMENT '面积',
    bed_type VARCHAR(50) COMMENT '床型',
    amenities JSONB COMMENT '房间设施',
    images JSONB COMMENT '房型图片',
    
    -- 价格设置
    floor_price DECIMAL(10,2) COMMENT '底价',
    ceiling_price DECIMAL(10,2) COMMENT '天花板价',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_huamei_id (huamei_room_type_id)
);
```

### 2.3 渠道账号表 (accounts)

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL COMMENT '平台: xiaohongshu/xianyu/douyin/wechat',
    account_name VARCHAR(100) NOT NULL COMMENT '账号名称',
    account_id VARCHAR(100) COMMENT '平台账号ID',
    
    -- 登录凭证（加密存储）
    credentials JSONB COMMENT '登录凭证',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/suspended/banned',
    health_score INT DEFAULT 100 COMMENT '健康分(0-100)',
    
    -- 分配
    assigned_hotel_id UUID REFERENCES hotels(id),
    assigned_at TIMESTAMP,
    
    -- 限制
    daily_limit INT DEFAULT 10 COMMENT '日发帖限制',
    current_daily_count INT DEFAULT 0 COMMENT '今日已发帖数',
    
    -- 风控
    risk_flags JSONB COMMENT '风险标记',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_platform (platform),
    INDEX idx_status (status),
    INDEX idx_assigned_hotel (assigned_hotel_id),
    INDEX idx_health_score (health_score)
);
```

---

## 3. 内容模块

### 3.1 内容表 (contents)

```sql
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    account_id UUID REFERENCES accounts(id) COMMENT '发布的账号',
    
    -- 内容信息
    platform VARCHAR(50) NOT NULL COMMENT '发布平台',
    template VARCHAR(100) COMMENT '使用的模板',
    title TEXT COMMENT '标题',
    body TEXT COMMENT '正文',
    hashtags JSONB COMMENT '标签',
    images JSONB COMMENT '图片',
    
    -- AI生成信息
    ai_generated BOOLEAN DEFAULT true,
    ai_prompt TEXT COMMENT '使用的Prompt',
    ai_model VARCHAR(50) COMMENT '使用的模型',
    quality_score INT COMMENT '质量评分(0-100)',
    
    -- 审核状态
    audit_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/passed/rejected',
    audit_result JSONB COMMENT '审核结果',
    audited_by UUID COMMENT '审核人',
    audited_at TIMESTAMP,
    
    -- 发布状态
    publish_status VARCHAR(20) DEFAULT 'draft' COMMENT 'draft/published/failed',
    platform_content_id VARCHAR(100) COMMENT '平台内容ID',
    platform_url TEXT COMMENT '平台链接',
    published_at TIMESTAMP,
    
    -- 效果数据
    metrics JSONB COMMENT '效果数据: {views, likes, comments, shares}',
    
    -- 批量发布
    batch_id UUID COMMENT '批量发布批次ID',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_platform (platform),
    INDEX idx_audit_status (audit_status),
    INDEX idx_publish_status (publish_status),
    INDEX idx_batch_id (batch_id)
);
```

### 3.2 内容模板表 (content_templates)

```sql
CREATE TABLE content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    platform VARCHAR(50) NOT NULL COMMENT '适用平台',
    category VARCHAR(50) COMMENT '分类: promotion/guide/testimonial',
    
    -- 模板内容
    prompt_template TEXT NOT NULL COMMENT 'Prompt模板',
    system_prompt TEXT COMMENT '系统Prompt',
    example_outputs JSONB COMMENT '示例输出',
    
    -- 参数定义
    params_schema JSONB COMMENT '参数Schema',
    
    -- 效果数据
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    avg_quality_score DECIMAL(4,2) COMMENT '平均质量分',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_platform (platform),
    INDEX idx_category (category)
);
```

---

## 4. 订单模块

### 4.1 订单表 (orders)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(64) UNIQUE NOT NULL COMMENT '订单编号 SB+年月日+序号',
    
    -- 酒店信息
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_type_id UUID REFERENCES room_types(id),
    
    -- 华美会关联
    huamei_order_id VARCHAR(64) COMMENT '华美会订单ID',
    
    -- 渠道信息
    platform VARCHAR(50) NOT NULL COMMENT '来源平台',
    platform_order_id VARCHAR(100) COMMENT '平台订单ID',
    source_account_id UUID REFERENCES accounts(id) COMMENT '来源账号',
    
    -- 入住信息
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INT NOT NULL,
    room_count INT DEFAULT 1,
    
    -- 客人信息
    guest_name VARCHAR(100),
    guest_phone VARCHAR(20),
    guest_count INT,
    
    -- 价格信息
    total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总额',
    paid_amount DECIMAL(10,2) COMMENT '已支付金额',
    price_per_night DECIMAL(10,2) COMMENT '每晚单价',
    platform_fee DECIMAL(10,2) COMMENT '平台手续费',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/confirmed/checked_in/checked_out/cancelled/refunded',
    
    -- 核销信息
    verification_code VARCHAR(20) COMMENT '核销码',
    verification_status VARCHAR(20) DEFAULT 'unused' COMMENT 'unused/used/expired',
    verified_at TIMESTAMP,
    verified_by VARCHAR(100) COMMENT '核销人',
    
    -- 退款信息
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    refunded_at TIMESTAMP,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_no (order_no),
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_platform (platform),
    INDEX idx_status (status),
    INDEX idx_check_in_date (check_in_date),
    INDEX idx_huamei_order_id (huamei_order_id),
    INDEX idx_verification_code (verification_code),
    INDEX idx_created_at (created_at)
);
```

### 4.2 订单追踪表 (order_tracks)

```sql
CREATE TABLE order_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- 追踪信息
    event_type VARCHAR(50) NOT NULL COMMENT '事件类型: created/paid/verified/cancelled',
    event_data JSONB COMMENT '事件数据',
    
    -- 来源
    source VARCHAR(50) COMMENT '触发来源: system/manual/huamei',
    operator_id UUID COMMENT '操作人',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);
```

---

## 5. 客服模块

### 5.1 会话表 (conversations)

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 渠道信息
    platform VARCHAR(50) NOT NULL COMMENT '平台',
    platform_conversation_id VARCHAR(100) NOT NULL COMMENT '平台会话ID',
    platform_user_id VARCHAR(100) NOT NULL COMMENT '平台用户ID',
    platform_user_name VARCHAR(100) COMMENT '用户昵称',
    platform_user_avatar TEXT COMMENT '用户头像',
    
    -- 关联
    hotel_id UUID REFERENCES hotels(id) COMMENT '关联酒店',
    account_id UUID REFERENCES accounts(id) COMMENT '关联账号',
    customer_id UUID REFERENCES customers(id) COMMENT '关联客户',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' COMMENT 'active/closed',
    priority VARCHAR(20) DEFAULT 'normal' COMMENT 'high/normal/low',
    
    -- 处理
    handling_by VARCHAR(20) DEFAULT 'ai' COMMENT 'ai/human',
    assigned_to UUID COMMENT '分配给哪位运营人员',
    
    -- 统计
    message_count INT DEFAULT 0,
    unread_count INT DEFAULT 0,
    last_message_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_platform_conversation (platform, platform_conversation_id),
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_status (status),
    INDEX idx_handling_by (handling_by),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_last_message_at (last_message_at)
);
```

### 5.2 消息表 (messages)

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- 消息信息
    platform_message_id VARCHAR(100) COMMENT '平台消息ID',
    direction VARCHAR(20) NOT NULL COMMENT 'in/out (接收/发送)',
    type VARCHAR(20) DEFAULT 'text' COMMENT 'text/image/order/system',
    content TEXT NOT NULL,
    raw_data JSONB COMMENT '原始数据',
    
    -- AI处理
    ai_processed BOOLEAN DEFAULT false,
    ai_intent VARCHAR(50) COMMENT 'AI识别的意图',
    ai_confidence DECIMAL(3,2) COMMENT '置信度',
    ai_response TEXT COMMENT 'AI回复内容',
    
    -- 状态
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_direction (direction),
    INDEX idx_created_at (created_at)
);
```

### 5.3 客户表 (customers)

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 平台信息（同一用户在不同平台可能有多个记录）
    platform VARCHAR(50) NOT NULL,
    platform_user_id VARCHAR(100) NOT NULL,
    platform_user_name VARCHAR(100),
    platform_user_avatar TEXT,
    
    -- 关联
    hotel_id UUID REFERENCES hotels(id),
    
    -- 客户信息
    phone VARCHAR(20) COMMENT '手机号（如果能获取）',
    name VARCHAR(100) COMMENT '真实姓名',
    tags JSONB COMMENT '标签',
    notes TEXT COMMENT '备注',
    
    -- 统计
    order_count INT DEFAULT 0,
    total_gmv DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_platform_user (platform, platform_user_id),
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_phone (phone)
);
```

---

## 6. 财务模块

### 6.1 财务流水表 (finance_records)

```sql
CREATE TABLE finance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    order_id UUID REFERENCES orders(id),
    hotel_id UUID REFERENCES hotels(id),
    
    -- 类型
    record_type VARCHAR(50) NOT NULL COMMENT 'order/refund/commission/settlement',
    
    -- 金额
    amount DECIMAL(10,2) NOT NULL COMMENT '金额（正数收入，负数支出）',
    currency VARCHAR(3) DEFAULT 'CNY',
    
    -- 分润
    platform_fee DECIMAL(10,2) COMMENT '平台手续费',
    shadowbees_share DECIMAL(10,2) COMMENT 'Shadow-Bees分润',
    huamei_share DECIMAL(10,2) COMMENT '华美会分润',
    hotel_revenue DECIMAL(10,2) COMMENT '酒店收入',
    
    -- 描述
    description TEXT,
    
    -- 结算状态
    settlement_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/settled',
    settled_at TIMESTAMP,
    settlement_batch_id VARCHAR(64) COMMENT '结算批次号',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_hotel_id (hotel_id),
    INDEX idx_record_type (record_type),
    INDEX idx_settlement_status (settlement_status),
    INDEX idx_created_at (created_at)
);
```

### 6.2 结算批次表 (settlement_batches)

```sql
CREATE TABLE settlement_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_no VARCHAR(64) UNIQUE NOT NULL COMMENT '结算批次号',
    
    -- 结算周期
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- 统计
    total_orders INT,
    total_gmv DECIMAL(12,2),
    total_platform_fee DECIMAL(12,2),
    total_shadowbees_share DECIMAL(12,2),
    total_huamei_share DECIMAL(12,2),
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/confirmed/completed',
    confirmed_by UUID,
    confirmed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_batch_no (batch_no),
    INDEX idx_status (status)
);
```

---

## 7. 合规与政策模块

### 7.1 政策法规表 (policies)

```sql
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 来源
    platform VARCHAR(50) COMMENT '适用平台，null表示通用',
    policy_type VARCHAR(50) NOT NULL COMMENT 'content/transaction/account/legal',
    
    -- 内容
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT COMMENT '摘要',
    
    -- 有效期
    effective_date DATE,
    expiry_date DATE,
    
    -- 重要性
    priority VARCHAR(20) DEFAULT 'normal' COMMENT 'high/normal/low',
    
    -- 抓取信息
    source_url TEXT COMMENT '原文链接',
    crawled_at TIMESTAMP COMMENT '抓取时间',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_platform (platform),
    INDEX idx_policy_type (policy_type),
    INDEX idx_effective_date (effective_date),
    INDEX idx_priority (priority)
);
```

### 7.2 合规检查记录表 (compliance_checks)

```sql
CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 关联
    content_id UUID REFERENCES contents(id),
    
    -- 检查结果
    check_type VARCHAR(50) COMMENT 'forbidden_word/sensitive/platform_rule',
    risk_level VARCHAR(20) COMMENT 'high/medium/low',
    passed BOOLEAN DEFAULT false,
    
    -- 问题详情
    issues JSONB COMMENT '发现的问题',
    
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_content_id (content_id),
    INDEX idx_risk_level (risk_level),
    INDEX idx_passed (passed)
);
```

---

## 8. 系统配置模块

### 8.1 系统配置表 (system_configs)

```sql
CREATE TABLE system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    
    -- 生效范围
    scope VARCHAR(20) DEFAULT 'global' COMMENT 'global/group/hotel',
    scope_id UUID COMMENT '当scope为group或hotel时的ID',
    
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key),
    INDEX idx_scope (scope, scope_id)
);

-- 示例配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('pricing.control_mode', '{"mode": "hotel_self"}', '定价控制模式'),
('content.auto_publish', '{"enabled": false}', '内容自动发布开关'),
('ai.model', '{"default": "gpt-4", "fallback": "gpt-3.5"}', 'AI模型配置');
```

### 8.2 操作日志表 (operation_logs)

```sql
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 操作人
    user_id UUID,
    user_type VARCHAR(20) COMMENT 'admin/group_admin/hotel_staff',
    
    -- 操作信息
    action VARCHAR(100) NOT NULL COMMENT '操作类型',
    resource_type VARCHAR(50) COMMENT '操作对象类型',
    resource_id UUID COMMENT '操作对象ID',
    
    -- 详情
    before_data JSONB COMMENT '操作前数据',
    after_data JSONB COMMENT '操作后数据',
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at)
);
```

---

## 9. Redis缓存设计

### 9.1 缓存键规范

| 键前缀 | 用途 | 过期时间 |
|--------|------|----------|
| `hotel:{id}` | 酒店基础信息 | 1小时 |
| `inventory:{hotel_id}:{date}` | 房态缓存 | 5分钟 |
| `pricing:{hotel_id}:{date}` | 价格缓存 | 5分钟 |
| `account:{id}` | 账号信息 | 30分钟 |
| `conversation:{id}` | 会话缓存 | 1小时 |
| `verification:{code}` | 核销码映射 | 24小时 |
| `rate_limit:{ip}` | 限流计数 | 1分钟 |
| `lock:inventory:{id}` | 库存锁 | 30分钟 |

### 9.2 缓存示例

```redis
# 酒店信息
HSET hotel:123 name "北京三里屯店" city "北京" room_count 100
EXPIRE hotel:123 3600

# 房态（按日期）
HSET inventory:123:2024-03-10 available 5 booked 95 status "limited"
EXPIRE inventory:123:2024-03-10 300

# 核销码映射
SET verification:123456 "order_uuid_here"
EXPIRE verification:123456 86400

# 库存锁（分布式锁）
SET lock:inventory:123:2024-03-10 "lock_id" NX EX 1800
```

---

## 10. 索引优化建议

### 10.1 高频查询索引

```sql
-- 订单查询（按酒店+状态+时间）
CREATE INDEX idx_orders_hotel_status_time 
ON orders(hotel_id, status, created_at);

-- 内容查询（按酒店+平台+状态）
CREATE INDEX idx_contents_hotel_platform_status 
ON contents(hotel_id, platform, publish_status);

-- 消息查询（按会话+时间）
CREATE INDEX idx_messages_conversation_time 
ON messages(conversation_id, created_at);

-- 财务查询（按酒店+类型+时间）
CREATE INDEX idx_finance_hotel_type_time 
ON finance_records(hotel_id, record_type, created_at);
```

### 10.2 分区建议

```sql
-- 订单表按创建时间分区（按月）
CREATE TABLE orders_partitioned (
    -- 相同结构
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE orders_y2024m03 PARTITION OF orders_partitioned
FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- 财务记录按月分区
CREATE TABLE finance_records_partitioned (
    -- 相同结构
) PARTITION BY RANGE (created_at);
```

---

## 11. 数据迁移策略

### 11.1 与华美会PMS数据同步

| 数据 | 同步方式 | 频率 |
|------|----------|------|
| 酒店基础信息 | 初始化导入 + Webhook更新 | 实时 |
| 房型信息 | 初始化导入 + Webhook更新 | 实时 |
| 房态 | API查询（不存储，实时查） | 实时 |
| 价格 | API查询 + Webhook更新 | 实时 |
| 订单 | Webhook推送 | 实时 |

### 11.2 数据一致性保障

```typescript
// 订单创建事务
async function createOrder(orderData) {
  return await db.transaction(async (trx) => {
    // 1. 创建Shadow-Bees订单
    const order = await trx('orders').insert(orderData).returning('*');
    
    // 2. 创建财务记录
    await trx('finance_records').insert({
      order_id: order.id,
      record_type: 'order',
      amount: orderData.total_amount,
      // ... 分润计算
    });
    
    // 3. 创建订单追踪
    await trx('order_tracks').insert({
      order_id: order.id,
      event_type: 'created',
      event_data: orderData,
    });
    
    return order;
  });
}
```

---

**文档维护者**: Shadow-Bees Team  
**最后更新**: 2026-03-06
