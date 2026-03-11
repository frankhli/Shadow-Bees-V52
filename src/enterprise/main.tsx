/**
 * Shadow-Bees Enterprise Edition - 入口文件
 * 支持iframe嵌入模式 + SSO免登
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { logger } from './utils/logger';
import { ToastProvider } from '../components/ui/ToastProvider';

// ============================================
// iframe 通信管理器
// ============================================

interface IframeMessage {
  type: string;
  payload?: unknown;
}

class IframeCommunicator {
  private isEmbedded: boolean;
  private resizeObserver: ResizeObserver | null = null;
  private lastHeight = 0;
  
  constructor() {
    this.isEmbedded = window.parent !== window;
    this.init();
  }
  
  private init() {
    if (!this.isEmbedded) return;
    
    // 添加嵌入模式样式
    document.body.classList.add('embedded');
    
    // 监听父页面消息
    window.addEventListener('message', this.handleParentMessage.bind(this));
    
    // 初始化高度监听
    this.initHeightTracking();
    
    // 发送就绪信号
    this.notifyReady();
    
    logger.info('[ShadowBees] iframe模式已初始化');
  }
  
  /**
   * 处理父页面消息
   */
  private handleParentMessage(event: MessageEvent<IframeMessage>) {
    // TODO: 验证消息来源
    // if (event.origin !== 'https://rmsebk.huameihuihotel.com') return;
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'PMS_LOGIN_TOKEN':
        // SSO登录
        this.handleSSOLogin(payload);
        break;
        
      case 'PMS_LOGOUT':
        // 登出通知
        this.handleLogout();
        break;
        
      case 'PMS_HOTEL_CHANGE':
        // 切换酒店
        this.handleHotelChange(payload);
        break;
        
      case 'PMS_NAVIGATE':
        // 外部导航
        this.handleExternalNavigate(payload);
        break;
        
      case 'PMS_PING':
        // 心跳检测
        this.sendMessage('PONG', { timestamp: Date.now() });
        break;
        
      default:
        logger.warn('[ShadowBees] 未知消息类型', { type });
    }
  }
  
  /**
   * 处理SSO登录
   */
  private handleSSOLogin(payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    
    const { token, userInfo } = payload as {
      token: string;
      userInfo: {
        id: string;
        name: string;
        role: string;
        hotelIds: string[];
        regionIds?: string[];
      };
    };
    
    if (token) {
      // 存储token到localStorage，供后续API调用使用
      localStorage.setItem('pms_token', token);
      localStorage.setItem('pms_user_info', JSON.stringify(userInfo));
      
      // 触发登录事件
      window.dispatchEvent(new CustomEvent('sb:sso-login', {
        detail: { token, userInfo }
      }));
      
      logger.info('[ShadowBees] SSO登录成功');
    }
  }
  
  /**
   * 处理登出
   */
  private handleLogout() {
    localStorage.removeItem('pms_token');
    localStorage.removeItem('pms_user_info');
    
    window.dispatchEvent(new CustomEvent('sb:logout'));
    
    logger.info('[ShadowBees] 已登出');
  }
  
  /**
   * 处理酒店切换
   */
  private handleHotelChange(payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    
    const { hotelId, hotelName } = payload as { hotelId: string; hotelName: string };
    
    window.dispatchEvent(new CustomEvent('sb:hotel-change', {
      detail: { hotelId, hotelName }
    }));
    
    logger.info('[ShadowBees] 切换酒店', { hotelName });
  }
  
  /**
   * 处理外部导航
   */
  private handleExternalNavigate(payload: unknown) {
    if (!payload || typeof payload !== 'object') return;
    
    const { path } = payload as { path: string };
    
    if (path) {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }
  
  /**
   * 初始化高度监听
   */
  private initHeightTracking() {
    const rootElement = document.getElementById('root');
    if (!rootElement) return;
    
    // 使用ResizeObserver监听内容高度变化
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height !== this.lastHeight && height > 0) {
          this.lastHeight = height;
          this.notifyHeightChange(height);
        }
      }
    });
    
    this.resizeObserver.observe(rootElement);
    
    // 初始高度通知
    setTimeout(() => {
      const height = rootElement.scrollHeight;
      this.notifyHeightChange(height);
    }, 100);
  }
  
  /**
   * 通知父页面高度变化
   */
  notifyHeightChange(height: number) {
    this.sendMessage('RESIZE', { height });
  }
  
  /**
   * 通知父页面就绪
   */
  notifyReady() {
    this.sendMessage('READY', {
      version: '1.0.0',
      timestamp: Date.now(),
    });
  }
  
  /**
   * 通知父页面路由变化
   */
  notifyNavigation(path: string, title?: string) {
    this.sendMessage('NAVIGATE', { path, title });
  }
  
  /**
   * 通知父页面加载状态
   */
  notifyLoading(isLoading: boolean) {
    this.sendMessage('LOADING', { isLoading });
  }
  
  /**
   * 通知父页面错误
   */
  notifyError(error: { message: string; code?: string }) {
    this.sendMessage('ERROR', error);
  }
  
  /**
   * 发送消息到父页面
   */
  private sendMessage(type: string, payload?: unknown) {
    if (!this.isEmbedded) return;
    
    window.parent.postMessage(
      {
        type: `SB_${type}`,
        payload,
        timestamp: Date.now(),
      },
      '*' // TODO: 限制为特定域名
    );
  }
  
  /**
   * 销毁
   */
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  /**
   * 是否在iframe中
   */
  getIsEmbedded(): boolean {
    return this.isEmbedded;
  }
}

// 创建全局通信器实例
export const iframeCommunicator = new IframeCommunicator();

// ============================================
// 性能监控
// ============================================

if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
  // 开发环境性能提示
  const reportWebVitals = (metric: { name: string; value: number }) => {
    logger.debug(`[Web Vitals] ${metric.name}: ${metric.value}`);
  };
  
  // 监听LCP
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      reportWebVitals({ name: 'LCP', value: entry.startTime });
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });
  
  // 监听FID
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fid = (entry as unknown as { processingStart: number }).processingStart - entry.startTime;
      reportWebVitals({ name: 'FID', value: fid });
    }
  }).observe({ entryTypes: ['first-input'] });
}

// ============================================
// 错误处理
// ============================================

window.addEventListener('error', (event) => {
  logger.error('[ShadowBees] 全局错误', event.error);
  iframeCommunicator.notifyError({
    message: event.message,
    code: 'RUNTIME_ERROR',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('[ShadowBees] 未处理的Promise', event.reason);
  iframeCommunicator.notifyError({
    message: event.reason?.message || '未知错误',
    code: 'PROMISE_REJECTION',
  });
});

// ============================================
// 渲染应用
// ============================================

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter basename="/enterprise">
        <>
          <App />
          <ToastProvider />
        </>
      </BrowserRouter>
    </React.StrictMode>
  );
}

// ============================================
// 热更新支持
// ============================================

const _importMeta = import.meta as unknown as { hot?: { accept: () => void } };
if (_importMeta.hot) {
  _importMeta.hot.accept();
}
