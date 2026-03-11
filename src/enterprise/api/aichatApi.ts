/**
 * AI 客服相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  ChatMessage,
  HandoffRequest,
  HandoffReason,
  CollabSession,
  SLAStats,
  AIEffectiveness,
  AgentPerformance,
  ChannelStats,
  TimeSeriesData,
  PaginationParams,
} from './types';
import {
  MOCK_MESSAGES,
  MOCK_HANDOFFS,
  MOCK_SESSIONS,
  MOCK_SLA_STATS,
  MOCK_AI_EFFECTIVENESS,
  MOCK_AGENT_PERFORMANCE,
  MOCK_CHANNEL_STATS,
  MOCK_TIME_SERIES,
} from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== 统一收件箱 ====================

/**
 * 获取消息列表
 */
export async function getMessages(
  params?: PaginationParams & { hotelId?: string; hotelIds?: string[]; channel?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<ChatMessage>>> {
  await delay();
  
  let list = [...MOCK_MESSAGES];
  
  if (params?.hotelIds && params.hotelIds.length > 0) {
    list = list.filter(m => params.hotelIds?.includes(m.hotelId || ''));
  } else if (params?.hotelId) {
    list = list.filter(m => m.hotelId === params.hotelId);
  }
  
  if (params?.channel) {
    list = list.filter(m => m.channel === params.channel);
  }
  
  if (params?.status) {
    list = list.filter(m => m.status === params.status);
  }
  
  // 按时间倒序
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
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
 * 发送消息
 */
export async function sendMessage(
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<ApiResponse<ChatMessage>> {
  await delay(500);
  
  const newMessage: ChatMessage = {
    ...message as any,
    id: `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  
  MOCK_MESSAGES.unshift(newMessage);
  
  return {
    success: true,
    data: newMessage,
    timestamp: new Date().toISOString(),
  };
}

// ==================== 人工转接 ====================

/**
 * 获取转接请求列表
 */
export async function getHandoffRequests(
  params?: PaginationParams & { status?: string; hotelIds?: string[] }
): Promise<ApiResponse<PaginatedResponse<HandoffRequest>>> {
  await delay();
  
  let list = [...MOCK_HANDOFFS];
  
  if (params?.hotelIds && params.hotelIds.length > 0) {
    list = list.filter(h => params.hotelIds?.includes(h.hotelId || ''));
  }
  
  if (params?.status) {
    list = list.filter(h => h.status === params.status);
  }
  
  // 按时间倒序
  list.sort((a, b) => new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime());
  
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
 * 接受转接请求
 */
export async function acceptHandoff(requestId: string, agentId: string, agentName: string): Promise<ApiResponse<HandoffRequest>> {
  await delay(300);
  
  const index = MOCK_HANDOFFS.findIndex(h => h.id === requestId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '转接请求不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_HANDOFFS[index] = {
    ...MOCK_HANDOFFS[index],
    status: 'accepted',
    assignedAgent: { id: agentId, name: agentName },
    acceptedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_HANDOFFS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 转人工处理
 */
export async function escalateToHuman(
  messageId: string,
  _hotelId?: string,
  _reason?: string
): Promise<ApiResponse<{ success: boolean; handoffId?: string }>> {
  await delay(300);
  
  // 找到消息
  const messageIndex = MOCK_MESSAGES.findIndex(m => m.id === messageId);
  if (messageIndex === -1) {
    return {
      success: false,
      data: { success: false },
      message: '消息不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 更新消息状态
  const message = MOCK_MESSAGES[messageIndex];
  MOCK_MESSAGES[messageIndex] = {
    ...message,
    status: 'human_handled',
    assignedTo: '当前客服',
  };
  
  // 创建转接请求记录
  const handoffId = `handoff-${Date.now()}`;
  const handoffRequest: HandoffRequest = {
    id: handoffId,
    guestName: message.guestName,
    hotelId: message.hotelId,
    hotelName: message.hotelName,
    channel: message.channel,
    reason: 'user_request' as HandoffReason,
    status: 'pending',
    originalMessage: message.content,
    aiSuggestion: message.aiSuggestion,
    priority: message.priority === 'high' ? 'high' : 'normal',
    createdAt: new Date(),
    slaDeadline: new Date(Date.now() + 5 * 60 * 1000), // 5分钟SLA
    tags: [],
  };
  
  MOCK_HANDOFFS.unshift(handoffRequest);
  
  return {
    success: true,
    data: { success: true, handoffId },
    timestamp: new Date().toISOString(),
  };
}

// ==================== 人机协作 ====================

/**
 * 获取协作会话列表
 */
export async function getCollabSessions(
  params?: PaginationParams & { status?: string; hotelIds?: string[] }
): Promise<ApiResponse<PaginatedResponse<CollabSession>>> {
  await delay();
  
  let list = [...MOCK_SESSIONS];
  
  if (params?.hotelIds && params.hotelIds.length > 0) {
    list = list.filter(s => params.hotelIds?.includes(s.hotelId || ''));
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
 * 获取会话详情
 */
export async function getCollabSessionDetail(sessionId: string): Promise<ApiResponse<CollabSession>> {
  await delay();
  
  const session = MOCK_SESSIONS.find(s => s.id === sessionId);
  
  if (!session) {
    return {
      success: false,
      data: null as any,
      message: '会话不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: session,
    timestamp: new Date().toISOString(),
  };
}

// ==================== 数据看板 ====================

/**
 * 获取 SLA 统计
 */
export async function getSLAStats(): Promise<ApiResponse<SLAStats>> {
  await delay();
  
  return {
    success: true,
    data: MOCK_SLA_STATS,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取 AI 效果统计
 */
export async function getAIEffectiveness(): Promise<ApiResponse<AIEffectiveness>> {
  await delay();
  
  return {
    success: true,
    data: MOCK_AI_EFFECTIVENESS,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取客服绩效列表
 */
export async function getAgentPerformance(): Promise<ApiResponse<AgentPerformance[]>> {
  await delay();
  
  return {
    success: true,
    data: MOCK_AGENT_PERFORMANCE,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取渠道统计
 */
export async function getChannelStats(): Promise<ApiResponse<ChannelStats[]>> {
  await delay();
  
  return {
    success: true,
    data: MOCK_CHANNEL_STATS,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取时间序列数据
 */
export async function getTimeSeriesData(days: number = 7): Promise<ApiResponse<TimeSeriesData[]>> {
  await delay();
  
  // 返回最近几天的数据
  const data = MOCK_TIME_SERIES.slice(-days);
  
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取客服看板汇总数据
 */
export async function getAIDashboardSummary(
  hotelIds?: string[],
  days: number = 7
): Promise<ApiResponse<{
  sla: SLAStats;
  aiEffectiveness: AIEffectiveness;
  agentPerformance: AgentPerformance[];
  channelStats: ChannelStats[];
  timeSeries: TimeSeriesData[];
}>> {
  await delay();
  
  // 根据hotelIds筛选消息数据（模拟）
  let filteredMessages = [...MOCK_MESSAGES];
  if (hotelIds && hotelIds.length > 0) {
    filteredMessages = filteredMessages.filter(m => hotelIds.includes(m.hotelId || ''));
  }
  
  // 根据天数生成不同的统计数据
  const multiplier = days / 7; // 基于7天数据的倍数
  const adjustedSLA: SLAStats = {
    ...MOCK_SLA_STATS,
    totalRequests: Math.floor(MOCK_SLA_STATS.totalRequests * multiplier),
    withinSLA: Math.floor(MOCK_SLA_STATS.withinSLA * multiplier),
    breachedSLA: Math.floor(MOCK_SLA_STATS.breachedSLA * multiplier),
  };
  
  // 生成对应天数的时间序列数据（使用固定种子确保数据稳定）
  const adjustedTimeSeries: TimeSeriesData[] = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateStr = date.toISOString().split('T')[0];
    // 使用日期作为种子生成固定随机数，确保同一日期数据不变
    const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (offset: number) => ((seed + offset) * 9301 + 49297) % 233280 / 233280;
    
    const baseMessages = days === 1 ? 80 : days === 30 ? 300 : days === 90 ? 800 : 50;
    const variation = Math.floor(pseudoRandom(1) * 50);
    return {
      date: dateStr,
      totalMessages: baseMessages + variation,
      aiHandled: Math.floor((baseMessages + variation) * 0.75),
      humanHandled: Math.floor((baseMessages + variation) * 0.25),
      slaBreaches: Math.floor(pseudoRandom(2) * 3),
    };
  });
  
  return {
    success: true,
    data: {
      sla: adjustedSLA,
      aiEffectiveness: MOCK_AI_EFFECTIVENESS,
      agentPerformance: MOCK_AGENT_PERFORMANCE,
      channelStats: MOCK_CHANNEL_STATS,
      timeSeries: adjustedTimeSeries,
    },
    timestamp: new Date().toISOString(),
  };
}
