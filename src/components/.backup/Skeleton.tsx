/**
 * 优雅的骨架屏组件
 * 演示效果：加载时的脉冲动画，比空白更专业
 */

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  pulse?: boolean;
}

export function Skeleton({
  className = '',
  width = '100%',
  height = '1rem',
  circle = false,
  pulse = true,
}: SkeletonProps) {
  const baseClasses = 'bg-bg-tertiary';
  const shapeClasses = circle ? 'rounded-full' : 'rounded-lg';
  const pulseClasses = pulse ? 'animate-pulse' : '';

  return (
    <motion.div
      className={`${baseClasses} ${shapeClasses} ${pulseClasses} ${className}`}
      style={{ width, height }}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/**
 * 卡片骨架屏
 */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="p-4 rounded-xl border border-border-color bg-bg-secondary space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width={40} height={40} circle />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} />
      ))}
    </div>
  );
}

/**
 * 统计卡片骨架屏
 */
export function StatCardSkeleton() {
  return (
    <div className="p-5 rounded-xl border border-border-color bg-bg-secondary">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={80} height={14} />
        <Skeleton width={24} height={24} circle />
      </div>
      <Skeleton width="60%" height={32} className="mb-2" />
      <Skeleton width="40%" height={12} />
    </div>
  );
}

/**
 * 列表骨架屏
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary">
          <Skeleton width={40} height={40} circle />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height={14} />
            <Skeleton width="60%" height={12} />
          </div>
          <Skeleton width={60} height={24} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
