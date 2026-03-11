/**
 * iframe 集成 Hook
 * 用于 Shadow-Bees 嵌入到华美会 PMS 系统时的通信和适配
 * 
 * 功能：
 * 1. 高度自适应 - 根据内容高度自动调整 iframe 高度
 * 2. 接收父页面消息 - SSO token、导航指令等
 * 3. 向父页面发送消息 - 高度变化、页面跳转等
 * 4. 加载状态通知
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { initPMSService } from '../services/PMSIntegrationService';
import { logger } from '../utils/logger';

interface IframeIntegrationOptions {
  /** 是否启用高度自适应 */
  enableAutoResize?: boolean;
  /** 高度变化回调 */
  onHeightChange?: (height: number) => void;
  /** 接收父页面导航指令 */
  enableNavigation?: boolean;
  /** 接收 SSO token */
  enableSSO?: boolean;
  /** SSO 登录成功回调 */
  onSSOLogin?: (token: string, userInfo: any) => void;
  /** 最小高度 */
  minHeight?: number;
  /** 高度变化防抖时间(ms) */
  resizeDebounce?: number;
}

export function useIframeIntegration(options: IframeIntegrationOptions = {}) {
  const {
    enableAutoResize = true,
    onHeightChange,
    enableNavigation = true,
    enableSSO = true,
    onSSOLogin,
    minHeight = 600,
    resizeDebounce = 100,
  } = options;

  const navigate = useNavigate();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastHeightRef = useRef<number>(minHeight);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 发送消息到父页面
  const postMessageToParent = useCallback((type: string, payload?: any) => {
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: `SHADOW_BEES_${type}`,
          payload,
          timestamp: Date.now(),
          source: 'shadow-bees-enterprise',
        },
        '*' // TODO: 生产环境应限制为具体的父页面域名
      );
    }
  }, []);

  // 通知高度变化
  const notifyHeightChange = useCallback((height: number) => {
    const newHeight = Math.max(height, minHeight);
    if (newHeight !== lastHeightRef.current) {
      lastHeightRef.current = newHeight;
      postMessageToParent('RESIZE', { height: newHeight });
      onHeightChange?.(newHeight);
    }
  }, [minHeight, onHeightChange, postMessageToParent]);

  // 初始化高度自适应
  useEffect(() => {
    if (!enableAutoResize) return;

    // 创建 ResizeObserver
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        
        // 防抖处理
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        
        resizeTimeoutRef.current = setTimeout(() => {
          notifyHeightChange(height);
        }, resizeDebounce);
      }
    });

    // 开始观察 body
    resizeObserverRef.current.observe(document.body);

    // 初始高度通知
    notifyHeightChange(document.body.scrollHeight);

    return () => {
      resizeObserverRef.current?.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [enableAutoResize, resizeDebounce, notifyHeightChange]);

  // 处理父页面消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // TODO: 生产环境应验证 event.origin
      const { type, payload } = event.data;

      if (!type || !type.startsWith('PMS_')) return;

      switch (type) {
        case 'PMS_LOGIN_TOKEN':
          // 接收 SSO token
          if (enableSSO && payload?.token) {
            logger.info('[ShadowBees] Received SSO token');
            
            // 初始化 PMS 服务
            initPMSService({
              baseUrl: payload.pmsApiUrl || 'https://pms.huameihuihotel.com',
              apiKey: payload.apiKey || '',
              apiSecret: payload.apiSecret || '',
            });

            // 调用登录回调
            onSSOLogin?.(payload.token, payload.userInfo);
          }
          break;

        case 'PMS_NAVIGATE':
          // 接收导航指令
          if (enableNavigation && payload?.path) {
            logger.info('[ShadowBees] Navigate to', { path: payload.path });
            navigate(payload.path);
          }
          break;

        case 'PMS_HOTEL_SWITCH':
          // 切换当前操作的酒店
          if (payload?.hotelId) {
            logger.info('[ShadowBees] Switch hotel', { hotelId: payload.hotelId });
            navigate(`/hotel-workbench/${payload.hotelId}`);
          }
          break;

        case 'PMS_SYNC_REQUEST':
          // PMS 请求数据同步
          logger.info('[ShadowBees] Sync requested', { payload });
          // TODO: 触发数据同步
          break;

        case 'PMS_CONFIG':
          // 接收 PMS 配置
          logger.info('[ShadowBees] Received config', { payload });
          if (payload?.apiUrl) {
            initPMSService({
              baseUrl: payload.apiUrl,
              apiKey: payload.apiKey || '',
              apiSecret: payload.apiSecret || '',
            });
          }
          break;

        default:
          logger.warn('[ShadowBees] Unknown message type', { type });
      }
    };

    window.addEventListener('message', handleMessage);

    // 通知父页面加载完成
    postMessageToParent('READY');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [enableSSO, enableNavigation, navigate, onSSOLogin, postMessageToParent]);

  // 导航拦截 - 通知父页面路由变化
  const handleNavigation = useCallback((path: string) => {
    postMessageToParent('NAVIGATE', { path });
    navigate(path);
  }, [navigate, postMessageToParent]);

  return {
    /** 当前 iframe 高度 */
    height: lastHeightRef.current,
    /** 手动通知高度变化 */
    notifyHeightChange,
    /** 向父页面发送消息 */
    postMessageToParent,
    /** 带通知的导航 */
    handleNavigation,
    /** 是否在 iframe 中 */
    isInIframe: window.parent !== window,
  };
}

export default useIframeIntegration;
