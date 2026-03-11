/**
 * 空状态组件
 * Shadow-Bees V52 - 情感化设计，引导用户操作
 */

import { motion } from 'framer-motion';
import {
  Search,
  FileX,
  Inbox,
  AlertCircle,
  Plus,
  RefreshCw,
  Filter,
  Database,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

export type EmptyType = 
  | 'search'      // 搜索结果为空
  | 'data'        // 无数据
  | 'error'       // 加载失败
  | 'filter'      // 筛选结果为空
  | 'create'      // 引导创建
  | 'notification' // 无通知
  | 'chart'       // 图表无数据
  | 'custom';     // 自定义

interface EmptyStateProps {
  type?: EmptyType;
  title?: string;
  description?: string;
  icon?: LucideIcon;  // eslint-disable-line @typescript-eslint/no-unused-vars
  illustration?: React.ReactNode;
  
  // 操作按钮
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  
  // 辅助链接
  helpLink?: {
    label: string;
    href: string;
  };
  
  // 尺寸
  size?: 'sm' | 'md' | 'lg';
  
  // 自定义类名
  className?: string;
}

// 预设配置
const presets: Record<EmptyType, { icon: LucideIcon; defaultTitle: string; defaultDesc: string }> = {
  search: {
    icon: Search,
    defaultTitle: '未找到相关结果',
    defaultDesc: '尝试使用其他关键词，或检查拼写是否正确',
  },
  data: {
    icon: Database,
    defaultTitle: '暂无数据',
    defaultDesc: '当前没有可显示的数据，请稍后再试',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: '加载失败',
    defaultDesc: '数据加载出错，请检查网络连接后重试',
  },
  filter: {
    icon: Filter,
    defaultTitle: '没有符合条件的数据',
    defaultDesc: '尝试调整筛选条件，或清除筛选器查看全部数据',
  },
  create: {
    icon: Plus,
    defaultTitle: '开始创建第一条记录',
    defaultDesc: '还没有任何内容，点击下方按钮开始创建',
  },
  notification: {
    icon: Inbox,
    defaultTitle: '没有新通知',
    defaultDesc: '当前没有待处理的通知，一切正常',
  },
  chart: {
    icon: BarChart3,
    defaultTitle: '暂无图表数据',
    defaultDesc: '数据量不足以生成图表，请稍后查看',
  },
  custom: {
    icon: FileX,
    defaultTitle: '暂无内容',
    defaultDesc: '当前没有可显示的内容',
  },
};

// 场景化插图组件
function SceneIllustration({ type }: { type: EmptyType }) {
  const scenes: Record<string, React.ReactNode> = {
    search: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-4 border-2 border-dashed border-neon-cyan/30 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Search className="w-12 h-12 text-text-tertiary" />
        </div>
        {/* 搜索点动画 */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-neon-cyan rounded-full"
            style={{
              top: '50%',
              left: '50%',
            }}
            animate={{
              x: [0, Math.cos(i * 2.09) * 50, 0],
              y: [0, Math.sin(i * 2.09) * 50, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    ),
    data: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl border border-white/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="absolute inset-4 flex items-center justify-center"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Database className="w-16 h-16 text-text-tertiary" />
        </motion.div>
      </div>
    ),
    error: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ 
            x: [0, -3, 3, -3, 3, 0],
          }}
          transition={{ 
            duration: 0.5, 
            repeat: Infinity, 
            repeatDelay: 3 
          }}
        >
          <AlertCircle className="w-16 h-16 text-red-500" />
        </motion.div>
        <motion.div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-red-500/20 rounded-full blur-sm"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    ),
    create: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute inset-0 bg-neon-cyan/5 rounded-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-16 h-16 text-neon-cyan" />
        </motion.div>
        {/* 光线效果 */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-4 bg-neon-cyan/30 rounded-full"
            style={{
              transformOrigin: 'center',
              transform: `rotate(${i * 45}deg) translateY(-40px)`,
            }}
            animate={{ opacity: [0.3, 0.8, 0.3], scaleY: [1, 1.3, 1] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    ),
    notification: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ 
            rotate: [0, 10, -10, 10, -10, 0],
          }}
          transition={{ 
            duration: 0.5, 
            repeat: Infinity, 
            repeatDelay: 4 
          }}
        >
          <Inbox className="w-16 h-16 text-neon-green" />
        </motion.div>
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 bg-neon-green rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          <span className="text-xs">✓</span>
        </motion.div>
      </div>
    ),
    filter: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ 
            filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'],
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity 
          }}
        >
          <Filter className="w-16 h-16 text-text-tertiary" />
        </motion.div>
      </div>
    ),
    chart: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute bottom-4 left-4 right-4 h-16 flex items-end justify-center gap-2"
        >
          {[0.3, 0.5, 0.4, 0.7, 0.5].map((h, i) => (
            <motion.div
              key={i}
              className="w-4 bg-white/10 rounded-t"
              initial={{ height: 0 }}
              animate={{ height: `${h * 60}px` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            />
          ))}
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <BarChart3 className="w-12 h-12 text-text-tertiary/50" />
        </div>
      </div>
    ),
    custom: (
      <div className="relative w-32 h-32 mx-auto">
        <motion.div
          className="absolute inset-0 border-2 border-dashed border-white/10 rounded-2xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileX className="w-12 h-12 text-text-tertiary" />
        </div>
      </div>
    ),
  };

  return scenes[type] || scenes.custom;
}

