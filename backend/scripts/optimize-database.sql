-- Shadow-Bees V2 数据库索引优化脚本
-- 适用于几百家酒店量级（几百万数据）
-- 执行方式: psql -d shadowbees -f optimize-database.sql

-- ============================================================================
-- 1. 库存表索引优化
-- 几百家酒店 × 10 房型 × 365 天 = 几百万记录
-- ============================================================================

-- 核心查询：按酒店+房型+日期查库存（最高频）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_inventories_lookup 
ON room_inventories(hotel_id, room_type_id, date);

-- 查询酒店某天所有房型库存
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_inventories_hotel_date 
ON room_inventories(hotel_id, date);

-- 低库存预警查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_room_inventories_low_stock 
ON room_inventories(hotel_id, ota_pool, shadow_pool) 
WHERE ota_pool < 5 OR shadow_pool < 5;

-- ============================================================================
-- 2. 订单表索引优化
-- 几百家酒店 × 日均 10 单 × 365 天 = 百万级订单/年
-- ============================================================================

-- 核心查询：按酒店查订单列表
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_hotel_created 
ON orders(hotel_id, created_at DESC);

-- 按状态筛选订单（待处理、已完成等）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_hotel_status 
ON orders(hotel_id, status, created_at DESC);

-- 按日期范围查询订单（报表统计）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_date_range 
ON orders(check_in_date, check_out_date);

-- 按客户手机号查询（客服场景）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_phone 
ON orders(customer_phone) 
WHERE customer_phone IS NOT NULL;

-- 按平台筛选（分析渠道来源）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_platform 
ON orders(platform, created_at DESC);

-- 订单号唯一索引（已有，但确认一下）
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_order_no 
-- ON orders(order_no);

-- ============================================================================
-- 3. 内容表索引优化
-- ============================================================================

-- 按酒店+平台查内容
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_hotel_platform 
ON contents(hotel_id, platform, created_at DESC);

-- 按状态筛选（待审核、已发布等）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_status 
ON contents(status, created_at DESC);

-- 发布时间筛选（定时发布场景）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_published 
ON contents(published_at) 
WHERE published_at IS NOT NULL;

-- ============================================================================
-- 4. 价格日志表索引优化
-- ============================================================================

-- 按酒店查价格变动历史
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_logs_hotel_created 
ON price_logs(hotel_id, created_at DESC);

-- 按房型筛选
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_logs_room_type 
ON price_logs(hotel_id, room_type_id, created_at DESC);

-- ============================================================================
-- 5. 用户和权限表索引
-- ============================================================================

-- 用户邮箱登录查询（已有唯一约束，但确认索引）
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
-- ON users(email);

-- 按角色筛选用户
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role) 
WHERE status = 'ACTIVE';

-- 酒店用户关联查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotel_users_lookup 
ON hotel_users(hotel_id, user_id);

-- ============================================================================
-- 6. 外部事件表索引（演唱会/会展等）
-- ============================================================================

-- 按城市+日期查事件（定价参考）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_events_city_date 
ON external_events(city, start_date, end_date);

-- 按日期范围查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_events_date_range 
ON external_events(start_date, end_date);

-- ============================================================================
-- 7. 竞品价格表索引
-- ============================================================================

-- 按酒店查竞品价格历史
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competitor_prices_hotel 
ON competitor_prices(hotel_id, scraped_at DESC);

-- 按平台筛选
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competitor_prices_platform 
ON competitor_prices(hotel_id, platform, scraped_at DESC);

-- ============================================================================
-- 8. 查看所有索引创建情况
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- 9. 分析表（更新统计信息，帮助查询优化器）
-- ============================================================================

ANALYZE room_inventories;
ANALYZE orders;
ANALYZE contents;
ANALYZE price_logs;
ANALYZE users;
ANALYZE hotel_users;
ANALYZE external_events;
ANALYZE competitor_prices;

\echo '数据库索引优化完成！'
