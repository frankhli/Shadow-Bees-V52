-- ============================================
-- Shadow-Bees 数据库 Schema (PostgreSQL)
-- ============================================
-- 执行: psql -U sb_admin -d shadowbees -f 001_schema.sql

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 酒店表
-- ============================================
CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('city', 'suburb', 'tourist')),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('economy', 'comfort', 'premium')),
    theme VARCHAR(20) NOT NULL CHECK (theme IN ('cyan', 'violet', 'amber')),
    city VARCHAR(50) NOT NULL,
    address VARCHAR(255),
    coordinates JSONB,  -- {lat: 39.9, lng: 116.4}
    default_mode VARCHAR(20) CHECK (default_mode IN ('clearance', 'scalper', 'dynamic')),
    script_strategy VARCHAR(100),
    flexible_inventory_rate DECIMAL(3,2) DEFAULT 0.15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE hotels IS '酒店基础信息';
COMMENT ON COLUMN hotels.type IS '酒店类型: city城市/suburb郊区/tourist景区';
COMMENT ON COLUMN hotels.tier IS '档次: economy经济/comfort舒适/premium高档';

CREATE INDEX idx_hotels_type ON hotels(type);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_tier ON hotels(tier);

-- ============================================
-- 2. 房型表
-- ============================================
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    floor_price DECIMAL(10,2) NOT NULL,      -- 底价
    ceiling_price DECIMAL(10,2) NOT NULL,    -- 封顶价
    current_price DECIMAL(10,2),             -- 当前售价
    total_inventory INTEGER NOT NULL DEFAULT 0,
    ota_allocation INTEGER NOT NULL DEFAULT 0,
    flexible_allocation INTEGER NOT NULL DEFAULT 0,
    attributes JSONB,  -- {area: 30, bedType: '大床', facilities: ['wifi', 'tv']}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE room_types IS '房型配置';
COMMENT ON COLUMN room_types.floor_price IS '底价，人工维护，AI建议不能低于此价格';
COMMENT ON COLUMN room_types.flexible_allocation IS '灵活渠道分配量';

CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);

-- ============================================
-- 3. 价格日历表（核心表，按天存储）
-- ============================================
CREATE TABLE price_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    base_price DECIMAL(10,2),                -- 基础价格
    suggested_price DECIMAL(10,2),           -- AI建议价格
    dynamic_price DECIMAL(10,2),             -- 最终执行价格
    competitor_avg_price DECIMAL(10,2),      -- 竞品均价
    inventory_status VARCHAR(20) CHECK (inventory_status IN ('abundant', 'normal', 'tight', 'soldout')),
    event_tags JSONB,  -- ['演唱会', '展会']
    ota_available INTEGER DEFAULT 0,
    flexible_available INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, room_type_id, date)
);

COMMENT ON TABLE price_calendar IS '价格日历，365天预售期';
COMMENT ON COLUMN price_calendar.dynamic_price IS '最终执行价格，AI计算+人工调整';

CREATE INDEX idx_price_calendar_hotel ON price_calendar(hotel_id);
CREATE INDEX idx_price_calendar_date ON price_calendar(date);
CREATE INDEX idx_price_calendar_room ON price_calendar(room_type_id);

-- ============================================
-- 4. 订单表
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_type_id UUID NOT NULL REFERENCES room_types(id),
    order_no VARCHAR(50) NOT NULL UNIQUE,     -- 订单号
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('xianyu', 'xiaohongshu', 'wechat')),
    source_content_id VARCHAR(50),            -- 来源内容ID
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,             -- 单价
    nights INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,      -- 总金额
    platform_fee DECIMAL(10,2),               -- 平台服务费
    net_revenue DECIMAL(10,2),                -- 酒店实收
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'checked_in', 'checked_out', 'invoiced', 'refunded')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE orders IS '订单主表';
COMMENT ON COLUMN orders.status IS 'pending待付款/paid已付款/checked_in已入住/checked_out已离店/invoiced已开票/refunded已退款';

