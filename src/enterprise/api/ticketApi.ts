/**
 * 工单相关API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Ticket,
  TicketComment,
  TicketStatus,
  TicketPriority,
  PaginationParams,
  FilterParams,
} from './types';
import { MOCK_TICKETS } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// 内存缓存
const ticketCache: Map<string, Ticket> = new Map();

// 初始化
function initCache() {
  if (ticketCache.size === 0) {
    MOCK_TICKETS.forEach(ticket => {
      ticketCache.set(ticket.id, ticket);
    });
  }
}

/**
 * 获取工单列表
 */
export async function getTickets(
  params?: PaginationParams & FilterParams & { hotelId?: string; status?: TicketStatus; priority?: TicketPriority }
): Promise<ApiResponse<PaginatedResponse<Ticket>>> {
  await delay();
  initCache();
  
  let list = Array.from(ticketCache.values());
  
  if (params?.hotelId) {
    list = list.filter(t => t.hotelId === params.hotelId);
  }
  
  if (params?.status) {
    list = list.filter(t => t.status === params.status);
  }
  
  if (params?.priority) {
    list = list.filter(t => t.priority === params.priority);
  }
  
  if (params?.type) {
    list = list.filter(t => t.type === params.type);
  }
  
  // 按优先级和创建时间排序
  list.sort((a, b) => {
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  // 分页
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
 * 获取工单详情
 */
export async function getTicketDetail(ticketId: string): Promise<ApiResponse<Ticket>> {
  await delay();
  initCache();
  
  const ticket = ticketCache.get(ticketId);
  if (!ticket) {
    return {
      success: false,
      data: null as any,
      message: '工单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: ticket,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建工单
 */
export async function createTicket(
  data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'comments'>
): Promise<ApiResponse<Ticket>> {
  await delay(500);
  
  const newTicket: Ticket = {
    ...data,
    id: `ticket-${Date.now()}`,
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  ticketCache.set(newTicket.id, newTicket);
  
  return {
    success: true,
    data: newTicket,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新工单状态
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  assignedTo?: string
): Promise<ApiResponse<Ticket>> {
  await delay(300);
  initCache();
  
  const ticket = ticketCache.get(ticketId);
  if (!ticket) {
    return {
      success: false,
      data: null as any,
      message: '工单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  const updated: Ticket = {
    ...ticket,
    status,
    ...(assignedTo && { assignedTo }),
    updatedAt: new Date().toISOString(),
    ...(status === 'resolved' && { resolvedAt: new Date().toISOString() }),
  };
  
  ticketCache.set(ticketId, updated);
  
  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 添加工单评论
 */
export async function addTicketComment(
  ticketId: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<ApiResponse<TicketComment>> {
  await delay(300);
  initCache();
  
  const ticket = ticketCache.get(ticketId);
  if (!ticket) {
    return {
      success: false,
      data: null as any,
      message: '工单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  const comment: TicketComment = {
    id: `cmt-${Date.now()}`,
    ticketId,
    content,
    authorId,
    authorName,
    createdAt: new Date().toISOString(),
  };
  
  ticket.comments.push(comment);
  ticket.updatedAt = new Date().toISOString();
  
  ticketCache.set(ticketId, ticket);
  
  return {
    success: true,
    data: comment,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取工单统计
 */
export async function getTicketStats(
  hotelId?: string
): Promise<ApiResponse<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
  overdue: number;
}>> {
  await delay();
  initCache();
  
  let list = Array.from(ticketCache.values());
  if (hotelId) {
    list = list.filter(t => t.hotelId === hotelId);
  }
  
  // SLA配置（小时）
  const SLA_HOURS: Record<string, number> = {
    urgent: 2, high: 8, medium: 24, low: 72,
  };
  
  const now = Date.now();
  const overdueCount = list.filter(t => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    const hoursElapsed = (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursElapsed > SLA_HOURS[t.priority];
  }).length;
  
  return {
    success: true,
    data: {
      total: list.length,
      open: list.filter(t => t.status === 'open').length,
      inProgress: list.filter(t => t.status === 'in_progress').length,
      resolved: list.filter(t => t.status === 'resolved').length,
      urgent: list.filter(t => t.priority === 'urgent').length,
      overdue: overdueCount,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 催单
 */
export async function urgeTicket(ticketId: string): Promise<ApiResponse<{ urgeCount: number }>> {
  await delay(300);
  initCache();
  
  const ticket = ticketCache.get(ticketId);
  if (!ticket) {
    return {
      success: false,
      data: null as any,
      message: '工单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  const currentCount = (ticket as any).urgeCount || 0;
  if (currentCount >= 3) {
    return {
      success: false,
      data: null as any,
      message: '该工单已催促3次，请勿重复催促',
      timestamp: new Date().toISOString(),
    };
  }
  
  (ticket as any).urgeCount = currentCount + 1;
  ticket.updatedAt = new Date().toISOString();
  ticketCache.set(ticketId, ticket);
  
  return {
    success: true,
    data: { urgeCount: (ticket as any).urgeCount },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 分配工单
 */
export async function assignTicket(
  ticketId: string,
  assignee: string
): Promise<ApiResponse<Ticket>> {
  await delay(300);
  initCache();
  
  const ticket = ticketCache.get(ticketId);
  if (!ticket) {
    return {
      success: false,
      data: null as any,
      message: '工单不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  const updated: Ticket = {
    ...ticket,
    assignedTo: assignee,
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  };
  
  ticketCache.set(ticketId, updated);
  
  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}
