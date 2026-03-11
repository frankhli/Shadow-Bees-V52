/**
 * useRefundSync - 退款同步 Hook
 * 
 * 业务流程：
 * - 用户在闲鱼/微信/小红书申请退款
 * - 酒店端直接处理退款（同意/拒绝）
 * - 处理结果单向同步到管理端（仅用于监控）
 * 
 * 管理端不干预退款审批，只做记录和统计
 */

import { useEffect } from 'react';
import { getAdminRefundSync, type RefundSyncMessage } from '@/services/refundSync';

import { useAdminStore } from '@/admin/stores/adminStore';


// ==================== 酒店端使用 ====================

/**
 * 酒店端：退款同步 Hook
 * 
 * 注意：退款由酒店自主处理，不需要接收管理端消息
 * 酒店端只需在退款状态变更时广播到管理端
 */
export function useHotelRefundSync() {
  // 酒店端不需要监听退款同步消息
  // 因为退款由酒店自主处理，平台不干预
  useEffect(() => {
    // 预留：未来如果需要接收平台消息（如退款政策更新）可以在这里添加
    return () => {};
  }, []);
}

// ==================== 管理端使用 ====================

/**
 * 管理端：监听酒店端的退款处理结果
 * 
 * 管理端仅用于监控，不干预审批流程
 */
export function useAdminRefundSync() {
  const { 
    syncRefundFromHotel,
    addNotification,
  } = useAdminStore();

  useEffect(() => {
    const syncService = getAdminRefundSync();

    const unsubscribe = syncService.subscribe((message: RefundSyncMessage) => {
      // 只处理来自酒店端的消息
      if (message.source !== 'hotel') return;

      switch (message.type) {
        case 'REFUND_REQUESTED':
          // 酒店端提交退款申请（用户在平台申请后，酒店端录入）
          syncRefundFromHotel(message.refund);
          break;
        
        case 'REFUND_STATUS_UPDATED':
          // 酒店端更新退款状态（同意/拒绝/完成）
          syncRefundFromHotel(message.refund);
          
          // 显示状态更新通知
          if (message.refund.status === 'approved') {
            addNotification({
              id: `refund-approved-${message.refund.id}`,
              type: 'info',
              title: '退款已同意',
              message: `${message.refund.hotelName}: 已同意 ${message.refund.customerName} 的退款申请`,
              hotelId: message.refund.hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          } else if (message.refund.status === 'rejected') {
            addNotification({
              id: `refund-rejected-${message.refund.id}`,
              type: 'warning',
              title: '退款已拒绝',
              message: `${message.refund.hotelName}: 已拒绝 ${message.refund.customerName} 的退款申请`,
              hotelId: message.refund.hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          } else if (message.refund.status === 'completed') {
            addNotification({
              id: `refund-completed-${message.refund.id}`,
              type: 'success',
              title: '退款已完成',
              message: `${message.refund.hotelName}: ${message.refund.customerName} 的退款已处理完成`,
              hotelId: message.refund.hotelId,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncRefundFromHotel, addNotification]);
}

// 保持向后兼容的导出
export const useRefundSync = useHotelRefundSync;

export default { useHotelRefundSync, useAdminRefundSync, useRefundSync };