CREATE INDEX idx_orders_hotel ON orders(hotel_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(check_in_date);
CREATE INDEX idx_orders_timestamp ON orders(timestamp);
CREATE INDEX idx_orders_platform ON orders(platform);

-- ============================================
-- 5. 竞品价格抓取记录
-- ============================================
CREATE TABLE competitor_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    competitor_name VARCHAR(100) NOT NULL,
    competitor_brand VARCHAR(50),
    room_type_name VARCHAR(100) NOT NULL,
    platform VARCHAR(20) CHECK (platform IN ('xiecheng', 'meituan', 'gaode', 'feizhu')),
    price DECIMAL(10,2) NOT NULL,
    inventory INTEGER,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE competitor_prices IS '竞品价格抓取记录';

CREATE INDEX idx_competitor_prices_hotel ON competitor_prices(hotel_id);
CREATE INDEX idx_competitor_prices_date ON competitor_prices(captured_at);

-- ============================================
-- 6. 价格审计日志
-- ============================================
CREATE TABLE price_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id),
    room_type_id UUID REFERENCES room_types(id),
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    reason TEXT,
    triggered_by VARCHAR(20) CHECK (triggered_by IN ('user', 'system', 'smart_pricing')),
    user_id VARCHAR(50),
    user_name VARCHAR(100),
    user_role VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE price_audit_logs IS '价格调整审计日志';
COMMENT ON COLUMN price_audit_logs.triggered_by IS 'user人工/system系统/smart_pricing智能定价';

CREATE INDEX idx_audit_logs_hotel ON price_audit_logs(hotel_id);
CREATE INDEX idx_audit_logs_created ON price_audit_logs(created_at);

-- ============================================
-- 7. 内容发布表
-- ============================================
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    content_id VARCHAR(50) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('xianyu', 'xiaohongshu', 'wechat')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    price DECIMAL(10,2),
    status VARCHAR(20) CHECK (status IN ('draft', 'published', 'archived')),
    performance JSONB,  -- {impressions: 1000, clicks: 50, inquiries: 10, conversions: 2}
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE contents IS '内容发布记录';

CREATE INDEX idx_contents_hotel ON contents(hotel_id);
CREATE INDEX idx_contents_platform ON contents(platform);

-- ============================================
-- 8. 外部事件缓存表（火车晚点、演唱会等）
-- ============================================
CREATE TABLE external_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,          -- train_delay/concert/weather/exam
    event_name VARCHAR(200) NOT NULL,
    location VARCHAR(200),                    -- 影响区域
    event_date DATE,                          -- 事件日期
    intensity VARCHAR(20) CHECK (intensity IN ('low', 'medium', 'high')),
    description TEXT,
    source_api VARCHAR(50),                   -- 来源API：12306/damai/weather
    raw_data JSONB,                           -- 原始API返回
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE       -- 缓存过期时间
);

COMMENT ON TABLE external_events IS '外部事件缓存，用于影响定价';

CREATE INDEX idx_external_events_type ON external_events(event_type);
CREATE INDEX idx_external_events_date ON external_events(event_date);
CREATE INDEX idx_external_events_location ON external_events(location);

-- ============================================
-- 9. 大模型调用日志
-- ============================================
CREATE TABLE llm_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id),
    request_type VARCHAR(50) NOT NULL,        -- pricing/content/analysis
    model VARCHAR(50) NOT NULL,               -- gpt-4/ernie-bot
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd DECIMAL(10,4),                   -- 调用成本
    request_content TEXT,                     -- 请求内容（脱敏后）
    response_content TEXT,                    -- 响应内容
    latency_ms INTEGER,                       -- 响应时间
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE llm_logs IS '大模型调用日志，用于成本分析和优化';

CREATE INDEX idx_llm_logs_hotel ON llm_logs(hotel_id);
CREATE INDEX idx_llm_logs_created ON llm_logs(created_at);

-- ============================================
-- 触发器：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_calendar_updated_at BEFORE UPDATE ON price_calendar FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
