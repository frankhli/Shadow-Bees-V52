/**
 * 动画统计卡片
 * 专为演示优化的数据展示组件
 */

import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode } from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { AnimatedCurrency, AnimatedNumber, AnimatedPercentage } from './AnimatedNumber';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  type?: 'currency' | 'number' | 'percentage';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: LucideIcon;
  color: string;
  delay?: number;
  subtitle?: string;
}

export function AnimatedStatCard({
  title,
  value,
  type = 'number',
  trend = 'neutral',
  trendValue = '',
  icon: Icon,
  color,
  delay = 0,
  subtitle,
}: AnimatedStatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const getTrendColor = () => {
    if (trend === 'up') return '#00E396';
    if (trend === 'down') return '#FF4757';
    return '#6B7280';
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ 
        y: -4,
        boxShadow: `0 20px 40px ${color}15`,
        transition: { duration: 0.2 }
      }}
      className="relative p-5 rounded-xl border overflow-hidden cursor-pointer group"
      style={{ 
        borderColor: `${color}30`,
        background: 'linear-gradient(135deg, rgba(21, 27, 43, 0.9) 0%, rgba(11, 15, 25, 0.9) 100%)',
      }}
    >
      {/* 顶部色条 */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: color }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.8, delay: delay + 0.2 }}
      />
      
      {/* 悬停光效 */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}10 0%, transparent 70%)`,
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary">{title}</span>
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Icon size={20} style={{ color }} />
          </motion.div>
        </div>

        <div className="text-3xl font-bold font-mono mb-2" style={{ color }}>
          {type === 'currency' && (
            <AnimatedCurrency value={value} duration={1.5} />
          )}
          {type === 'number' && (
            <AnimatedNumber value={value} duration={1.5} />
          )}
          {type === 'percentage' && (
            <AnimatedPercentage value={value} duration={1.5} />
          )}
        </div>

        {subtitle && (
          <div className="text-xs text-text-secondary mb-2">{subtitle}</div>
        )}

        {trendValue && (
          <motion.div 
            className="flex items-center gap-1 text-xs"
            style={{ color: getTrendColor() }}
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: delay + 0.5 }}
          >
            {trend === 'up' && <TrendingUp size={12} />}
            {trend === 'down' && <TrendingDown size={12} />}
            <span>{trendValue}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * 带动画的列表项
 */
export function AnimatedListItem({
  children,
  index = 0,
  onClick,
}: {
  children: ReactNode;
  index?: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.03)' }}
      onClick={onClick}
      className="cursor-pointer rounded-lg transition-colors"
    >
      {children}
    </motion.div>
  );
}

export default AnimatedStatCard;
