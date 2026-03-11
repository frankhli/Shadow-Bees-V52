-- ============================================
-- V1: 初始化数据库 Schema
-- ============================================

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
    coordinates JSONB,
    default_mode VARCHAR(20) CHECK (default_mode IN ('clearance', 'scalper', 'dynamic')),
    script_strategy VARCHAR(100),
    flexible_inventory_rate DECIMAL(3,2) DEFAULT 0.15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE hotels IS '酒店基础信息';

CREATE INDEX idx_hotels_type ON hotels(type);
CREATE INDEX idx_hotels_city ON hotels(city);

-- ============================================
-- 2. 房型表
-- ============================================
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    floor_price DECIMAL(10,2) NOT NULL,
    ceiling_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2),
    total_inventory INTEGER NOT NULL DEFAULT 0,
    ota_allocation INTEGER NOT NULL DEFAULT 0,
    flexible_allocation INTEGER NOT NULL DEFAULT 0,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_room_types_hotel ON room_types(hotel_id);

-- ============================================
-- 3. 价格日历表
-- ============================================
CREATE TABLE price_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    base_price DECIMAL(10,2),
    suggested_price DECIMAL(10,2),
    dynamic_price DECIMAL(10,2),
    competitor_avg_price DECIMAL(10,2),
    inventory_status VARCHAR(20) CHECK (inventory_status IN ('abundant', 'normal', 'tight', 'soldout')),
    event_tags JSONB,
    ota_available INTEGER DEFAULT 0,
    flexible_available INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, room_type_id, date)
);

CREATE INDEX idx_price_calendar_hotel ON price_calendar(hotel_id);
CREATE INDEX idx_price_calendar_date ON price_calendar(date);

-- ============================================
-- 4. 订单表
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_type_id UUID NOT NULL REFERENCES room_types(id),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('xianyu', 'xiaohongshu', 'wechat')),
    source_content_id VARCHAR(50),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    nights INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2),
    net_revenue DECIMAL(10,2),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'checked_in', 'checked_out', 'invoiced', 'refunded')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_hotel ON orders(hotel_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(check_in_date);

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

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_calendar_updated_at BEFORE UPDATE ON price_calendar 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
