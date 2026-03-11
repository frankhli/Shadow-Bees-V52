/**
 * Skeleton 加载态组件
 * Shadow-Bees V52 - 统一的加载占位符
 */

import { motion } from 'framer-motion';

// 基础 Skeleton 组件
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  animate?: boolean;
  style?: React.CSSProperties;
}

export function Skeleton({
  className = '',
  width,
  height,
  circle = false,
  animate = true,
  style: externalStyle,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width,
    height: height,
    ...externalStyle,
  };

  return (
    <motion.div
      style={style}
      className={`bg-white/10 ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`}
      animate={animate ? {
        opacity: [0.4, 0.7, 0.4],
      } : {}}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// 文本 Skeleton
interface TextSkeletonProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: string;
  className?: string;
}

export function TextSkeleton({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = '60%',
  className = '',
}: TextSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          className={i === lines - 1 ? `w-[${lastLineWidth}]` : 'w-full'}
          style={{ width: i === lines - 1 ? lastLineWidth : '100%' }}
        />
      ))}
    </div>
  );
}

// 卡片 Skeleton
interface CardSkeletonProps {
  hasImage?: boolean;
  imageHeight?: number;
  lines?: number;
  className?: string;
}

export function CardSkeleton({
  hasImage = true,
  imageHeight = 160,
  lines = 3,
  className = '',
}: CardSkeletonProps) {
  return (
    <div className={`p-4 bg-white/5 rounded-xl border border-white/10 ${className}`}>
      {hasImage && (
        <Skeleton height={imageHeight} className="mb-4" />
      )}
      <Skeleton height={20} className="w-3/4 mb-3" />
      <TextSkeleton lines={lines} lineHeight={12} lastLineWidth="40%" />
    </div>
  );
}

// 列表项 Skeleton
interface ListItemSkeletonProps {
  hasAvatar?: boolean;
  hasAction?: boolean;
  lines?: number;
  className?: string;
}

export function ListItemSkeleton({
  hasAvatar = true,
  hasAction = true,
  lines = 2,
  className = '',
}: ListItemSkeletonProps) {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      {hasAvatar && (
        <Skeleton width={40} height={40} circle />
      )}
      <div className="flex-1 min-w-0">
        <Skeleton height={16} className="w-1/3 mb-2" />
        {lines > 1 && (
          <Skeleton height={12} className="w-1/2" />
        )}
      </div>
      {hasAction && (
        <Skeleton width={24} height={24} />
      )}
    </div>
  );
}

// 表格 Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className = '',
}: TableSkeletonProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* 表头 */}
      {hasHeader && (
        <div className="flex gap-4 pb-3 mb-3 border-b border-white/10">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              height={16}
              className={i === 0 ? 'w-12' : 'flex-1'}
            />
          ))}
        </div>
      )}
      
      {/* 行 */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={`cell-${rowIdx}-${colIdx}`}
                height={colIdx === 0 ? 20 : 14}
                className={colIdx === 0 ? 'w-12' : 'flex-1'}
                animate={rowIdx === 0} // 只有第一行动画
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 统计卡片 Skeleton
interface StatCardSkeletonProps {
  count?: number;
  className?: string;
}

export function StatCardSkeleton({ count = 4, className = '' }: StatCardSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <Skeleton width={80} height={14} />
            <Skeleton width={32} height={32} circle />
          </div>
          <Skeleton height={32} className="w-1/2 mb-2" />
          <Skeleton height={12} className="w-1/3" />
        </div>
      ))}
    </div>
  );
}

// 图表 Skeleton
interface ChartSkeletonProps {
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export function ChartSkeleton({
  height = 300,
  showLegend = true,
  className = '',
}: ChartSkeletonProps) {
  return (
    <div className={`p-4 bg-white/5 rounded-xl border border-white/10 ${className}`}>
      {/* 标题 */}
      <Skeleton height={20} className="w-1/4 mb-4" />
      
      {/* 图表区域 */}
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end justify-around px-4 pb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              width={24}
              height={`${20 + Math.random() * 60}%`}
              className="rounded-t"
            />
          ))}
        </div>
        {/* 网格线 */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-white/5" />
          ))}
        </div>
      </div>
      
      {/* 图例 */}
      {showLegend && (
        <div className="flex items-center justify-center gap-6 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton width={12} height={12} circle />
              <Skeleton width={60} height={12} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 详情页 Skeleton
interface DetailSkeletonProps {
  sections?: number;
  className?: string;
}

export function DetailSkeleton({ sections = 3, className = '' }: DetailSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 头部 */}
      <div className="flex items-start gap-4 pb-6 border-b border-white/10">
        <Skeleton width={80} height={80} circle />
        <div className="flex-1">
          <Skeleton height={24} className="w-1/3 mb-3" />
          <Skeleton height={14} className="w-1/4 mb-2" />
          <Skeleton height={14} className="w-1/5" />
        </div>
        <Skeleton width={100} height={36} />
      </div>
      
      {/* 内容区块 */}
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton height={18} className="w-1/6" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j}>
                <Skeleton height={12} className="w-1/4 mb-2" />
                <Skeleton height={16} className="w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// 仪表盘 Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <StatCardSkeleton count={4} />
      
      {/* 图表行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={280} />
        <ChartSkeleton height={280} />
      </div>
      
      {/* 表格 */}
      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
        <Skeleton height={20} className="w-1/4 mb-4" />
        <TableSkeleton rows={5} columns={5} />
      </div>
    </div>
  );
}

// 页面级 Skeleton
interface PageSkeletonProps {
  type?: 'list' | 'detail' | 'dashboard' | 'form' | 'table';
  className?: string;
}

export function PageSkeleton({ type = 'list', className = '' }: PageSkeletonProps) {
  const skeletons = {
    list: (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton height={24} className="w-48" />
          <Skeleton width={120} height={36} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    ),
    detail: <DetailSkeleton />,
    dashboard: <DashboardSkeleton />,
    form: (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton height={24} className="w-1/3 mb-8" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton height={14} className="w-24 mb-2" />
            <Skeleton height={44} className="w-full" />
          </div>
        ))}
        <div className="flex gap-4 pt-4">
          <Skeleton height={40} className="w-32" />
          <Skeleton height={40} className="w-24" />
        </div>
      </div>
    ),
    table: (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <Skeleton height={24} className="w-48" />
          <div className="flex gap-2">
            <Skeleton width={100} height={36} />
            <Skeleton width={100} height={36} />
          </div>
        </div>
        <div className="bg-white/5 rounded-xl border border-white/10">
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    ),
  };

  return (
    <div className={`p-6 ${className}`}>
      {skeletons[type]}
    </div>
  );
}

export default {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  ListItemSkeleton,
  TableSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  DetailSkeleton,
  DashboardSkeleton,
  PageSkeleton,
};
