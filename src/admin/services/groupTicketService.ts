/**
 * 集团工单服务 - Phase 2 客户成功核心功能
 * 集团工单标记、优先级计算、批量处理
 */

import type { Ticket, Customer } from '../stores/adminStore';

// 集团工单优先级权重
const PRIORITY_WEIGHTS = {
  isGroupLevel: 100,        // 集团级工单基础加分
  urgentCount: 20,          // 每次催促加分
  highPriority: 50,         // 高优先级基础分
  mediumPriority: 30,       // 中优先级基础分
  lowPriority: 10,          // 低优先级基础分
  groupCustomer: 30,        // 集团客户加分
  expired: 200,             // 已过期客户加分
  expiringSoon: 100,        // 即将到期客户加分（7天内）
};

/**
 * 计算工单的综合优先级分数
 * 分数越高，处理优先级越高
 */
export function calculateTicketPriorityScore(
  ticket: Ticket,
  customer?: Customer
): number {
  let score = 0;
  
  // 1. 集团级工单基础加分
  if (ticket.isGroupLevel) {
    score += PRIORITY_WEIGHTS.isGroupLevel;
  }
  
  // 2. 集团客户加分
  if (ticket.customerType === 'group' || customer?.type === 'group') {
    score += PRIORITY_WEIGHTS.groupCustomer;
  }
  
  // 3. 原优先级权重
  switch (ticket.priority) {
    case 'urgent':
      score += PRIORITY_WEIGHTS.highPriority * 2;
      break;
    case 'high':
      score += PRIORITY_WEIGHTS.highPriority;
      break;
    case 'medium':
      score += PRIORITY_WEIGHTS.mediumPriority;
      break;
    case 'low':
      score += PRIORITY_WEIGHTS.lowPriority;
      break;
  }
  
  // 4. 催促次数加分
  if (ticket.urgentCount) {
    score += ticket.urgentCount * PRIORITY_WEIGHTS.urgentCount;
  }
  
  // 5. 客户续约状态加分
  if (customer) {
    const daysUntilExpire = Math.ceil(
      (new Date(customer.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpire < 0) {
      // 已过期
      score += PRIORITY_WEIGHTS.expired;
    } else if (daysUntilExpire <= 7) {
      // 7天内到期
      score += PRIORITY_WEIGHTS.expiringSoon;
    }
  }
  
  return score;
}

/**
 * 标记工单为集团级工单
 */
export function markAsGroupTicket(
  ticket: Ticket,
  customer: Customer,
  affectedHotelIds?: string[]
): Partial<Ticket> {
  return {
    customerId: customer.id,
    customerType: customer.type,
    isGroupLevel: true,
    affectedHotelIds: affectedHotelIds || customer.hotelIds,
    // 集团级工单自动提升优先级
    priority: ticket.priority === 'low' ? 'medium' : 
              ticket.priority === 'medium' ? 'high' : ticket.priority,
  };
}

/**
 * 自动识别可能的集团级工单
 * 基于工单标题和内容关键词
 */
export function detectPotentialGroupTicket(ticket: Ticket): boolean {
  const groupKeywords = [
    '集团', '总部', '统一', '批量', '全部', '所有门店',
    '政策', '策略', '规则', '标准', '流程',
    '多店', '连锁', '区域', '分店',
    '系统升级', '功能更新', '价格调整',
  ];
  
  const text = `${ticket.title} ${ticket.description}`.toLowerCase();
  return groupKeywords.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * 获取工单的显示标签
 */
export function getTicketBadges(ticket: Ticket): Array<{ text: string; color: string }> {
  const badges: Array<{ text: string; color: string }> = [];
  
  if (ticket.isGroupLevel) {
    badges.push({ text: '集团级', color: 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' });
  }
  
  if (ticket.customerType === 'group') {
    badges.push({ text: '集团客户', color: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30' });
  }
  
  if (ticket.urgentCount && ticket.urgentCount > 0) {
    badges.push({ text: `催x${ticket.urgentCount}`, color: 'bg-red-500/20 text-red-400 border-red-500/30' });
  }
  
  return badges;
}

/**
 * 排序工单（按优先级分数降序）
 */
export function sortTicketsByPriority(
  tickets: Ticket[],
  customers: Customer[]
): Array<Ticket & { priorityScore: number }> {
  const customerMap = new Map(customers.map(c => [c.id, c]));
  
  return tickets
    .map(ticket => {
      const customer = ticket.customerId ? customerMap.get(ticket.customerId) : undefined;
      const priorityScore = calculateTicketPriorityScore(ticket, customer);
      return { ...ticket, priorityScore };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * 批量更新集团工单状态
 */
export function batchUpdateGroupTickets(
  tickets: Ticket[],
  updates: Partial<Ticket>
): Ticket[] {
  return tickets.map(ticket => {
    if (ticket.isGroupLevel || ticket.customerType === 'group') {
      return { ...ticket, ...updates, updatedAt: new Date().toISOString() };
    }
    return ticket;
  });
}

/**
 * 获取集团工单统计
 */
export function getGroupTicketStats(tickets: Ticket[]) {
  const groupTickets = tickets.filter(t => t.isGroupLevel || t.customerType === 'group');
  
  return {
    total: groupTickets.length,
    open: groupTickets.filter(t => t.status === 'open').length,
    processing: groupTickets.filter(t => t.status === 'processing').length,
    urgent: groupTickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length,
    // 影响门店数
    affectedHotels: new Set(groupTickets.flatMap(t => t.affectedHotelIds || [])).size,
  };
}
