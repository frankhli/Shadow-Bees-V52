/**
 * 页面加载包装组件
 * 提供 Skeleton 加载状态和错误处理
 */

import { ReactNode, ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { PageSkeleton } from '@/components/ux/Skeleton';
import { Button } from './Button';

interface PageLoaderProps<T> {
  // 数据
  data: T | null | undefined;
  // 加载状态
  isLoading: boolean;
  // 错误状态
  error: Error | null;
  // 骨架屏类型
  skeletonType?: 'list' | 'detail' | 'dashboard' | 'form' | 'table';
  // 子组件（数据加载成功后渲染）
  children: ReactNode;
  // 重试函数
  onRetry?: () => void;
  // 空数据提示
  emptyMessage?: string;
  // 自定义空状态组件
  emptyComponent?: ReactNode;
}

// 错误提示组件
function ErrorState({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8"
    >
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">加载失败</h3>
      <p className="text-gray-400 text-center max-w-md mb-6">
        {error.message || '数据加载时出现错误，请稍后重试'}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          icon={<RefreshCw size={16} />}
          onClick={onRetry}
        >
          重新加载
        </Button>
      )}
    </motion.div>
  );
}

// 空状态组件
function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[300px] p-8"
    >
      <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">📭</span>
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">暂无数据</h3>
      <p className="text-gray-500 text-center">{message}</p>
    </motion.div>
  );
}

// 主组件
export function PageLoader<T>({
  data,
  isLoading,
  error,
  skeletonType = 'list',
  children,
  onRetry,
  emptyMessage = '暂时没有相关数据',
  emptyComponent,
}: PageLoaderProps<T>) {
  // 错误状态
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  // 加载状态
  if (isLoading) {
    return <PageSkeleton type={skeletonType} />;
  }

  // 空数据状态
  if (data === null || data === undefined || (Array.isArray(data) && data.length === 0)) {
    return emptyComponent || <EmptyState message={emptyMessage} />;
  }

  // 正常渲染
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// 高阶组件版本
export function withPageLoader<T extends object>(
  Component: ComponentType<T>,
  options: {
    skeletonType?: 'list' | 'detail' | 'dashboard' | 'form' | 'table';
    emptyMessage?: string;
    dataKey?: string;
  } = {}
) {
  return function WrappedComponent(props: T & { 
    isLoading?: boolean; 
    error?: Error | null;
    onRetry?: () => void;
  }) {
    const { isLoading, error, onRetry, ...restProps } = props;
    const data = options.dataKey 
      ? (restProps as Record<string, unknown>)[options.dataKey] 
      : restProps;

    return (
      <PageLoader
        data={data}
        isLoading={isLoading || false}
        error={error || null}
        skeletonType={options.skeletonType}
        onRetry={onRetry}
        emptyMessage={options.emptyMessage}
      >
        <Component {...(restProps as T)} />
      </PageLoader>
    );
  };
}

export default PageLoader;
