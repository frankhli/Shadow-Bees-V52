/**
 * Shadow-Bees 企业版安全配置
 * 用于 iframe 嵌入、SSO、API 通信等安全相关配置
 */

/**
 * 允许的父页面域名白名单
 * 用于验证 iframe 通信的 message.origin
 */
export const ALLOWED_PARENT_ORIGINS = [
  // 华美会 PMS 生产环境
  'https://rmsebk.huameihuihotel.com',
  'https://pms.huameihuihotel.com',
  'https://admin.huameihuihotel.com',
  
  // 华美会 PMS 测试环境
  'https://test-pms.huameihuihotel.com',
  'https://staging-pms.huameihuihotel.com',
  
  // Shadow-Bees 官方域名
  'https://shadowbees.com',
  'https://app.shadowbees.com',
  'https://admin.shadowbees.com',
  
  // 本地开发环境
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
];

/**
 * 检查 origin 是否在白名单中
 */
export function isAllowedOrigin(origin: string): boolean {
  // 开发环境允许所有
  if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
    return true;
  }
  
  // 检查精确匹配
  if (ALLOWED_PARENT_ORIGINS.includes(origin)) {
    return true;
  }
  
  // 检查子域名匹配 (e.g., https://*.huameihuihotel.com)
  const allowedPatterns = [
    /https:\/\/.*\.huameihuihotel\.com$/,
    /https:\/\/.*\.shadowbees\.com$/,
  ];
  
  return allowedPatterns.some(pattern => pattern.test(origin));
}

/**
 * 获取目标 origin 用于 postMessage
 * 优先使用白名单中的第一个生产域名
 */
export function getTargetOrigin(): string {
  if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
    return '*';
  }
  
  // 优先返回华美会生产域名
  return 'https://rmsebk.huameihuihotel.com';
}

/**
 * SSO Token 配置
 */
export const SSO_CONFIG = {
  // Token 存储键名
  TOKEN_KEY: 'pms_token',
  USER_INFO_KEY: 'pms_user_info',
  
  // Token 过期时间（毫秒）- 24小时
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000,
  
  // 自动刷新阈值（毫秒）- 过期前1小时
  REFRESH_THRESHOLD: 60 * 60 * 1000,
};

/**
 * iframe 通信消息类型
 */
export enum IframeMessageType {
  // 来自父页面的消息
  PMS_LOGIN_TOKEN = 'PMS_LOGIN_TOKEN',
  PMS_LOGOUT = 'PMS_LOGOUT',
  PMS_HOTEL_CHANGE = 'PMS_HOTEL_CHANGE',
  PMS_NAVIGATE = 'PMS_NAVIGATE',
  PMS_PING = 'PMS_PING',
  PMS_CONFIG = 'PMS_CONFIG',
  PMS_HOTEL_SWITCH = 'PMS_HOTEL_SWITCH',
  PMS_SYNC_REQUEST = 'PMS_SYNC_REQUEST',
  
  // 发送到父页面的消息
  SB_READY = 'SB_READY',
  SB_RESIZE = 'SB_RESIZE',
  SB_NAVIGATE = 'SB_NAVIGATE',
  SB_LOADING = 'SB_LOADING',
  SB_ERROR = 'SB_ERROR',
  SB_PONG = 'SB_PONG',
}

/**
 * iframe 配置
 */
export const IFRAME_CONFIG = {
  // 最小高度
  MIN_HEIGHT: 600,
  
  // 高度变化防抖时间（毫秒）
  RESIZE_DEBOUNCE: 100,
  
  // 心跳检测间隔（毫秒）
  HEARTBEAT_INTERVAL: 30000,
  
  // 就绪通知延迟（毫秒）
  READY_DELAY: 100,
};

/**
 * API 安全配置
 */
export const API_SECURITY = {
  // 请求超时时间（毫秒）
  TIMEOUT: 30000,
  
  // 最大重试次数
  MAX_RETRIES: 3,
  
  // 重试延迟（毫秒）
  RETRY_DELAY: 1000,
  
  // 需要认证的路由前缀
  PROTECTED_ROUTES: [
    '/enterprise',
    '/api/enterprise',
  ],
};
