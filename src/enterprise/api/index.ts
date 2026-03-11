/**
 * API层统一导出
 * 
 * 使用方式：
 * import { hotelApi, pricingApi, orderApi } from '@/enterprise/api';
 * 
 * 后续替换为真实API时，只需修改各个api文件中的实现，
 * 保持接口签名不变，业务代码无需改动。
 */

// 导出类型
export * from './types';

// 导出API服务
export * as hotelApi from './hotelApi';
export * as pricingApi from './pricingApi';
export * as inventoryApi from './inventoryApi';
export * as orderApi from './orderApi';
export * as dashboardApi from './dashboardApi';
export * as contentApi from './contentApi';
export * as ticketApi from './ticketApi';
export * as auditApi from './auditApi';
export * as accountApi from './accountApi';
export * as customerApi from './customerApi';

// 新增API服务
export * as complianceApi from './complianceApi';
export * as riskApi from './riskApi';
export * as aichatApi from './aichatApi';
export * as scriptApi from './scriptApi';
export * as strategyApi from './strategyApi';
export * as eventsApi from './eventsApi';
export * as channelApi from './channelApi';
export * as imageLibraryApi from './imageLibraryApi';
export * as settlementApi from './settlementApi';

// 导出mock数据（开发调试用）
export * as mockData from './mockData';
