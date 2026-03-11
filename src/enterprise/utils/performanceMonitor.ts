/**
 * 性能监控工具
 * 
 * 监控指标：
 * - 页面加载时间
 * - 组件渲染时间
 * - API响应时间
 * - 错误率统计
 */

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTimes: Record<string, number[]>;
  renderTimes: Record<string, number[]>;
  errors: Array<{ type: string; message: string; timestamp: number }>;
}

const metrics: PerformanceMetrics = {
  pageLoadTime: 0,
  apiResponseTimes: {},
  renderTimes: {},
  errors: [],
};

// 记录页面加载时间
export function recordPageLoadTime() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          metrics.pageLoadTime = perfData.loadEventEnd - perfData.startTime;
          console.log(`[Performance] 页面加载时间: ${metrics.pageLoadTime.toFixed(2)}ms`);
        }
      }, 0);
    });
  }
}

// 记录API响应时间
export function recordApiTiming(apiName: string, duration: number) {
  if (!metrics.apiResponseTimes[apiName]) {
    metrics.apiResponseTimes[apiName] = [];
  }
  metrics.apiResponseTimes[apiName].push(duration);
  
  // 只保留最近50条记录
  if (metrics.apiResponseTimes[apiName].length > 50) {
    metrics.apiResponseTimes[apiName].shift();
  }
}

// API计时包装器
export async function withTiming<T>(apiName: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    recordApiTiming(apiName, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordApiTiming(`${apiName}_error`, duration);
    throw error;
  }
}

// 记录错误
export function recordError(type: string, message: string) {
  metrics.errors.push({ type, message, timestamp: Date.now() });
  // 只保留最近100条错误
  if (metrics.errors.length > 100) {
    metrics.errors.shift();
  }
}

// 获取性能报告
export function getPerformanceReport() {
  const report = {
    pageLoadTime: metrics.pageLoadTime,
    apiStats: Object.entries(metrics.apiResponseTimes).map(([name, times]) => ({
      name,
      count: times.length,
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
    })),
    errorCount: metrics.errors.length,
    recentErrors: metrics.errors.slice(-10),
  };
  
  return report;
}

// 控制台快捷方式
if (typeof window !== 'undefined') {
  (window as any).perfReport = () => {
    const report = getPerformanceReport();
    console.table(report.apiStats);
    console.log('页面加载时间:', report.pageLoadTime.toFixed(2) + 'ms');
    console.log('错误数:', report.errorCount);
    return report;
  };
  
  console.log('[PerformanceMonitor] 可用命令: perfReport()');
}
