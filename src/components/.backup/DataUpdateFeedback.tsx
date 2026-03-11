/**
 * 数据更新视觉反馈组件
 * Shadow-Bees V52 - 数字高亮、行更新标记、最后更新时间
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Clock, ArrowUp, ArrowDown, Minus } from 'lucide-react';

// ============================================
// 1. 数字滚动动画组件
// ============================================

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  highlightOnChange?: boolean;
  duration?: number;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  highlightOnChange = true,
  duration = 0.5,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const prevValue = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (value !== prevValue.current) {
      const startValue = displayValue;
      const endValue = value;
      const startTime = performance.now();
      const diff = endValue - startValue;

      if (highlightOnChange) {
        setIsHighlighted(true);
        setTimeout(() => setIsHighlighted(false), 1000);
      }

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Easing function (ease-out-cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + diff * easeOut;
        
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
      prevValue.current = value;

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [value, duration, highlightOnChange]);

  const formattedValue = displayValue.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <motion.span
      className={`inline-block ${className}`}
      animate={isHighlighted ? {
        scale: [1, 1.1, 1],
        color: ['inherit', '#22d3ee', 'inherit'],
      } : {}}
      transition={{ duration: 0.5 }}
    >
      {prefix}{formattedValue}{suffix}
    </motion.span>
  );
}

// ============================================
// 2. 趋势指示器
// ============================================

interface TrendIndicatorProps {
  current: number;
  previous: number;
  showValue?: boolean;
  reverseColors?: boolean; // 用于某些场景（如成本）下降是好的
  className?: string;
}

export function TrendIndicator({
  current,
  previous,
  showValue = true,
  reverseColors = false,
  className = '',
}: TrendIndicatorProps) {
  const diff = current - previous;
  const percent = previous !== 0 ? ((diff / previous) * 100) : 0;
  
  if (diff === 0) {
    return (
      <span className={`inline-flex items-center gap-1 text-text-tertiary ${className}`}>
        <Minus className="w-3 h-3" />
        {showValue && <span>持平</span>}
      </span>
    );
  }

  const isPositive = diff > 0;
  const isGood = reverseColors ? !isPositive : isPositive;
  const colorClass = isGood ? 'text-neon-green' : 'text-red-500';
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <motion.span
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1 ${colorClass} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {showValue && (
        <span className="font-medium">
          {Math.abs(percent).toFixed(1)}%
        </span>
      )}
    </motion.span>
  );
}

// ============================================
// 3. 表格行更新高亮
// ============================================

interface TableRowHighlightProps {
  children: React.ReactNode;
  rowId: string;
  updatedAt?: number;
  highlightDuration?: number;
}

const recentlyUpdatedRows = new Map<string, number>();

export function TableRowHighlight({
  children,
  rowId,
  updatedAt,
  highlightDuration = 2000,
}: TableRowHighlightProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (updatedAt) {
      const lastUpdate = recentlyUpdatedRows.get(rowId);
      if (!lastUpdate || updatedAt > lastUpdate) {
        recentlyUpdatedRows.set(rowId, updatedAt);
        setIsHighlighted(true);
        const timer = setTimeout(() => setIsHighlighted(false), highlightDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [rowId, updatedAt, highlightDuration]);

  return (
    <motion.tr
      animate={isHighlighted ? {
        backgroundColor: ['transparent', 'rgba(34, 211, 238, 0.1)', 'transparent'],
      } : {}}
      transition={{ duration: highlightDuration / 1000 }}
      className={isHighlighted ? 'relative' : ''}
    >
      {isHighlighted && (
        <motion.div
          layoutId={`highlight-${rowId}`}
          className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
        />
      )}
      {children}
    </motion.tr>
  );
}

// ============================================
// 4. 最后更新时间显示
// ============================================

interface LastUpdateTimeProps {
  timestamp: number;
  className?: string;
  showIcon?: boolean;
  autoUpdate?: boolean;
}

export function LastUpdateTime({
  timestamp,
  className = '',
  showIcon = true,
  autoUpdate = true,
}: LastUpdateTimeProps) {
  const [displayText, setDisplayText] = useState('');

  const updateDisplay = useCallback(() => {
    const diff = Date.now() - timestamp;
    
    if (diff < 1000) {
      setDisplayText('刚刚');
    } else if (diff < 60000) {
      setDisplayText(`${Math.floor(diff / 1000)} 秒前`);
    } else if (diff < 3600000) {
      setDisplayText(`${Math.floor(diff / 60000)} 分钟前`);
    } else if (diff < 86400000) {
      setDisplayText(`${Math.floor(diff / 3600000)} 小时前`);
    } else {
      setDisplayText(new Date(timestamp).toLocaleDateString('zh-CN'));
    }
  }, [timestamp]);

  useEffect(() => {
    updateDisplay();
    if (!autoUpdate) return;

    const interval = setInterval(updateDisplay, 10000); // 每10秒更新
    return () => clearInterval(interval);
  }, [updateDisplay, autoUpdate]);

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-text-tertiary ${className}`}>
      {showIcon && <Clock className="w-3.5 h-3.5" />}
      <span>更新于 {displayText}</span>
    </span>
  );
}

// ============================================
// 5. 刷新按钮（带动画）
// ============================================

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RefreshButton({
  onRefresh,
  className = '',
  size = 'md',
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // 至少旋转1秒，提供更好的视觉反馈
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRefreshing}
      className={`p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 ${className}`}
      title="刷新数据 (R)"
    >
      <motion.div
        animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
        transition={isRefreshing ? {
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        } : {}}
      >
        <RefreshCw className={`${sizeClasses[size]} text-text-tertiary`} />
      </motion.div>
    </button>
  );
}

// ============================================
// 6. 数据同步状态指示器
// ============================================

interface SyncStatusProps {
  status: 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncTime?: number;
  className?: string;
}

export function SyncStatus({
  status,
  lastSyncTime,
  className = '',
}: SyncStatusProps) {
  const statusConfig = {
    syncing: {
      color: 'text-neon-cyan',
      bgColor: 'bg-neon-cyan/10',
      text: '同步中...',
      animate: true,
    },
    synced: {
      color: 'text-neon-green',
      bgColor: 'bg-neon-green/10',
      text: '已同步',
      animate: false,
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      text: '同步失败',
      animate: false,
    },
    offline: {
      color: 'text-text-tertiary',
      bgColor: 'bg-white/5',
      text: '离线模式',
      animate: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${config.bgColor} ${className}`}>
      <motion.div
        className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`}
        animate={config.animate ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.5, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className={`text-xs ${config.color}`}>{config.text}</span>
      {lastSyncTime && status === 'synced' && (
        <span className="text-xs text-text-tertiary">
          <LastUpdateTime timestamp={lastSyncTime} showIcon={false} />
        </span>
      )}
    </div>
  );
}

// ============================================
// 7. 批量更新进度条
// ============================================

interface BatchProgressProps {
  total: number;
  completed: number;
  failed?: number;
  label?: string;
  className?: string;
}

export function BatchProgress({
  total,
  completed,
  failed = 0,
  label,
  className = '',
}: BatchProgressProps) {
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label || '处理进度'}</span>
        <span className="text-text-tertiary">
          {completed}/{total} ({Math.round(progress)}%)
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="flex h-full">
          <motion.div
            className="h-full bg-neon-green"
            initial={{ width: 0 }}
            animate={{ width: `${(completed - failed) / total * 100}%` }}
            transition={{ duration: 0.3 }}
          />
          {failed > 0 && (
            <motion.div
              className="h-full bg-red-500"
              initial={{ width: 0 }}
              animate={{ width: `${failed / total * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>
      </div>
      {failed > 0 && (
        <p className="text-xs text-red-500">
          {failed} 个失败
        </p>
      )}
    </div>
  );
}

// ============================================
// 8. 实时数据流指示器
// ============================================

interface LiveDataIndicatorProps {
  isLive: boolean;
  dataCount?: number;
  className?: string;
  onToggle?: () => void;
}

export function LiveDataIndicator({
  isLive,
  dataCount,
  className = '',
  onToggle,
}: LiveDataIndicatorProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
        isLive 
          ? 'bg-neon-green/10 hover:bg-neon-green/20' 
          : 'bg-white/5 hover:bg-white/10'
      } ${className}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {isLive && (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-green" />
          </>
        )}
        {!isLive && (
          <span className="inline-flex rounded-full h-2.5 w-2.5 bg-text-tertiary" />
        )}
      </span>
      <span className={`text-xs font-medium ${isLive ? 'text-neon-green' : 'text-text-tertiary'}`}>
        {isLive ? '实时' : '暂停'}
      </span>
      {typeof dataCount === 'number' && (
        <span className="text-xs text-text-tertiary">
          {dataCount.toLocaleString()} 条
        </span>
      )}
    </button>
  );
}

export default {
  AnimatedNumber,
  TrendIndicator,
  TableRowHighlight,
  LastUpdateTime,
  RefreshButton,
  SyncStatus,
  BatchProgress,
  LiveDataIndicator,
};
