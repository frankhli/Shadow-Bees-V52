/**
 * Shadow-Bees V52 - 集团端频道接收器
 * 接收来自管理端的 BroadcastChannel 消息，自动同步视图
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { channelManager, useChannelMessage } from '@/shared/channel';
import { useGroupStore } from '../stores/groupStore';
import type { GroupSelectPayload, HotelSelectPayload } from '@/shared/channel';
import { toast } from '@/components/ux';

interface GroupChannelReceiverProps {
  /** 是否启用接收 */
  enabled?: boolean;
  /** 自动导航模式 */
  autoNavigate?: boolean;
  /** 显示通知 */
  showNotification?: boolean;
}

/**
 * GroupChannelReceiver - 集团端频道接收器
 * 
 * 功能:
 * 1. 接收管理端的 GROUP_SELECT 消息
 * 2. 自动切换到对应集团视图
 * 3. 显示同步状态通知
 * 4. 向管理端响应确认
 */
export function GroupChannelReceiver({
  enabled = true,
  autoNavigate = true,
  showNotification = true,
}: GroupChannelReceiverProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentGroup } = useGroupStore();
  
  const [lastSync, setLastSync] = useState<{
    groupId: string;
    timestamp: number;
    source: string;
  } | null>(null);

  const [isAdminViewing, setIsAdminViewing] = useState(false);

  // 处理集团选择消息
  const handleGroupSelect = useCallback((payload: GroupSelectPayload) => {
    if (!enabled) return;

    console.log('[GroupChannelReceiver] Received GROUP_SELECT:', payload);

    // 更新同步状态
    setLastSync({
      groupId: payload.groupId,
      timestamp: Date.now(),
      source: payload.sourcePage || 'admin',
    });

    // 检查是否是当前集团
    const isCurrentGroup = currentGroup?.id === payload.groupId;
    setIsAdminViewing(true);

    // 显示通知
    if (showNotification) {
      if (isCurrentGroup) {
        toast.info(
          '管理端正在查看此集团',
          `来源: ${payload.sourcePage || '管理后台'}`,
          { duration: 3000 }
        );
      } else {
        toast.warning(
          '管理端切换到其他集团',
          `当前查看: ${payload.groupName}`,
          { duration: 5000 }
        );
      }
    }

    // 自动导航到对应页面
    if (autoNavigate && !isCurrentGroup) {
      // 如果集团ID不匹配，可以在这里处理切换逻辑
      // 目前集团端是单集团模式，所以主要是提示
      console.log('[GroupChannelReceiver] Admin is viewing different group:', payload.groupName);
    }

    // 向管理端发送确认响应
    channelManager.send('GROUP_FOCUS', {
      groupId: payload.groupId,
      groupName: payload.groupName,
      action: 'focus',
      context: {
        isCurrentGroup,
        currentPath: location.pathname,
      },
    }, {
      groupId: payload.groupId,
      correlationId: payload.groupId, // 用于管理端匹配响应
    });

  }, [enabled, autoNavigate, showNotification, currentGroup, location.pathname]);

  // 处理酒店选择消息
  const handleHotelSelect = useCallback((payload: HotelSelectPayload) => {
    if (!enabled) return;

    console.log('[GroupChannelReceiver] Received HOTEL_SELECT:', payload);

    // 检查是否属于当前集团
    if (payload.groupId !== currentGroup?.id) {
      console.warn('[GroupChannelReceiver] Hotel does not belong to current group');
      return;
    }

    // 导航到门店对比页面，并选中对应酒店
    if (autoNavigate && location.pathname !== '/hotels') {
      navigate('/hotels', {
        state: { selectedHotelId: payload.hotelId }
      });
      
      if (showNotification) {
        toast.info(
          '管理端选择查看门店',
          `门店: ${payload.hotelName}`,
          { duration: 3000 }
        );
      }
    }
  }, [enabled, autoNavigate, showNotification, currentGroup, location.pathname, navigate]);

  // 订阅消息
  useChannelMessage<GroupSelectPayload>('GROUP_SELECT', handleGroupSelect);
  useChannelMessage<GroupSelectPayload>('GROUP_FOCUS', handleGroupSelect);
  useChannelMessage<HotelSelectPayload>('HOTEL_SELECT', handleHotelSelect);

  // 监听数据更新消息
  useChannelMessage('DATA_UPDATE', (payload: any) => {
    if (!enabled) return;
    
    console.log('[GroupChannelReceiver] Data update received:', payload);
    
    if (showNotification && payload.summary) {
      toast.info('数据已更新', payload.summary, { duration: 3000 });
    }
  });

  // 心跳检测 - 检查管理端是否还在查看
  useEffect(() => {
    if (!enabled || !lastSync) return;

    const interval = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSync.timestamp;
      // 如果超过 30 秒没有收到消息，认为管理端已离开
      if (timeSinceLastSync > 30000 && isAdminViewing) {
        setIsAdminViewing(false);
        if (showNotification) {
          toast.info('管理端已离开', '同步连接断开', { duration: 2000 });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, lastSync, isAdminViewing, showNotification]);

  return (
    <>
      {/* 同步状态指示器 */}
      {isAdminViewing && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 rounded-full text-xs text-neon-cyan animate-pulse">
          <span className="w-2 h-2 rounded-full bg-neon-cyan" />
          管理端同步中
        </div>
      )}
    </>
  );
}

/**
 * 使用集团频道同步的 Hook
 */
export function useGroupChannelSync() {
  const [syncState, setSyncState] = useState<{
    isConnected: boolean;
    lastMessage: GroupSelectPayload | null;
    lastMessageTime: number | null;
  }>({
    isConnected: false,
    lastMessage: null,
    lastMessageTime: null,
  });

  useChannelMessage<GroupSelectPayload>('GROUP_SELECT', (payload) => {
    setSyncState({
      isConnected: true,
      lastMessage: payload,
      lastMessageTime: Date.now(),
    });
  });

  const acknowledgeSync = useCallback((groupId: string) => {
    channelManager.send('GROUP_FOCUS', {
      groupId,
      action: 'focus',
      timestamp: Date.now(),
    }, { groupId });
  }, []);

  return { ...syncState, acknowledgeSync };
}

/**
 * 发送集团数据到管理端的 Hook
 */
export function useGroupToAdminSync() {
  const { currentGroup } = useGroupStore();

  const syncMetrics = useCallback((metrics: {
    gmv?: number;
    occupancy?: number;
    revpar?: number;
  }) => {
    if (!currentGroup) return;

    channelManager.send('REALTIME_METRICS', {
      groupId: currentGroup.id,
      metrics: {
        ...metrics,
        timestamp: Date.now(),
      },
    }, { groupId: currentGroup.id });
  }, [currentGroup]);

  const notifyAnomaly = useCallback((anomaly: {
    type: string;
    level: 'critical' | 'warning';
    hotelId: string;
    hotelName: string;
    message: string;
  }) => {
    if (!currentGroup) return;

    channelManager.send('DATA_UPDATE', {
      entity: 'anomaly',
      entityId: anomaly.hotelId,
      action: 'create',
      summary: `[${anomaly.hotelName}] ${anomaly.message}`,
    }, { groupId: currentGroup.id, hotelId: anomaly.hotelId });
  }, [currentGroup]);

  return { syncMetrics, notifyAnomaly };
}
