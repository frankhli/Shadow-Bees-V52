/**
 * 对比条形图组件
 * 用于展示目标 vs 实际、本期 vs 上期等对比数据
 */

import { motion } from 'framer-motion';

interface ComparisonBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
  showPercent?: boolean;
}

export function ComparisonBar({
  label,
  current,
  target,
  unit = '',
  color = '#A855F7',
  showPercent = true,
}: ComparisonBarProps) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isExceeded = current > target;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color }}>
            {current.toLocaleString()}{unit}
          </span>
          {showPercent && target > 0 && (
            <span className={`text-xs ${isExceeded ? 'text-neon-green' : 'text-text-muted'}`}>
              / {target.toLocaleString()}{unit}
            </span>
          )}
        </div>
      </div>
      
      {/* 进度条背景 */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        {/* 目标线 */}
        <div 
          className="h-full relative"
          style={{ width: '100%' }}
        >
          {/* 实际进度 */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percent, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ 
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}40`,
            }}
          />
          
          {/* 超出标记 */}
          {isExceeded && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-neon-green rounded-full"
              style={{ boxShadow: '0 0 10px rgba(0, 227, 150, 0.5)' }}
            />
          )}
        </div>
      </div>
      
      {/* 完成度标签 */}
      {target > 0 && (
        <div className="flex justify-end">
          <span className={`text-xs ${isExceeded ? 'text-neon-green' : 'text-text-muted'}`}>
            {isExceeded ? '已超额 ' : ''}{percent.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// 多组对比条形图
interface ComparisonGroupProps {
  title?: string;
  items: ComparisonBarProps[];
  layout?: 'vertical' | 'horizontal';
}

export function ComparisonGroup({ title, items, layout = 'vertical' }: ComparisonGroupProps) {
  if (layout === 'horizontal') {
    return (
      <div className="space-y-4">
        {title && <h4 className="text-sm font-medium text-text-secondary">{title}</h4>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl bg-surface border border-border-color"
            >
              <ComparisonBar {...item} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h4 className="text-sm font-medium text-text-secondary">{title}</h4>}
      <div className="space-y-4">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ComparisonBar {...item} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default ComparisonBar;
