-- Shadow-Bees V2 数据库初始化脚本
-- 用于手动创建表结构（当 Prisma Migrate 不可用时）

-- 确保使用正确的数据库
\c shadowbees;

-- 创建 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar TEXT,
    role VARCHAR(50) DEFAULT 'HOTEL_STAFF',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 酒店表
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'city',
    tier VARCHAR(50) DEFAULT 'comfort',
    theme VARCHAR(50) DEFAULT 'cyan',
    city VARCHAR(100) NOT NULL,
    address TEXT,
    coordinates JSONB,
    default_mode VARCHAR(50) DEFAULT 'dynamic',
    script_strategy TEXT,
    flexible_inventory_rate FLOAT,
    pricing_config JSONB,
    inventory_mode VARCHAR(50) DEFAULT 'dynamic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 酒店用户关联表
CREATE TABLE IF NOT EXISTS hotel_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'STAFF',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, user_id)
);

-- 4. 房型表
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor_price DECIMAL(10,2) NOT NULL,
    ceiling_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2),
    total_inventory INTEGER NOT NULL,
    ota_allocation INTEGER NOT NULL,
    flexible_allocation INTEGER NOT NULL,
    attributes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 实时库存表
CREATE TABLE IF NOT EXISTS room_inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    ota_pool INTEGER NOT NULL,
    shadow_pool INTEGER NOT NULL,
    sold_ota INTEGER DEFAULT 0,
    sold_shadow INTEGER DEFAULT 0,
    version INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, room_type_id, date)
);

-- 6. 订单表
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(255) UNIQUE NOT NULL,
    hotel_id UUID REFERENCES hotels(id),
    room_type_id UUID REFERENCES room_types(id),
    platform VARCHAR(50) NOT NULL,
    source_content_id VARCHAR(255),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(255),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2),
    net_revenue DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'PENDING',
    inventory_source VARCHAR(50) DEFAULT 'SHADOW',
    created_by_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 价格日志表
CREATE TABLE IF NOT EXISTS price_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id),
    room_type_id UUID,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    ai_suggested DECIMAL(10,2),
    reason TEXT NOT NULL,
    triggered_by VARCHAR(50) NOT NULL,
    factors JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 内容表
CREATE TABLE IF NOT EXISTS contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id),
    platform VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    content TEXT,
    images JSONB,
    prompt TEXT,
    raw_output TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    human_edit TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    published_at TIMESTAMP,
    external_id VARCHAR(255),
    performance JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 竞品价格表
CREATE TABLE IF NOT EXISTS competitor_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id),
    competitor_name VARCHAR(255) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    room_type_hint VARCHAR(255),
    scraped_at TIMESTAMP NOT NULL,
    source_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 外部事件表
CREATE TABLE IF NOT EXISTS external_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    venue VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    expected_attendance INTEGER,
    hot_score INTEGER,
    source VARCHAR(100) NOT NULL,
    source_id VARCHAR(255),
    source_url TEXT,
    affected_hotels JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. AI 请求日志表
CREATE TABLE IF NOT EXISTS ai_request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type VARCHAR(50) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT,
    tokens_used INTEGER,
    cost DECIMAL(10,6),
    latency_ms INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_msg TEXT,
    hotel_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_hotel_id ON orders(hotel_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_room_inventories_hotel_date ON room_inventories(hotel_id, date);
CREATE INDEX IF NOT EXISTS idx_price_logs_hotel_created ON price_logs(hotel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contents_hotel_platform ON contents(hotel_id, platform);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_external_events_city_date ON external_events(city, start_date);

-- 插入测试数据
INSERT INTO users (id, email, password, name, role, status) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@shadowbees.com', '$2a$10$xxxxxxxx', '系统管理员', 'SUPER_ADMIN', 'ACTIVE'),
('550e8400-e29b-41d4-a716-446655440001', 'hotel1@test.com', '$2a$10$xxxxxxxx', '张经理', 'HOTEL_MANAGER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO hotels (id, name, type, tier, city, address, default_mode) VALUES
('660e8400-e29b-41d4-a716-446655440000', '测试酒店', 'city', 'comfort', '杭州', '西湖区文三路', 'dynamic')
ON CONFLICT DO NOTHING;

INSERT INTO hotel_users (hotel_id, user_id, role) VALUES
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'MANAGER')
ON CONFLICT DO NOTHING;

INSERT INTO room_types (id, hotel_id, name, floor_price, ceiling_price, total_inventory, ota_allocation, flexible_allocation) VALUES
('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '标准大床房', 199, 599, 20, 10, 10)
ON CONFLICT DO NOTHING;

-- 授予 sb_admin 权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sb_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sb_admin;

\echo '数据库初始化完成！'
