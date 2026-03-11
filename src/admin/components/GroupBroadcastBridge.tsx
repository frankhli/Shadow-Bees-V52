/**
 * Shadow-Bees V52 - 管理端集团广播桥接
 * 在管理端查看集团时，通过 BroadcastChannel 同步到集团端
 */

import { useEffect, useCallback } from 'react';
import { channelManager, useChannelMessage } from '@/shared/channel';
import type { GroupSelectPayload } from '@/shared/channel';
import type { Customer } from '../stores/adminStore';

interface GroupBroadcastBridgeProps {
  /** 当前查看的客户 (集团类型) */
  customer: Customer | null;
  /** 是否开启同步 */
  enabled?: boolean;
  /** 同步模式: 'auto'(自动) | 'manual'(手动) | 'focus'(仅聚焦) */
  mode?: 'auto' | 'manual' | 'focus';
  /** 当收到集团端响应时的回调 */
  onGroupResponse?: (groupId: string, isActive: boolean) => void;
}

/**
 * GroupBroadcastBridge - 集团广播桥接组件
 * 
 * 使用方式:
 * 1. 嵌入到 GroupDetailDrawer 中
 * 2. 当管理员打开集团详情时，自动广播 GROUP_SELECT 消息
 * 3. 集团端监听此消息，自动切换到对应集团视图
 */
export function GroupBroadcastBridge({
  customer,
  enabled = true,
  mode = 'auto',
  onGroupResponse,
}: GroupBroadcastBridgeProps) {
  
  // 监听集团端的响应
  useChannelMessage<GroupSelectPayload>('GROUP_FOCUS', (payload) => {
    if (onGroupResponse && payload.groupId === customer?.id) {
      onGroupResponse(payload.groupId, true);
    }
  });

  // 广播集团选择
  const broadcastGroupSelect = useCallback(() => {
    if (!customer || !enabled) return;
    if (customer.type !== 'group') return;

    const payload: GroupSelectPayload = {
      groupId: customer.id,
      groupName: customer.companyName,
      action: mode === 'focus' ? 'focus' : 'view',
      sourcePage: window.location.pathname,
      context: {
        customerId: customer.id,
        regionCount: new Set(customer.hotels.map(h => h.city || '默认区域')).size,
        hotelCount: customer.hotels.length,
      },
    };

    const messageId = channelManager.send('GROUP_SELECT', payload, {
      groupId: customer.id,
      userId: 'admin_user', // TODO: 从 auth store 获取
    });

    console.log('[GroupBroadcastBridge] Broadcasted GROUP_SELECT:', {
      messageId,
      groupId: customer.id,
      groupName: customer.companyName,
    });

    return messageId;
  }, [customer, enabled, mode]);

  // 当客户变化且模式为 auto 时，自动广播
  useEffect(() => {
    if (mode === 'auto' && customer) {
      broadcastGroupSelect();
    }
  }, [customer?.id, mode, broadcastGroupSelect]);

  return null; // 这是一个逻辑组件，不渲染任何 UI
}

/**
 * 手动触发集团同步的 Hook
 */
export function useGroupBroadcast() {
  const syncGroup = useCallback((customer: Customer, action: GroupSelectPayload['action'] = 'view') => {
    if (customer.type !== 'group') {
      console.warn('[useGroupBroadcast] Only group customers can be synced');
      return null;
    }

    const payload: GroupSelectPayload = {
      groupId: customer.id,
      groupName: customer.companyName,
      action,
      sourcePage: window.location.pathname,
      context: {
        customerId: customer.id,
        hotelCount: customer.hotels.length,
        regionCount: new Set(customer.hotels.map((h: { city?: string }) => h.city || '默认区域')).size,
      },
    };

    return channelManager.send('GROUP_SELECT', payload, {
      groupId: customer.id,
    });
  }, []);

  const focusGroup = useCallback((groupId: string, groupName: string) => {
    return channelManager.send('GROUP_FOCUS', {
      groupId,
      groupName,
      action: 'focus',
    }, { groupId });
  }, []);

  return { syncGroup, focusGroup };
}

/**
 * 监听集团端活动的 Hook
 */
export function useGroupActivityListener(callback?: (groupId: string, isActive: boolean) => void) {
  useChannelMessage<GroupSelectPayload>('GROUP_SELECT', (payload) => {
    console.log('[useGroupActivityListener] Group activity detected:', payload);
    if (callback) {
      callback(payload.groupId, payload.action === 'focus');
    }
  });
}
