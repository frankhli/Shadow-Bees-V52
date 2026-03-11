/**
 * 定价策略相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  PricingStrategy,
  PricingSuggestion,
  PaginationParams,
} from './types';
import { MOCK_STRATEGIES, MOCK_SUGGESTIONS } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取定价策略列表
 */
export async function getPricingStrategies(
  params?: PaginationParams & { status?: string; type?: string }
): Promise<ApiResponse<PaginatedResponse<PricingStrategy>>> {
  await delay();
  
  let list = [...MOCK_STRATEGIES];
  
  if (params?.status) {
    list = list.filter(s => s.status === params.status);
  }
  
  if (params?.type) {
    list = list.filter(s => s.type === params.type);
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
 * 获取策略详情
 */
export async function getStrategyDetail(strategyId: string): Promise<ApiResponse<PricingStrategy>> {
  await delay();
  
  const strategy = MOCK_STRATEGIES.find(s => s.id === strategyId);
  
  if (!strategy) {
    return {
      success: false,
      data: null as any,
      message: '策略不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: strategy,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建定价策略
 */
export async function createStrategy(
  data: Omit<PricingStrategy, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<PricingStrategy>> {
  await delay(500);
  
  const newStrategy: PricingStrategy = {
    ...data as any,
    id: `strategy-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  MOCK_STRATEGIES.unshift(newStrategy);
  
  return {
    success: true,
    data: newStrategy,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新定价策略
 */
export async function updateStrategy(
  strategyId: string,
  data: Partial<PricingStrategy>
): Promise<ApiResponse<PricingStrategy>> {
  await delay(300);
  
  const index = MOCK_STRATEGIES.findIndex(s => s.id === strategyId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '策略不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_STRATEGIES[index] = {
    ...MOCK_STRATEGIES[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_STRATEGIES[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 删除定价策略
 */
export async function deleteStrategy(strategyId: string): Promise<ApiResponse<void>> {
  await delay(300);
  
  const index = MOCK_STRATEGIES.findIndex(s => s.id === strategyId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '策略不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_STRATEGIES.splice(index, 1);
  
  return {
    success: true,
    data: undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新策略状态
 */
export async function updateStrategyStatus(
  strategyId: string,
  status: 'active' | 'inactive' | 'expired'
): Promise<ApiResponse<PricingStrategy>> {
  await delay(300);
  
  const index = MOCK_STRATEGIES.findIndex(s => s.id === strategyId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '策略不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_STRATEGIES[index] = {
    ...MOCK_STRATEGIES[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_STRATEGIES[index],
    timestamp: new Date().toISOString(),
  };
}

// ==================== 定价建议 ====================

/**
 * 获取定价建议列表
 */
export async function getPricingSuggestions(
  params?: PaginationParams & { hotelId?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<PricingSuggestion>>> {
  await delay();
  
  let list = [...MOCK_SUGGESTIONS];
  
  if (params?.hotelId) {
    list = list.filter(s => s.hotelId === params.hotelId);
  }
  
  if (params?.status) {
    list = list.filter(s => s.status === params.status);
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
 * 应用定价建议
 */
export async function applySuggestion(
  suggestionId: string
): Promise<ApiResponse<PricingSuggestion>> {
  await delay(500);
  
  const index = MOCK_SUGGESTIONS.findIndex(s => s.id === suggestionId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '建议不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_SUGGESTIONS[index] = {
    ...MOCK_SUGGESTIONS[index],
    status: 'executed',
    execution: {
      executedAt: new Date().toISOString(),
      executedBy: 'huamei_operator',
    },
  };
  
  return {
    success: true,
    data: MOCK_SUGGESTIONS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 忽略定价建议
 */
export async function ignoreSuggestion(
  suggestionId: string
): Promise<ApiResponse<PricingSuggestion>> {
  await delay(300);
  
  const index = MOCK_SUGGESTIONS.findIndex(s => s.id === suggestionId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '建议不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_SUGGESTIONS[index] = {
    ...MOCK_SUGGESTIONS[index],
    status: 'hotel_rejected',
    hotelFeedback: {
      action: 'reject',
      message: '酒店拒绝此建议',
      respondedAt: new Date().toISOString(),
    },
  };
  
  return {
    success: true,
    data: MOCK_SUGGESTIONS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 生成定价建议
 */
export async function generateSuggestions(hotelIds?: string[]): Promise<ApiResponse<PricingSuggestion[]>> {
  await delay(1000);
  
  const suggestionTypes: Array<'holiday' | 'event' | 'daily' | 'competitor_response'> = ['holiday', 'event', 'daily', 'competitor_response'];
  const engagementLevels: Array<'hands_off' | 'notify' | 'confirm' | 'negotiate' | 'diy'> = ['hands_off', 'notify', 'confirm', 'negotiate', 'diy'];
  const hotelNames: Record<string, string> = {
    'hotel-001': '上海外滩店',
    'hotel-002': '北京国贸店',
    'hotel-003': '杭州西湖店',
    'hotel-004': '深圳南山店',
    'hotel-005': '广州天河店',
  };
  
  // 模拟生成新建议
  const newSuggestions: PricingSuggestion[] = hotelIds?.map((hotelId, index) => {
    const basePrice = 400 + Math.floor(Math.random() * 300);
    const increasePercent = Math.floor(Math.random() * 30) - 5; // -5% to +25%
    const suggestedPrice = Math.round(basePrice * (1 + increasePercent / 100));
    const type = suggestionTypes[Math.floor(Math.random() * suggestionTypes.length)];
    const engagementLevel = engagementLevels[Math.floor(Math.random() * engagementLevels.length)];
    
    return {
      id: `new-suggestion-${Date.now()}-${index}`,
      name: `${hotelNames[hotelId] || '未知酒店'} - ${type === 'holiday' ? '节假日' : type === 'event' ? '事件驱动' : type === 'daily' ? '日常优化' : '竞品响应'}调价建议`,
      type,
      hotelId,
      hotelName: hotelNames[hotelId] || '未知酒店',
      engagementLevel,
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      rules: {
        basePrice,
        suggestedPrice,
        increasePercent,
        maxPremium: Math.floor(basePrice * 0.3),
        reasoning: '基于竞品分析和需求预测，建议调整定价以优化收益',
      },
      expectedImpact: {
        revenueIncrease: Math.floor(Math.random() * 20000) - 5000,
        occupancyImpact: Math.floor(Math.random() * 20) - 5,
        confidence: 70 + Math.floor(Math.random() * 25),
      },
      status: 'pending',
    };
  }) || [];
  
  MOCK_SUGGESTIONS.unshift(...newSuggestions);
  
  return {
    success: true,
    data: newSuggestions,
    timestamp: new Date().toISOString(),
  };
}
