/**
 * 全局错误处理
 * Shadow-Bees V52 - 错误边界、全局捕获、重试机制
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X, WifiOff, ServerCrash } from 'lucide-react';
import { toast } from './EnhancedToast';

// ============================================
// 全局错误状态
// ============================================

interface ErrorInfo {
  type: 'network' | 'server' | 'client' | 'unknown';
  message: string;
  timestamp: number;
  retry?: () => void;
}

// ============================================
// 全局错误处理器
// ============================================

export function useGlobalErrorHandler() {
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    // 全局错误捕获
    const handleError = (event: ErrorEvent) => {
      console.error('Global Error:', event.error);
      
      // 分类处理
      if (event.message?.includes('network') || event.message?.includes('fetch')) {
        toast.error('网络错误', '请检查网络连接后重试');
        setNetworkError(true);
      } else if (event.message?.includes('timeout')) {
        toast.error('请求超时', '服务器响应缓慢，请稍后重试');
      } else {
        toast.error('系统错误', '操作失败，请刷新页面重试');
      }
    };

    // Promise 错误捕获
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      
      const reason = String(event.reason);
      if (reason.includes('404')) {
        toast.error('资源不存在', '请求的数据或页面不存在');
      } else if (reason.includes('403')) {
        toast.error('权限不足', '您没有权限执行此操作');
      } else if (reason.includes('500')) {
        toast.error('服务器错误', '服务器内部错误，请稍后重试');
      } else {
        toast.error('操作失败', '请求处理失败，请重试');
      }
    };

    // 网络状态监听
    const handleOnline = () => {
      setNetworkError(false);
      toast.success('网络已恢复', '您可以继续操作了');
    };

    const handleOffline = () => {
      setNetworkError(true);
      toast.error('网络已断开', '请检查网络连接');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { networkError };
}

// ============================================
// 网络状态提示条
// ============================================

export function NetworkStatusBar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: -40 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-[9999] bg-red-500/90 text-text-primary px-4 py-2 text-center text-sm flex items-center justify-center gap-2"
    >
      <WifiOff className="w-4 h-4" />
      网络已断开，请检查网络连接
    </motion.div>
  );
}

// ============================================
// 错误重试包装器
// ============================================

interface ErrorRetryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  error?: Error | null;
  loading?: boolean;
}

export function ErrorRetry({ children, onRetry, error, loading }: ErrorRetryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <ServerCrash className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium mb-2">加载失败</h3>
        <p className="text-sm text-text-tertiary mb-4 max-w-xs">
          {error.message || '数据加载出错，请重试'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重新加载
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================
// API 错误处理 Hook
// ============================================

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const { onSuccess, onError, retryCount = 3, retryDelay = 1000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempts, setAttempts] = useState(0);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    for (let i = 0; i < retryCount; i++) {
      try {
        const result = await asyncFn();
        setData(result);
        setAttempts(0);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setAttempts(i + 1);

        if (i < retryCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (i + 1)));
        } else {
          setError(error);
          onError?.(error);
          toast.error('操作失败', error.message || '请稍后重试');
        }
      }
    }

    setLoading(false);
  }, [asyncFn, onSuccess, onError, retryCount, retryDelay]);

  const retry = useCallback(() => {
    setAttempts(0);
    execute();
  }, [execute]);

  useEffect(() => {
    execute();
  }, []);

  return { data, loading, error, retry, attempts };
}

// ============================================
// 全局错误提示组件
// ============================================

export function GlobalErrorToast() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const removeError = useCallback((timestamp: number) => {
    setErrors((prev) => prev.filter((e) => e.timestamp !== timestamp));
  }, []);

  useEffect(() => {
    // 自动清理
    const timer = setInterval(() => {
      const now = Date.now();
      setErrors((prev) => prev.filter((e) => now - e.timestamp < 10000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9998] space-y-2 pointer-events-none">
      <AnimatePresence>
        {errors.map((error) => (
          <motion.div
            key={error.timestamp}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="pointer-events-auto flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg max-w-sm"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-400">
                {error.type === 'network' && '网络错误'}
                {error.type === 'server' && '服务器错误'}
                {error.type === 'client' && '操作错误'}
                {error.type === 'unknown' && '系统错误'}
              </p>
              <p className="text-sm text-text-secondary mt-1">{error.message}</p>
              {error.retry && (
                <button
                  onClick={() => {
                    error.retry?.();
                    removeError(error.timestamp);
                  }}
                  className="mt-2 text-sm text-neon-cyan hover:underline"
                >
                  重试
                </button>
              )}
            </div>
            <button
              onClick={() => removeError(error.timestamp)}
              className="text-text-tertiary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default {
  useGlobalErrorHandler,
  NetworkStatusBar,
  ErrorRetry,
  useAsync,
  GlobalErrorToast,
};
