/**
 * 骨架屏组件 - 用于加载状态
 */

import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={style} />
  );
}

// 指标卡片骨架屏
export function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-24 h-4" />
      </div>
      <Skeleton className="w-32 h-8 mb-2" />
      <Skeleton className="w-20 h-4" />
    </div>
  );
}

// 表格行骨架屏
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="flex-1 h-4" style={{ maxWidth: `${80 + Math.random() * 40}px` }} />
      ))}
    </div>
  );
}

// 图表骨架屏
export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <Skeleton className="w-40 h-6 mb-6" />
      <div className="h-64 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t" 
            style={{ height: `${30 + Math.random() * 60}%` }} 
          />
        ))}
      </div>
    </div>
  );
}
