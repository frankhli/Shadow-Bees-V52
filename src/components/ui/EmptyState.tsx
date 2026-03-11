/**
 * 空状态组件
 * 统一空数据展示样式
 */

import { motion } from 'framer-motion';
import { 
  Package, 
  Search, 
  FileText, 
  ImageIcon,
  Calendar,
  Bell,
  Users,
  BarChart3,
  LucideIcon
} from 'lucide-react';

interface EmptyStateProps {
  type?: 'data' | 'search' | 'image' | 'calendar' | 'notification' | 'user' | 'chart' | 'custom';
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultConfigs = {
  data: {
    icon: Package,
    title: '暂无数据',
    description: '当前没有相关数据记录',
  },
  search: {
    icon: Search,
    title: '未找到结果',
    description: '换个关键词试试',
  },
  image: {
    icon: ImageIcon,
    title: '暂无图片',
    description: '点击上传添加图片',
  },
  calendar: {
    icon: Calendar,
    title: '暂无日程',
    description: '当前日期没有安排',
  },
  notification: {
    icon: Bell,
    title: '暂无通知',
    description: '有新消息时会在这里显示',
  },
  user: {
    icon: Users,
    title: '暂无用户',
    description: '还没有相关用户数据',
  },
  chart: {
    icon: BarChart3,
    title: '暂无数据',
    description: '数据不足，无法生成图表',
  },
  custom: {
    icon: FileText,
    title: '暂无内容',
    description: '当前没有相关内容',
  },
};

export function EmptyState({
  type = 'data',
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  action,
  className = '',
}: EmptyStateProps) {
  const config = defaultConfigs[type];
  const Icon = CustomIcon || config.icon;
  const title = customTitle || config.title;
  const description = customDescription || config.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {/* 图标容器 */}
      <motion.div
        className="w-20 h-20 rounded-2xl bg-bg-tertiary border border-border-color flex items-center justify-center mb-4"
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon size={32} className="text-text-secondary opacity-50" />
      </motion.div>

      {/* 标题 */}
      <h3 className="text-lg font-medium text-text-primary mb-2">
        {title}
      </h3>

      {/* 描述 */}
      <p className="text-sm text-text-secondary max-w-xs mb-6">
        {description}
      </p>

      {/* 操作按钮 */}
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="px-4 py-2 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-all text-sm"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

export default EmptyState;
