# Shadow-Bees 数据字典

## 数据库概览

| 表名 | 说明 | 数据量预估 | 备注 |
|------|------|-----------|------|
| hotels | 酒店基础信息 | < 1000 | 静态配置 |
| room_types | 房型配置 | < 5000 | 静态配置 |
| price_calendar | 价格日历 | 100万+/年 | 核心业务表 |
| orders | 订单数据 | 100万+/年 | 核心业务表 |
| competitor_prices | 竞品价格 | 500万+/年 | 可归档 |
| contents | 内容发布 | < 10万 | 可归档 |
| price_audit_logs | 价格审计 | 50万+/年 | 需定期清理 |
| external_events | 外部事件 | < 1万 | 缓存表 |
| llm_logs | 大模型日志 | 100万+/年 | 需定期清理 |

---

## 核心表详解

### 1. hotels（酒店表）

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | 主键 |
| name | VARCHAR(100) | 否 | - | 酒店名称 |
| type | VARCHAR(20) | 否 | - | 类型: city/suburb/tourist |
| tier | VARCHAR(20) | 否 | - | 档次: economy/comfort/premium |
| theme | VARCHAR(20) | 否 | - | 主题色: cyan/violet/amber |
| city | VARCHAR(50) | 否 | - | 城市 |
| address | VARCHAR(255) | 是 | null | 详细地址 |
| coordinates | JSONB | 是 | null | 经纬度 {lat,lng} |
| default_mode | VARCHAR(20) | 是 | null | 默认定价模式 |
| script_strategy | VARCHAR(100) | 是 | null | 话术策略 |
| flexible_inventory_rate | DECIMAL(3,2) | 是 | 0.15 | 灵活库存比例 |
| created_at | TIMESTAMP | 否 | now() | 创建时间 |
| updated_at | TIMESTAMP | 否 | now() | 更新时间 |

**索引:**
- `idx_hotels_type` on type
- `idx_hotels_city` on city
- `idx_hotels_tier` on tier

**示例数据:**
```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "三里屯潮流酒店",
  "type": "city",
  "tier": "comfort",
  "theme": "cyan",
  "city": "北京"
}
```

---

### 2. room_types（房型表）

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | 主键 |
| hotel_id | UUID | 否 | - | 外键 → hotels.id |
| name | VARCHAR(100) | 否 | - | 房型名称 |
| floor_price | DECIMAL(10,2) | 否 | - | 底价（最低售价） |
| ceiling_price | DECIMAL(10,2) | 否 | - | 封顶价（最高售价） |
| current_price | DECIMAL(10,2) | 是 | null | 当前售价 |
| total_inventory | INTEGER | 否 | 0 | 总库存 |
| ota_allocation | INTEGER | 否 | 0 | OTA渠道分配 |
| flexible_allocation | INTEGER | 否 | 0 | 灵活渠道分配 |
| attributes | JSONB | 是 | null | 扩展属性 |

**索引:**
- `idx_room_types_hotel` on hotel_id

**业务规则:**
- floor_price ≤ current_price ≤ ceiling_price
- ota_allocation + flexible_allocation ≤ total_inventory

---

### 3. price_calendar（价格日历）

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | 主键 |
| hotel_id | UUID | 否 | - | 外键 → hotels.id |
| room_type_id | UUID | 否 | - | 外键 → room_types.id |
| date | DATE | 否 | - | 日期 |
| base_price | DECIMAL(10,2) | 是 | null | 基础价格 |
| suggested_price | DECIMAL(10,2) | 是 | null | AI建议价格 |
| dynamic_price | DECIMAL(10,2) | 是 | null | 动态执行价格 |
| competitor_avg_price | DECIMAL(10,2) | 是 | null | 竞品均价 |
| inventory_status | VARCHAR(20) | 是 | null | 库存状态 |
| event_tags | JSONB | 是 | null | 事件标签 |
| ota_available | INTEGER | 是 | 0 | OTA可售 |
| flexible_available | INTEGER | 是 | 0 | 灵活可售 |

**索引:**
- `idx_price_calendar_hotel` on hotel_id
- `idx_price_calendar_date` on date
- `idx_price_calendar_room` on room_type_id
- `UNIQUE(hotel_id, room_type_id, date)`

**数据生命周期:**
- 生成: 提前365天生成基础数据
- 更新: 每日AI定价任务更新
- 归档: 超过90天的数据可归档

---

