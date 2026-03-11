/**
 * useTicketSync - 工单同步 Hook
 * 
 * 在酒店端使用：监听管理端的工单更新
 * 在管理端使用：监听酒店端的工单操作
 */

import { useEffect, useCallback } from 'react';
import { getHotelTicketSync, getAdminTicketSync, type SyncMessage } from '@/services/ticketSync';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { useAdminStore } from '@/admin/stores/adminStore';
import type { Ticket } from '@/types';

// ==================== 酒店端使用 ====================

/**
 * 酒店端：监听管理端的工单操作
 */
export function useHotelTicketSync() {
  const { 
    tickets, 
    updateTicket, 
    addTicketMessage, 
    addTicket
  } = useUnifiedStore();

  useEffect(() => {
    const syncService = getHotelTicketSync();

    const unsubscribe = syncService.subscribe((message: SyncMessage) => {
      switch (message.type) {
        case 'TICKET_UPDATED':
          // 管理端更新了工单状态
          updateTicket(message.ticketId, message.updates);
          break;

        case 'TICKET_MESSAGE':
          // 管理端回复了消息
          // 检查该消息是否已存在（避免重复）
          const existingTicket = tickets.find(t => t.id === message.ticketId);
          if (existingTicket) {
            const messageExists = existingTicket.messages.some(
              m => m.id === message.message.id
            );
            if (!messageExists) {
              addTicketMessage(message.ticketId, {
                sender: message.message.sender,
                senderName: message.message.senderName,
                content: message.message.content,
              });
            }
          }
          break;

        case 'TICKET_ASSIGNED':
          // 管理端分配了负责人
          updateTicket(message.ticketId, {
            assignedTo: message.assignedTo,
            assignedToName: message.assignedToName,
            status: 'processing',
            updatedAt: new Date().toISOString(),
          });
          break;

        case 'TICKET_READ':
          // 管理端已读
          updateTicket(message.ticketId, {
            readByAdminAt: message.readAt,
            lastReadAt: message.readAt,
          });
          break;

        case 'SYNC_REQUEST':
          // 管理端请求同步，发送当前工单列表
          syncService.respondSync(tickets);
          break;

        case 'SYNC_RESPONSE':
          // 收到管理端的工单列表，合并到本地（管理端数据为准）
          // 通常酒店端不需要合并管理端的所有工单，只在必要时处理
          break;
      }
    });

    // 组件挂载时请求同步
    syncService.requestSync();

    return () => {
      unsubscribe();
    };
  }, [tickets, updateTicket, addTicketMessage, addTicket]);
}

// ==================== 管理端使用 ====================

/**
 * 管理端：监听酒店端的工单操作
 */
export function useAdminTicketSync() {
  const { 
    tickets, 
    updateTicket, 
    setTickets, 
    addNotification 
  } = useAdminStore();

  const handleNewTicket = useCallback((ticket: Ticket) => {
    // 检查工单是否已存在
    const exists = tickets.some(t => t.id === ticket.id);
    if (!exists) {
      // 添加新工单到列表
      setTickets([ticket, ...tickets]);
      
      // 显示通知
      addNotification({
        id: `new-ticket-${ticket.id}`,
        type: 'info',
        title: '新工单',
        message: `${ticket.hotelName}: ${ticket.title}`,
        hotelId: ticket.hotelId,
        createdAt: new Date().toISOString(),
        read: false,
      });

      // 播放提示音（如果浏览器支持）
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // 自动播放被阻止，忽略错误
        });
      } catch {
        // 浏览器不支持音频播放
      }
    }
  }, [tickets, setTickets, addNotification]);

  useEffect(() => {
    const syncService = getAdminTicketSync();

    const unsubscribe = syncService.subscribe((message: SyncMessage) => {
      switch (message.type) {
        case 'TICKET_CREATED':
          // 酒店端或集团端新建工单
          handleNewTicket(message.ticket);
          
          // 如果是集团工单，添加特殊标记
          if (message.ticket.source === 'manual' && message.ticket.isGroupLevel) {
            addNotification({
              id: `group-ticket-${message.ticket.id}`,
              type: 'warning',
              title: '收到集团工单',
              message: `集团提交了工单: ${message.ticket.title}`,
              hotelId: message.ticket.hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
          break;

        case 'TICKET_UPDATED':
          // 酒店端更新了工单
          updateTicket(message.ticketId, message.updates);
          break;

        case 'TICKET_MESSAGE':
          // 酒店端发送了消息
          const existingTicket = tickets.find(t => t.id === message.ticketId);
          if (existingTicket) {
            const messageExists = existingTicket.messages.some(
              m => m.id === message.message.id
            );
            if (!messageExists) {
              // 合并消息到工单
              const updatedMessages = [...existingTicket.messages, message.message];
              updateTicket(message.ticketId, {
                messages: updatedMessages,
                updatedAt: new Date().toISOString(),
              });

              // 显示新消息通知
              addNotification({
                id: `new-msg-${message.message.id}`,
                type: 'info',
                title: '新回复',
                message: `${existingTicket.hotelName}: ${message.message.content.slice(0, 50)}...`,
                hotelId: existingTicket.hotelId,
                createdAt: new Date().toISOString(),
                read: false,
              });
            }
          }
          break;

        case 'TICKET_RESOLVED':
          // 酒店端评价/解决了工单
          updateTicket(message.ticketId, {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            ...message.data,
          });
          break;

        case 'SYNC_REQUEST':
          // 酒店端请求同步，发送当前工单列表
          syncService.respondSync(tickets);
          break;

        case 'SYNC_RESPONSE':
          // 收到酒店端的工单列表，合并新工单
          message.tickets?.forEach((ticket: Ticket) => {
            if (!tickets.some(t => t.id === ticket.id)) {
              handleNewTicket(ticket);
            }
          });
          break;
      }
    });

    // 组件挂载时请求同步
    syncService.requestSync();

    return () => {
      unsubscribe();
    };
  }, [tickets, updateTicket, setTickets, addNotification, handleNewTicket]);
}

export default { useHotelTicketSync, useAdminTicketSync };
