/**
 * 运营后台统计卡片组件
 */

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: any;
  color: string;
  delay?: number;
}

export function StatCard({ title, value, change, trend, icon: Icon, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#151B2B] rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-4">
        {trend === 'up' ? (
          <TrendingUp size={14} className="text-neon-green" />
        ) : (
          <TrendingDown size={14} className="text-neon-red" />
        )}
        <span className={`text-sm ${trend === 'up' ? 'text-neon-green' : 'text-neon-red'}`}>
          {change}
        </span>
        <span className="text-gray-500 text-sm">较昨日</span>
      </div>
    </motion.div>
  );
}