### 4. orders（订单表）

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | 主键 |
| hotel_id | UUID | 否 | - | 外键 → hotels.id |
| room_type_id | UUID | 否 | - | 外键 → room_types.id |
| order_no | VARCHAR(50) | 否 | - | 订单号（唯一） |
| platform | VARCHAR(20) | 否 | - | 平台: xianyu/xiaohongshu/wechat |
| source_content_id | VARCHAR(50) | 是 | null | 来源内容ID |
| customer_name | VARCHAR(100) | 是 | null | 客户姓名 |
| customer_phone | VARCHAR(20) | 是 | null | 客户电话 |
| check_in_date | DATE | 否 | - | 入住日期 |
| check_out_date | DATE | 否 | - | 退房日期 |
| price | DECIMAL(10,2) | 否 | - | 单价 |
| nights | INTEGER | 否 | 1 | 入住晚数 |
| total_amount | DECIMAL(10,2) | 否 | - | 总金额 |
| platform_fee | DECIMAL(10,2) | 是 | null | 平台服务费 |
| net_revenue | DECIMAL(10,2) | 是 | null | 酒店实收 |
| status | VARCHAR(20) | 否 | - | 订单状态 |
| timestamp | TIMESTAMP | 否 | now() | 创建时间戳 |

**状态流转:**
```
pending（待付款）
   ↓
paid（已付款）
   ↓
checked_in（已入住）
   ↓
checked_out（已离店）
   ↓
invoiced（已开票）

任意状态 → refunded（已退款）
```

**索引:**
- `idx_orders_hotel` on hotel_id
- `idx_orders_status` on status
- `idx_orders_date` on check_in_date
- `idx_orders_timestamp` on timestamp

---

## 枚举值定义

### 酒店类型 (hotels.type)
| 值 | 说明 |
|-----|------|
| city | 城市酒店 |
| suburb | 郊区酒店 |
| tourist | 景区酒店 |

### 酒店档次 (hotels.tier)
| 值 | 说明 |
|-----|------|
| economy | 经济型 |
| comfort | 舒适型 |
| premium | 高档型 |

### 主题色 (hotels.theme)
| 值 | 色值 | 说明 |
|-----|------|------|
| cyan | #00F0FF | 青色（三里屯） |
| violet | #A855F7 | 紫色（崇礼） |
| amber | #FFB800 | 琥珀色（大理） |

### 订单状态 (orders.status)
| 值 | 说明 | 可转移状态 |
|-----|------|-----------|
| pending | 待付款 | paid, cancelled |
| paid | 已付款 | checked_in, refunded |
| checked_in | 已入住 | checked_out |
| checked_out | 已离店 | invoiced |
| invoiced | 已开票 | - |
| refunded | 已退款 | - |

### 平台类型
| 值 | 说明 |
|-----|------|
| xianyu | 闲鱼 |
| xiaohongshu | 小红书 |
| wechat | 微信 |
| xiecheng | 携程 |
| meituan | 美团 |
| feizhu | 飞猪 |

---

## 数据量预估

### 价格日历（price_calendar）
- 酒店数: 100家
- 房型数: 平均3种/酒店
- 天数: 365天
- 总数据量: 100 × 3 × 365 = 109,500条/年

### 订单（orders）
- 日均订单: 1000单
- 年数据量: 1000 × 365 = 365,000条/年

### 竞品价格（competitor_prices）
- 酒店数: 100家
- 竞品数: 平均10家/酒店
- 抓取频率: 每5分钟
- 年数据量: 100 × 10 × 12 × 24 × 365 = 1,051,200,000条/年
- **需要归档策略，只保留最近30天**

---

## 维护建议

### 定期清理任务
```sql
-- 清理超过1年的审计日志
DELETE FROM price_audit_logs WHERE created_at < NOW() - INTERVAL '1 year';

-- 归档超过90天的竞品价格
INSERT INTO competitor_prices_archive 
SELECT * FROM competitor_prices 
WHERE captured_at < NOW() - INTERVAL '90 days';
DELETE FROM competitor_prices WHERE captured_at < NOW() - INTERVAL '90 days';

-- 清理超过6个月的大模型日志
DELETE FROM llm_logs WHERE created_at < NOW() - INTERVAL '6 months';
```

### 索引优化
```sql
-- 定期分析表
ANALYZE orders;
ANALYZE price_calendar;

-- 重建索引
REINDEX TABLE orders;
```
