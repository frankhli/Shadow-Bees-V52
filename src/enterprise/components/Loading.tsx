/**
 * 统一加载状态组件
 * 
 * 提供多种加载样式：
 * - FullScreen: 全屏加载
 * - Section: 区域加载（带骨架屏）
 * - Inline: 行内加载
 * - Spinner: 旋转图标
 */

import { Loader2 } from 'lucide-react';
import { Skeleton, MetricCardSkeleton, TableRowSkeleton, ChartSkeleton } from './SkeletonCard';

interface LoadingProps {
  text?: string;
  subText?: string;
  className?: string;
}

/**
 * 全屏加载
 */
export function FullScreen({ text = '加载中...', subText }: LoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto" />
        <p className="mt-4 text-gray-600 font-medium">{text}</p>
        {subText && <p className="mt-1 text-sm text-gray-400">{subText}</p>}
      </div>
    </div>
  );
}

/**
 * 区域加载 - 使用骨架屏
 */
interface SectionProps extends LoadingProps {
  minHeight?: string;
  type?: 'default' | 'metrics' | 'table' | 'chart';
  columns?: number;
}

export function Section({ 
  minHeight = '200px', 
  type = 'default',
  columns = 4 
}: SectionProps) {
  if (type === 'metrics') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Skeleton className="w-48 h-6 mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return <ChartSkeleton />;
  }

  return (
    <div 
      className="flex items-center justify-center bg-white rounded-xl border border-gray-200"
      style={{ minHeight }}
    >
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
      </div>
    </div>
  );
}

/**
 * 行内加载
 */
export function Inline({ text = '加载中...', className = '' }: LoadingProps) {
  return (
    <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/**
 * 旋转图标
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  centered?: boolean;
}

export function Spinner({ size = 'md', className = '', text, centered }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const content = (
    <>
      <Loader2 className={`${sizeClasses[size]} text-violet-600 animate-spin ${className}`} />
      {text && <span className="text-sm text-gray-500">{text}</span>}
    </>
  );

  if (centered) {
    return (
      <div className="flex flex-col items-center gap-2">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {content}
    </div>
  );
}

/**
 * 页面级加载状态
 */
export function PageLoading({ text = '正在加载页面...' }: { text?: string }) {
  return (
    <div className="p-6 space-y-6">
      <div className="text-sm text-gray-500 mb-2">{text}</div>
      <Skeleton className="w-64 h-8" />
      <Section type="metrics" columns={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section type="chart" />
        <Section type="chart" />
      </div>
    </div>
  );
}

/**
 * 数据表格加载
 */
export function TableLoading({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <Skeleton className="w-32 h-6" />
      </div>
      <div className="p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

// 默认导出
export default {
  FullScreen,
  Section,
  Inline,
  Spinner,
  PageLoading,
  TableLoading,
};
