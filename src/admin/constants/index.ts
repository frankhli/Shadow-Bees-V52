/**
 * Shadow-Bees Admin 常量定义
 * 集中管理所有业务常量，避免魔法数字
 */

// ==================== 阈值常量 ====================

// 定价偏离阈值 (%)
export const PRICE_DEVIATION = {
  WARNING: 20,
  CRITICAL: 30,
};

// 库存售罄率阈值 (%)
export const SELL_THROUGH = {
  OTA: {
    WARNING: 40,
    CRITICAL: 25,
  },
  FLEXIBLE: {
    WARNING: 50,
    CRITICAL: 30,
    SOLD_OUT_WARNING: 85,
    SOLD_OUT_CRITICAL: 95,
  },
};

// 内容评分阈值
export const CONTENT_SCORE = {
  WARNING: 70,
  CRITICAL: 60,
};

// 内容数量阈值
export const CONTENT_COUNT = {
  WARNING: 3,
  CRITICAL: 1,
};

// 违规内容阈值
export const VIOLATION = {
  WARNING: 2,
  CRITICAL: 4,
};

// 工单处理阈值
export const TICKET = {
  OPEN_DAYS: {
    WARNING: 2,
    CRITICAL: 5,
  },
  RECENT_COUNT: {
    WARNING: 3,
    CRITICAL: 5,
  },
  RATING: {
    WARNING: 4.0,
    CRITICAL: 3.0,
  },
};

// 退款率阈值 (%)
export const REFUND_RATE = {
  WARNING: 20,
  CRITICAL: 30,
};

// ==================== 健康度评分阈值 ====================

export const HEALTH_SCORE = {
  EXCELLENT: 90,
  GOOD: 80,
  WARNING: 60,
  CRITICAL: 40,
};

// ==================== UI 常量 ====================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  STAGGER: 50,
};

export const TOAST_DURATION = {
  SHORT: 2000,
  NORMAL: 3000,
  LONG: 5000,
};

// ==================== 正则表达式 ====================

export const REGEX = {
  PHONE: /^1[3-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};
