/**
 * 网站统计配置（免费）
 * 1. 百度统计（国内）
 * 2. Google Analytics（国际）
 */

// ==========================================
// 百度统计
// ==========================================
function initBaiduAnalytics(trackingId) {
  if (!trackingId) return;
  
  window._hmt = window._hmt || [];
  const hm = document.createElement('script');
  hm.src = `https://hm.baidu.com/hm.js?${trackingId}`;
  hm.async = true;
  document.head.appendChild(hm);
  
  console.log('[Analytics] Baidu initialized');
}

// 百度统计事件追踪
function trackBaiduEvent(category, action, label, value) {
  if (window._hmt) {
    _hmt.push(['_trackEvent', category, action, label, value]);
  }
}

// ==========================================
// Google Analytics 4
// ==========================================
function initGoogleAnalytics(measurementId) {
  if (!measurementId) return;
  
  // 加载 gtag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', measurementId, {
    send_page_view: false, // 手动控制页面浏览
  });
  
  window.gtag = gtag;
  console.log('[Analytics] Google Analytics initialized');
}

// Google Analytics 事件追踪
function trackGAEvent(eventName, params = {}) {
  if (window.gtag) {
    gtag('event', eventName, params);
  }
}

// 页面浏览
function trackPageView(pageTitle, pagePath) {
  // 百度
  if (window._hmt) {
    _hmt.push(['_trackPageview', pagePath]);
  }
  
  // Google
  if (window.gtag) {
    gtag('event', 'page_view', {
      page_title: pageTitle,
      page_path: pagePath,
    });
  }
}

// ==========================================
// 统一追踪接口
// ==========================================
const Analytics = {
  // 初始化
  init({ baiduId, googleId }) {
    initBaiduAnalytics(baiduId);
    initGoogleAnalytics(googleId);
  },
  
  // 页面浏览
  pageView(title, path) {
    trackPageView(title, path);
  },
  
  // 事件追踪
  event(category, action, label, value) {
    trackBaiduEvent(category, action, label, value);
    trackGAEvent(action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  },
  
  // 业务事件快捷方法
  track(eventName, params) {
    console.log('[Analytics]', eventName, params);
    
    // 酒店切换
    if (eventName === 'hotel_switch') {
      this.event('Hotel', 'Switch', params.hotelName);
    }
    
    // 订单创建
    if (eventName === 'order_create') {
      this.event('Order', 'Create', params.platform, params.amount);
    }
    
    // 价格调整
    if (eventName === 'price_update') {
      this.event('Pricing', 'Update', params.reason);
    }
    
    // 内容生成
    if (eventName === 'content_generate') {
      this.event('Content', 'Generate', params.platform);
    }
  },
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Analytics;
} else {
  window.Analytics = Analytics;
}
