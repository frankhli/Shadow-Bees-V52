/**
 * API错误统一处理
 * 
 * 提供：
 * - 错误分类
 * - 用户友好提示
 * - 自动重试机制
 * - 错误上报
 */

import { logger } from './logger';

export enum ApiErrorType {
  NETWORK = 'NETWORK',           // 网络错误
  TIMEOUT = 'TIMEOUT',           // 超时
  SERVER = 'SERVER',             // 服务器错误(5xx)
  BUSINESS = 'BUSINESS',         // 业务错误(4xx)
  UNAUTHORIZED = 'UNAUTHORIZED', // 未授权(401)
  FORBIDDEN = 'FORBIDDEN',       // 禁止访问(403)
  NOT_FOUND = 'NOT_FOUND',       // 资源不存在(404)
  UNKNOWN = 'UNKNOWN',           // 未知错误
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  code?: string;
  status?: number;
  originalError?: unknown;
}

// 错误消息映射
const ERROR_MESSAGES: Record<ApiErrorType, string> = {
  [ApiErrorType.NETWORK]: '网络连接失败，请检查网络',
  [ApiErrorType.TIMEOUT]: '请求超时，请稍后重试',
  [ApiErrorType.SERVER]: '服务器繁忙，请稍后重试',
  [ApiErrorType.BUSINESS]: '操作失败，请检查输入',
  [ApiErrorType.UNAUTHORIZED]: '登录已过期，请重新登录',
  [ApiErrorType.FORBIDDEN]: '无权访问该资源',
  [ApiErrorType.NOT_FOUND]: '请求的资源不存在',
  [ApiErrorType.UNKNOWN]: '发生未知错误，请稍后重试',
};

/**
 * 解析错误类型
 */
export function parseError(error: unknown): ApiError {
  // 网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ApiErrorType.NETWORK,
      message: ERROR_MESSAGES[ApiErrorType.NETWORK],
      originalError: error,
    };
  }

  // HTTP错误
  if (error instanceof Response) {
    const status = error.status;
    
    if (status === 401) {
      return {
        type: ApiErrorType.UNAUTHORIZED,
        message: ERROR_MESSAGES[ApiErrorType.UNAUTHORIZED],
        status,
        originalError: error,
      };
    }
    
    if (status === 403) {
      return {
        type: ApiErrorType.FORBIDDEN,
        message: ERROR_MESSAGES[ApiErrorType.FORBIDDEN],
        status,
        originalError: error,
      };
    }
    
    if (status === 404) {
      return {
        type: ApiErrorType.NOT_FOUND,
        message: ERROR_MESSAGES[ApiErrorType.NOT_FOUND],
        status,
        originalError: error,
      };
    }
    
    if (status >= 500) {
      return {
        type: ApiErrorType.SERVER,
        message: ERROR_MESSAGES[ApiErrorType.SERVER],
        status,
        originalError: error,
      };
    }
    
    if (status >= 400) {
      return {
        type: ApiErrorType.BUSINESS,
        message: ERROR_MESSAGES[ApiErrorType.BUSINESS],
        status,
        originalError: error,
      };
    }
  }

  // 超时错误
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      type: ApiErrorType.TIMEOUT,
      message: ERROR_MESSAGES[ApiErrorType.TIMEOUT],
      originalError: error,
    };
  }

  // 未知错误
  return {
    type: ApiErrorType.UNKNOWN,
    message: error instanceof Error ? error.message : ERROR_MESSAGES[ApiErrorType.UNKNOWN],
    originalError: error,
  };
}

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: unknown): string {
  return parseError(error).message;
}

/**
 * 处理API错误
 * 
 * @param error 原始错误
 * @param context 错误上下文
 * @param showToast 是否显示提示（可选）
 * @returns 标准化的错误对象
 */
export function handleApiError(
  error: unknown,
  context?: { apiName?: string; params?: unknown }
): ApiError {
  const apiError = parseError(error);
  
  // 记录错误日志
  logger.error(
    context?.apiName ? `${context.apiName} 调用失败` : 'API调用失败',
    apiError.originalError instanceof Error ? apiError.originalError : undefined,
    {
      errorType: apiError.type,
      status: apiError.status,
      params: context?.params,
    }
  );

  // 未授权错误特殊处理 - 可以触发重新登录
  if (apiError.type === ApiErrorType.UNAUTHORIZED) {
    // 触发全局登出事件
    window.dispatchEvent(new CustomEvent('api:unauthorized'));
  }

  return apiError;
}

/**
 * 带重试的API调用
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    delay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  }
): Promise<T> {
  const { retries = 3, delay = 1000, onRetry } = options || {};
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 最后一次尝试，直接抛出
      if (attempt === retries) {
        break;
      }

      // 某些错误不需要重试
      const apiError = parseError(error);
      if (
        apiError.type === ApiErrorType.UNAUTHORIZED ||
        apiError.type === ApiErrorType.FORBIDDEN ||
        apiError.type === ApiErrorType.BUSINESS
      ) {
        break;
      }

      // 通知重试
      onRetry?.(attempt, error);
      logger.warn(`API调用失败，${retries - attempt}秒后重试(第${attempt}次)`, { error });
      
      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

/**
 * API调用包装器（统一处理错误）
 */
export async function apiCall<T>(
  fn: () => Promise<T>,
  context?: { apiName: string; params?: unknown }
): Promise<{ data?: T; error?: ApiError }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const apiError = handleApiError(error, context);
    return { error: apiError };
  }
}
