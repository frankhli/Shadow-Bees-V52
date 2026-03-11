/**
 * 数据仓库同步 Hook
 * 
 * 负责将酒店端业务数据同步到管理端数据仓库：
 * - 订单数据（给定价算法、客户健康度）
 * - 内容数据（给内容监控、渠道效能）
 * - 改价事件（给定价洞察算法）
 * 
 * 设计原则：
 * 1. 酒店端主动广播，管理端被动接收
 * 2. 单向同步，管理端不干预酒店端操作
 * 3. 数据仓库只存储，不触发业务逻辑（异常检测由管理端独立计算）
 */

import { useEffect } from 'react';
import { getAdminSync, type UnifiedSyncMessage } from '@/services/unifiedSync';
import { useAdminStore, type Order } from '@/admin/stores/adminStore';


// ==================== 酒店端：广播数据变更 ====================

/**
 * 酒店端：订单创建后广播到管理端
 */
export function useHotelOrderSync() {
  // 酒店端不需要监听订单同步，只需要在创建订单时广播
  // 这个 hook 用于初始化同步服务
  useEffect(() => {
    // 预留：未来可以在这里添加订单状态变更的监听
    return () => {};
  }, []);
}

/**
 * 酒店端：内容发布后广播到管理端
 */
export function useHotelContentSync() {
  useEffect(() => {
    return () => {};
  }, []);
}

// ==================== 管理端：接收数据同步 ====================

/**
 * 管理端：接收酒店端数据同步
 * 同步订单、内容、改价事件到数据仓库
 */
export function useAdminDataSync() {
  const { 
    orders,
    setOrders,
    contentItems,
    setContentItems,
    addNotification,
    hotels 
  } = useAdminStore();

  useEffect(() => {
    const syncService = getAdminSync();

    const unsubscribe = syncService.subscribe((message: UnifiedSyncMessage) => {
      // 只处理来自酒店端的消息
      if (message.source !== 'hotel') return;

      switch (message.type) {
        case 'ORDER_CREATED': {
          const { order, hotelId, hotelName } = message as any;
          console.log('[Admin] Received ORDER_CREATED:', order.id, order.guestName, order.guestPhone);
          
          // 转换酒店端 Transaction 为管理端 Order 格式
          const newOrder: Order = {
            id: order.id,
            hotelId: hotelId,
            hotelName: hotelName || hotels.find(h => h.id === hotelId)?.name || '未知酒店',
            platform: order.platform,
            roomType: order.roomType,
            guestName: order.guestName || '未知客人',
            guestPhone: order.guestPhone,
            price: order.price,
            status: order.status,
            createdAt: order.timestamp || new Date().toISOString(),
            checkInDate: order.checkInDate || '',
            checkOutDate: order.checkOutDate || '',
            source: order.platform === 'ota' ? 'ota' : 'system',
            syncedAt: Date.now(),
            syncedFrom: hotelId,
          };

          // 检查是否已存在（去重）
          const exists = orders.some(o => o.id === newOrder.id);
          if (!exists) {
            setOrders([newOrder, ...orders]);
            
            // 可选：新订单通知（仅大额订单）
            if (newOrder.price > 1000) {
              addNotification({
                id: `order-${newOrder.id}`,
                type: 'info',
                title: '大额订单',
                message: `${newOrder.hotelName} 产生 ¥${newOrder.price} 订单`,
                hotelId: newOrder.hotelId,
                createdAt: new Date().toISOString(),
                read: false,
              });
            }
          }
          break;
        }

        // Note: CONTENT_PUBLISHED 消息类型已从 UnifiedSyncMessage 中移除
        // 内容发布请使用 CONTENT_SUBMITTED 消息类型
        // case 'CONTENT_PUBLISHED': { ... }

        case 'CONTENT_STATS_UPDATED': {
          // 内容数据更新（曝光、点击、咨询、转化）
          const { contentId, hotelId: _hotelId, stats } = message as any;
          
          const contentIndex = contentItems.findIndex(c => c.id === contentId);
          if (contentIndex >= 0) {
            const updatedContent = [...contentItems];
            updatedContent[contentIndex] = {
              ...updatedContent[contentIndex],
              stats: {
                ...updatedContent[contentIndex].stats,
                impressions: stats.impressions,
                clicks: stats.clicks,
                inquiries: stats.inquiries,
                conversions: stats.conversions,
                updateTime: new Date().toISOString(),
              },
            };
            setContentItems(updatedContent);
          }
          break;
        }

        // Note: PRICE_CHANGED 消息类型已从 UnifiedSyncMessage 中移除
        // 价格变更请通过其他方式同步
        // case 'PRICE_CHANGED': { ... }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [orders, setOrders, contentItems, setContentItems, addNotification, hotels]);
}

// ==================== 统一导出 ====================

export default {
  useHotelOrderSync,
  useHotelContentSync,
  useAdminDataSync,
};
