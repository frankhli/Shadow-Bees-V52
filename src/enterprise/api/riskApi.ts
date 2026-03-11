/**
 * 风险预警相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  RiskPrediction,
  RiskKnowledge,
  RiskAlert,
  PaginationParams,
} from './types';
import { MOCK_PREDICTIONS, MOCK_KNOWLEDGE, MOCK_RISK_EVENTS } from './mockData';
import { logger } from '../utils/logger';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取风险预测列表
 */
export async function getRiskPredictions(
  params?: PaginationParams & { level?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<RiskPrediction>>> {
  await delay();
  
  let list = [...MOCK_PREDICTIONS];
  
  if (params?.level) {
    list = list.filter(p => p.level === params.level);
  }
  
  if (params?.status) {
    list = list.filter(p => p.status === params.status);
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
 * 获取风险知识库
 */
export async function getRiskKnowledge(
  params?: PaginationParams & { category?: string }
): Promise<ApiResponse<PaginatedResponse<RiskKnowledge>>> {
  await delay();
  
  let list = [...MOCK_KNOWLEDGE];
  
  if (params?.category) {
    list = list.filter(k => k.category === params.category);
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
 * 获取风险预警列表（生成）
 */
export async function getRiskAlerts(hotelIds?: string[]): Promise<ApiResponse<RiskAlert[]>> {
  await delay();
  
  // 基于风险事件生成预警
  const alerts: RiskAlert[] = MOCK_RISK_EVENTS
    .filter(e => e.status === 'pending' || e.status === 'processing')
    .map(e => ({
      id: `alert-${e.id}`,
      hotelId: e.hotelId,
      type: e.type,
      level: e.level,
      title: e.title,
      description: e.description,
      detectedAt: e.detectedAt,
      suggestion: e.suggestion,
      relatedEventId: e.id,
    }));
  
  if (hotelIds && hotelIds.length > 0) {
    return {
      success: true,
      data: alerts.filter(a => hotelIds.includes(a.hotelId)),
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: alerts,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取风险统计
 */
export async function getRiskStats(): Promise<ApiResponse<{
  totalPredictions: number;
  pendingPredictions: number;
  confirmedPredictions: number;
  dismissedPredictions: number;
  totalKnowledge: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}>> {
  await delay();
  
  return {
    success: true,
    data: {
      totalPredictions: MOCK_PREDICTIONS.length,
      pendingPredictions: MOCK_PREDICTIONS.filter(p => p.status === 'pending').length,
      confirmedPredictions: MOCK_PREDICTIONS.filter(p => p.status === 'confirmed').length,
      dismissedPredictions: MOCK_PREDICTIONS.filter(p => p.status === 'dismissed').length,
      totalKnowledge: MOCK_KNOWLEDGE.length,
      highRiskCount: MOCK_RISK_EVENTS.filter(e => e.level === 'high').length,
      mediumRiskCount: MOCK_RISK_EVENTS.filter(e => e.level === 'medium').length,
      lowRiskCount: MOCK_RISK_EVENTS.filter(e => e.level === 'low').length,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新预测状态
 */
export async function updatePredictionStatus(
  predictionId: string,
  status: string
): Promise<ApiResponse<RiskPrediction>> {
  await delay(300);
  
  const index = MOCK_PREDICTIONS.findIndex(p => p.id === predictionId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '预测不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_PREDICTIONS[index] = {
    ...MOCK_PREDICTIONS[index],
    status: status as any,
  };
  
  return {
    success: true,
    data: MOCK_PREDICTIONS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 标记风险预警为已解决
 */
export async function resolveRiskAlert(
  alertId: string,
  note?: string
): Promise<ApiResponse<{ id: string; status: string }>> {
  await delay(400);
  
  // TODO: 接入真实后端 API - PUT /api/risk/alerts/{alertId}/resolve
  logger.debug('[API] resolveRiskAlert', { alertId, note });
  
  return {
    success: true,
    data: { id: alertId, status: 'resolved' },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 忽略风险预警
 */
export async function ignoreRiskAlert(
  alertId: string,
  reason?: string
): Promise<ApiResponse<{ id: string; status: string }>> {
  await delay(400);
  
  // TODO: 接入真实后端 API - PUT /api/risk/alerts/{alertId}/ignore
  logger.debug('[API] ignoreRiskAlert', { alertId, reason });
  
  return {
    success: true,
    data: { id: alertId, status: 'ignored' },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量标记风险预警为已解决
 */
export async function batchResolveRiskAlerts(
  alertIds: string[],
  note?: string
): Promise<ApiResponse<{ resolvedIds: string[] }>> {
  await delay(500);
  
  // TODO: 接入真实后端 API - PUT /api/risk/alerts/batch/resolve
  logger.debug('[API] batchResolveRiskAlerts', { alertIds, note });
  
  return {
    success: true,
    data: { resolvedIds: alertIds },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量忽略风险预警
 */
export async function batchIgnoreRiskAlerts(
  alertIds: string[],
  reason?: string
): Promise<ApiResponse<{ ignoredIds: string[] }>> {
  await delay(500);
  
  // TODO: 接入真实后端 API - PUT /api/risk/alerts/batch/ignore
  logger.debug('[API] batchIgnoreRiskAlerts', { alertIds, reason });
  
  return {
    success: true,
    data: { ignoredIds: alertIds },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量分派风险预警
 */
export async function batchAssignRiskAlerts(
  alertIds: string[],
  assignee: string
): Promise<ApiResponse<{ assignedIds: string[] }>> {
  await delay(500);
  
  // TODO: 接入真实后端 API - PUT /api/risk/alerts/batch/assign
  logger.debug('[API] batchAssignRiskAlerts', { alertIds, assignee });
  
  return {
    success: true,
    data: { assignedIds: alertIds },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 导出风险预警数据
 */
export async function exportRiskAlerts(
  params?: { hotelIds?: string[]; status?: string; type?: string }
): Promise<ApiResponse<{ downloadUrl: string }>> {
  await delay(800);
  
  // TODO: 接入真实后端 API - POST /api/risk/alerts/export
  // 后端应返回导出文件的下载链接
  logger.debug('[API] exportRiskAlerts', { params });
  
  return {
    success: true,
    data: { 
      downloadUrl: `/api/risk/alerts/export?timestamp=${Date.now()}` 
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 应用风险预测建议操作
 */
export async function applyPredictionAction(
  predictionId: string,
  action: string
): Promise<ApiResponse<{ predictionId: string; action: string }>> {
  await delay(600);
  
  // TODO: 接入真实后端 API - POST /api/risk/predictions/{predictionId}/actions
  console.log('[API] applyPredictionAction:', { predictionId, action });
  
  return {
    success: true,
    data: { predictionId, action },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 保存通知规则配置
 */
export async function saveNotificationRules(
  rules: Record<string, any>
): Promise<ApiResponse<{ saved: boolean }>> {
  await delay(500);
  
  // TODO: 接入真实后端 API - POST /api/risk/notification-rules
  console.log('[API] saveNotificationRules:', { rules });
  
  return {
    success: true,
    data: { saved: true },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取通知规则配置
 */
export async function getNotificationRules(): Promise<ApiResponse<Record<string, any>>> {
  await delay(300);
  
  // TODO: 接入真实后端 API - GET /api/risk/notification-rules
  console.log('[API] getNotificationRules');
  
  return {
    success: true,
    data: {},
    timestamp: new Date().toISOString(),
  };
}