export function EmptyState({
  type = 'custom',
  title,
  description,
  illustration: CustomIllustration,
  primaryAction,
  secondaryAction,
  helpLink,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const preset = presets[type];
  const finalTitle = title || preset.defaultTitle;
  const finalDesc = description || preset.defaultDesc;

  const sizeClasses = {
    sm: {
      wrapper: 'p-6',
      icon: 'w-12 h-12',
      title: 'text-base',
      desc: 'text-xs',
      illustration: 'w-24 h-24',
    },
    md: {
      wrapper: 'p-8',
      icon: 'w-16 h-16',
      title: 'text-lg',
      desc: 'text-sm',
      illustration: 'w-32 h-32',
    },
    lg: {
      wrapper: 'p-12',
      icon: 'w-20 h-20',
      title: 'text-xl',
      desc: 'text-base',
      illustration: 'w-40 h-40',
    },
  };

  const classes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center text-center ${classes.wrapper} ${className}`}
    >
      {/* 插图或图标 */}
      {CustomIllustration ? (
        CustomIllustration
      ) : (
        <div className={`${classes.illustration} mb-4`}>
          <SceneIllustration type={type} />
        </div>
      )}

      {/* 标题 */}
      <h3 className={`${classes.title} font-semibold text-text-primary mb-2`}>
        {finalTitle}
      </h3>

      {/* 描述 */}
      <p className={`${classes.desc} text-text-tertiary max-w-sm mb-6`}>
        {finalDesc}
      </p>

      {/* 操作按钮 */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={primaryAction.onClick}
              className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan rounded-lg text-sm font-medium transition-colors"
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
              {primaryAction.label}
            </motion.button>
          )}
        </div>
      )}

      {/* 帮助链接 */}
      {helpLink && (
        <a
          href={helpLink.href}
          className="mt-4 text-sm text-neon-cyan hover:underline"
        >
          {helpLink.label}
        </a>
      )}
    </motion.div>
  );
}

// 快捷场景组件
export function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      type="search"
      title={`未找到 "${query}" 的相关结果`}
      description="尝试使用其他关键词，或检查拼写是否正确"
      primaryAction={{
        label: '清除搜索',
        onClick: onClear,
      }}
      secondaryAction={{
        label: '查看全部',
        onClick: onClear,
      }}
    />
  );
}

export function EmptyTable({ 
  onCreate, 
  createLabel = '创建第一条记录',
  resourceName = '记录',
}: { 
  onCreate: () => void; 
  createLabel?: string;
  resourceName?: string;
}) {
  return (
    <EmptyState
      type="create"
      title={`暂无${resourceName}`}
      description={`还没有任何${resourceName}，点击下方按钮开始创建`}
      primaryAction={{
        label: createLabel,
        onClick: onCreate,
        icon: Plus,
      }}
    />
  );
}

export function EmptyChart({ title = '暂无数据' }: { title?: string }) {
  return (
    <EmptyState
      type="chart"
      title={title}
      description="数据量不足以生成图表，请稍后查看"
      size="sm"
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      type="notification"
      title="没有新通知"
      description="当前没有待处理的通知，一切正常 🎉"
      size="sm"
    />
  );
}

export function ErrorState({ 
  onRetry,
  message = '数据加载出错',
}: { 
  onRetry: () => void;
  message?: string;
}) {
  return (
    <EmptyState
      type="error"
      title="加载失败"
      description={message}
      primaryAction={{
        label: '重新加载',
        onClick: onRetry,
        icon: RefreshCw,
      }}
    />
  );
}

export default EmptyState;
