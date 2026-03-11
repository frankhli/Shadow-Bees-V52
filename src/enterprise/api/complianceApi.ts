/**
 * 合规相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PlatformRule,
  LegalCompliance,
  RiskEvent,
  PaginationParams,
} from './types';
import { MOCK_PLATFORM_RULES, MOCK_LEGAL_COMPLIANCE, MOCK_RISK_EVENTS } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取平台规则列表
 */
export async function getPlatformRules(
  params?: PaginationParams & { platform?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<PlatformRule>>> {
  await delay();
  
  let list = [...MOCK_PLATFORM_RULES];
  
  if (params?.platform) {
    list = list.filter(r => r.platform === params.platform);
  }
  
  if (params?.status) {
    list = list.filter(r => r.status === params.status);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取法律法规列表
 */
export async function getLegalCompliance(): Promise<ApiResponse<LegalCompliance[]>> {
  await delay();
  
  return {
    success: true,
    data: MOCK_LEGAL_COMPLIANCE,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取风险事件列表
 */
export async function getRiskEvents(
  params?: PaginationParams & { level?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<RiskEvent>>> {
  await delay();
  
  let list = [...MOCK_RISK_EVENTS];
  
  if (params?.level) {
    list = list.filter(e => e.level === params.level);
  }
  
  if (params?.status) {
    list = list.filter(e => e.status === params.status);
  }
  
  // 按时间倒序
  list.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新风险事件状态
 */
export async function updateRiskEventStatus(
  eventId: string,
  status: string
): Promise<ApiResponse<RiskEvent>> {
  await delay(300);
  
  const eventIndex = MOCK_RISK_EVENTS.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    return {
      success: false,
      data: null as any,
      message: '风险事件不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_RISK_EVENTS[eventIndex] = {
    ...MOCK_RISK_EVENTS[eventIndex],
    status: status as any,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_RISK_EVENTS[eventIndex],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取合规统计
 */
export async function getComplianceStats(): Promise<ApiResponse<{
  totalRules: number;
  activeRules: number;
  highRiskEvents: number;
  mediumRiskEvents: number;
  lowRiskEvents: number;
  pendingEvents: number;
}>> {
  await delay();
  
  return {
    success: true,
    data: {
      totalRules: MOCK_PLATFORM_RULES.length,
      activeRules: MOCK_PLATFORM_RULES.filter(r => r.status === 'active').length,
      highRiskEvents: MOCK_RISK_EVENTS.filter(e => e.level === 'high').length,
      mediumRiskEvents: MOCK_RISK_EVENTS.filter(e => e.level === 'medium').length,
      lowRiskEvents: MOCK_RISK_EVENTS.filter(e => e.level === 'low').length,
      pendingEvents: MOCK_RISK_EVENTS.filter(e => e.status === 'pending').length,
    },
    timestamp: new Date().toISOString(),
  };
}
