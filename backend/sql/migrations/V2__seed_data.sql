-- ============================================
-- V2: 初始化测试数据
-- ============================================

-- ============================================
-- 1. 创建酒店
-- ============================================
INSERT INTO hotels (id, name, type, tier, theme, city, address, coordinates, default_mode, script_strategy, flexible_inventory_rate) VALUES
('11111111-1111-1111-1111-111111111111', '三里屯潮流酒店', 'city', 'comfort', 'cyan', '北京', '朝阳区三里屯路XX号', '{"lat": 39.9362, "lng": 116.4575}'::jsonb, 'clearance', '促销紧迫话术', 0.15),
('22222222-2222-2222-2222-222222222222', '崇礼星空酒店', 'suburb', 'comfort', 'violet', '张家口', '崇礼区雪场路XX号', '{"lat": 40.911, "lng": 115.456}'::jsonb, 'scalper', '紧迫稀缺话术', 0.15),
('33333333-3333-3333-3333-333333333333', '大理洱海酒店', 'tourist', 'comfort', 'amber', '大理', '古城区洱海西路XX号', '{"lat": 25.696, "lng": 100.168}'::jsonb, 'dynamic', '价值对比话术', 0.15);

-- ============================================
-- 2. 创建房型
-- ============================================
INSERT INTO room_types (hotel_id, name, floor_price, ceiling_price, current_price, total_inventory, ota_allocation, flexible_allocation) VALUES
-- 三里屯
('11111111-1111-1111-1111-111111111111', '经济特价房(无窗)', 150, 280, 215, 15, 12, 3),
('11111111-1111-1111-1111-111111111111', '舒适标准房', 260, 420, 340, 35, 28, 7),
('11111111-1111-1111-1111-111111111111', '行政豪华套房', 450, 680, 565, 8, 6, 2),
-- 崇礼
('22222222-2222-2222-2222-222222222222', '雪场青旅床位', 80, 150, 115, 30, 24, 6),
('22222222-2222-2222-2222-222222222222', '雪山标准间', 240, 420, 330, 25, 20, 5),
('22222222-2222-2222-2222-222222222222', '星空观景套房', 480, 780, 630, 6, 4, 2),
-- 大理
('33333333-3333-3333-3333-333333333333', '庭院经济房(背街)', 160, 280, 220, 15, 12, 3),
('33333333-3333-3333-3333-333333333333', '湖景标准房', 280, 480, 380, 25, 20, 5),
('33333333-3333-3333-3333-333333333333', '洱海全景豪华套房', 520, 850, 685, 6, 4, 2);

-- ============================================
-- 3. 生成30天价格日历
-- ============================================
DO $$
DECLARE
    hotel_record RECORD;
    room_record RECORD;
    current_date_val DATE := CURRENT_DATE;
    i INTEGER;
BEGIN
    FOR hotel_record IN SELECT id FROM hotels LOOP
        FOR room_record IN SELECT id, floor_price, ceiling_price FROM room_types WHERE hotel_id = hotel_record.id LOOP
            FOR i IN 0..30 LOOP
                INSERT INTO price_calendar (hotel_id, room_type_id, date, base_price, suggested_price, dynamic_price, inventory_status)
                VALUES (
                    hotel_record.id,
                    room_record.id,
                    current_date_val + i,
                    room_record.floor_price + (random() * 50)::int,
                    room_record.floor_price + 50 + (random() * 100)::int,
                    room_record.floor_price + 80 + (random() * 80)::int,
                    CASE (random() * 3)::int
                        WHEN 0 THEN 'abundant'
                        WHEN 1 THEN 'normal'
                        WHEN 2 THEN 'tight'
                        ELSE 'soldout'
                    END
                )
                ON CONFLICT (hotel_id, room_type_id, date) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
