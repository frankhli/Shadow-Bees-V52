/**
 * 热力图组件
 * 用于展示门店分布、区域效能等数据
 */

import { motion } from 'framer-motion';

interface HeatmapData {
  id: string;
  label: string;
  value: number;
  subLabel?: string;
}

interface HeatmapProps {
  data: HeatmapData[];
  title?: string;
  colorScheme?: 'green' | 'blue' | 'purple' | 'orange';
  onItemClick?: (item: HeatmapData) => void;
}

const colorSchemes = {
  green: {
    bg: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'],
    text: ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-emerald-400'],
  },
  blue: {
    bg: ['bg-blue-900', 'bg-blue-700', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300'],
    text: ['text-blue-400', 'text-blue-300', 'text-blue-200', 'text-blue-200', 'text-blue-100'],
  },
  purple: {
    bg: ['bg-purple-900', 'bg-purple-700', 'bg-purple-500', 'bg-purple-400', 'bg-purple-300'],
    text: ['text-purple-400', 'text-purple-300', 'text-purple-200', 'text-purple-200', 'text-purple-100'],
  },
  orange: {
    bg: ['bg-gray-700', 'bg-gray-600', 'bg-orange-600', 'bg-orange-500', 'bg-yellow-500'],
    text: ['text-gray-400', 'text-gray-300', 'text-orange-400', 'text-orange-300', 'text-yellow-400'],
  },
};

export function Heatmap({ data, title, colorScheme = 'green', onItemClick }: HeatmapProps) {
  if (data.length === 0) return null;
  
  const scheme = colorSchemes[colorScheme];
  
  // 计算值范围
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  // 获取颜色等级 (0-4)
  const getColorIndex = (value: number) => {
    const normalized = (value - min) / range;
    return Math.min(Math.floor(normalized * 4), 4);
  };
  
  // 排序数据（从大到小）
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-medium text-text-secondary">{title}</h4>}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {sortedData.map((item, index) => {
          const colorIdx = getColorIndex(item.value);
          const isHigh = colorIdx >= 3;
          
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onItemClick?.(item)}
              className={`
                relative p-3 rounded-lg text-left transition-all
                ${scheme.bg[colorIdx]} 
                ${onItemClick ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
                ${isHigh ? 'ring-2 ring-white/20' : ''}
              `}
            >
              <p className="text-sm font-medium text-white truncate">{item.label}</p>
              {item.subLabel && (
                <p className="text-xs text-white/70 truncate">{item.subLabel}</p>
              )}
              <p className="text-lg font-bold text-white mt-1">
                {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
              </p>
              
              {/* 排名徽章 */}
              {index < 3 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-gray-900 text-xs font-bold flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* 图例 */}
      <div className="flex items-center justify-between text-xs text-text-muted pt-2">
        <span>低</span>
        <div className="flex gap-1">
          {scheme.bg.map((color, i) => (
            <div key={i} className={`w-6 h-2 rounded ${color}`} />
          ))}
        </div>
        <span>高</span>
      </div>
    </div>
  );
}

// 简化版热力网格（用于紧凑展示）
export function HeatmapGrid({ 
  data, 
  colorScheme = 'green' 
}: { 
  data: HeatmapData[]; 
  colorScheme?: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const scheme = colorSchemes[colorScheme];
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const getColorIndex = (value: number) => {
    const normalized = (value - min) / range;
    return Math.min(Math.floor(normalized * 4), 4);
  };

  return (
    <div className="grid grid-cols-8 sm:grid-cols-12 gap-1">
      {data.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.02 }}
          title={`${item.label}: ${item.value}${item.subLabel ? ` (${item.subLabel})` : ''}`}
          className={`
            aspect-square rounded-sm ${scheme.bg[getColorIndex(item.value)]}
          `}
        />
      ))}
    </div>
  );
}

export default Heatmap;
