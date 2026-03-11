/**
 * 页面加载状态管理 Hook
 * 用于管理页面的加载、错误、数据状态
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePageLoadingOptions<T> {
  // 数据获取函数
  fetcher?: () => Promise<T>;
  // 初始数据
  initialData?: T;
  // 是否立即加载
  immediate?: boolean;
  // 最小加载时间（避免闪烁）
  minLoadingTime?: number;
  // 重试次数
  retryCount?: number;
  // 错误重试延迟
  retryDelay?: number;
}

interface UsePageLoadingReturn<T> {
  // 数据
  data: T | undefined;
  // 加载状态
  isLoading: boolean;
  // 错误
  error: Error | null;
  // 重新加载
  refetch: () => Promise<void>;
  // 设置数据
  setData: (data: T) => void;
  // 手动设置加载状态
  setLoading: (loading: boolean) => void;
  // 手动设置错误
  setError: (error: Error | null) => void;
}

export function usePageLoading<T>(
  options: UsePageLoadingOptions<T> = {}
): UsePageLoadingReturn<T> {
  const {
    fetcher,
    initialData,
    immediate = true,
    minLoadingTime = 500,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(immediate && !!fetcher);
  const [error, setError] = useState<Error | null>(null);
  
  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!fetcher) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      const result = await fetcher();
      
      // 确保最小加载时间，避免闪烁
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }

      setData(result);
      retryCountRef.current = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // 重试逻辑
      if (retryCountRef.current < retryCount && !abortControllerRef.current.signal.aborted) {
        retryCountRef.current++;
        console.log(`Retry ${retryCountRef.current}/${retryCount}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchData();
      }

      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, minLoadingTime, retryCount, retryDelay]);

  const refetch = useCallback(async () => {
    retryCountRef.current = 0;
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (immediate && fetcher) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, fetcher, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    setData,
    setLoading: setIsLoading,
    setError,
  };
}

export default usePageLoading;
