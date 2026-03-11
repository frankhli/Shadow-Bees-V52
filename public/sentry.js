/**
 * Sentry 错误监控配置（免费版）
 * 注册: https://sentry.io
 * 免费额度: 5000 错误/月
 */

// 初始化 Sentry（需要在 index.html 中引入）
function initSentry(dsn) {
  if (!dsn) {
    console.warn('[Sentry] DSN not configured');
    return;
  }

  // 加载 Sentry SDK
  const script = document.createElement('script');
  script.src = 'https://browser.sentry-cdn.com/7.100.0/bundle.tracing.min.js';
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    Sentry.init({
      dsn: dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // 性能监控
      integrations: [new Sentry.BrowserTracing()],
      tracesSampleRate: 0.1, // 10%采样
      
      // 错误采样
      sampleRate: 1.0,
      
      // 用户反馈
      beforeSend(event) {
        // 过滤敏感信息
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        return event;
      },
      
      // 忽略的错误
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Network request failed',
        'Failed to fetch',
      ],
    });

    // 设置用户信息（登录后）
    // Sentry.setUser({ id: userId, email: userEmail });

    console.log('[Sentry] Initialized');
  };
  document.head.appendChild(script);
}

// 手动上报错误
function captureError(error, context = {}) {
  if (window.Sentry) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    console.error('[Sentry] Not initialized:', error);
  }
}

// 手动上报消息
function captureMessage(message, level = 'info') {
  if (window.Sentry) {
    Sentry.captureMessage(message, level);
  }
}

// 性能监控
function startTransaction(name, op) {
  if (window.Sentry) {
    return Sentry.startTransaction({ name, op });
  }
  return null;
}

// 导出（如果支持模块）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initSentry, captureError, captureMessage, startTransaction };
}
