/**
 * 增强 Toast 通知系统
 * Shadow-Bees V52 - 支持撤销、进度、聚合通知
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  RotateCcw,

  Bell
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  
  // 增强功能
  undo?: () => void;
  undoLabel?: string;
  undoTimeout?: number;
  
  progress?: number; // 0-100
  progressLabel?: string;
  
  actions?: ToastAction[];
  
  // 分组
  groupId?: string;
  groupCount?: number;
}

interface ToastState {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => string;
  remove: (id: string) => void;
  update: (id: string, updates: Partial<Toast>) => void;
  removeAll: () => void;
  
  // 便捷方法
  success: (title: string, message?: string, options?: Partial<Toast>) => string;
  error: (title: string, message?: string, options?: Partial<Toast>) => string;
  info: (title: string, message?: string, options?: Partial<Toast>) => string;
  warning: (title: string, message?: string, options?: Partial<Toast>) => string;
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => Promise<T>;
  undo: (title: string, onUndo: () => void, timeout?: number) => string;
  progress: (title: string, progress: number, label?: string) => string;
  grouped: (groupId: string, title: string, message: string) => string;
}

// 全局状态
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

// 创建 Toast 状态管理
export function createToastStore(): ToastState {
  const add = (toast: Omit<Toast, 'id'>): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { 
      id, 
      duration: 5000,
      ...toast 
    };
    
    // 检查是否已存在相同 groupId 的 toast，进行聚合
    if (toast.groupId) {
      const existingIndex = toasts.findIndex(t => t.groupId === toast.groupId);
      if (existingIndex !== -1) {
        const existing = toasts[existingIndex];
        const updated: Toast = {
          ...existing,
          groupCount: (existing.groupCount || 1) + 1,
          title: toast.title,
          message: `${existing.groupCount || 1} 个新${toast.message}`,
        };
        toasts = [
          updated,
          ...toasts.filter((_, i) => i !== existingIndex)
        ];
        notifyListeners();
        return existing.id;
      }
    }
    
    toasts = [newToast, ...toasts];
    notifyListeners();
    
    // 自动关闭
    if (!toast.persistent && !toast.progress) {
      setTimeout(() => {
        remove(id);
      }, toast.duration || 5000);
    }
    
    return id;
  };

  const remove = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  };

  const update = (id: string, updates: Partial<Toast>) => {
    toasts = toasts.map(t => t.id === id ? { ...t, ...updates } : t);
    notifyListeners();
  };

  const removeAll = () => {
    toasts = [];
    notifyListeners();
  };

  return {
    toasts,
    add,
    remove,
    update,
    removeAll,
    
    success: (title, message, options) => 
      add({ type: 'success', title, message, ...options }),
    
    error: (title, message, options) => 
      add({ type: 'error', title, message, duration: 8000, ...options }),
    
    info: (title, message, options) => 
      add({ type: 'info', title, message, ...options }),
    
    warning: (title, message, options) => 
      add({ type: 'warning', title, message, duration: 6000, ...options }),
    
    promise: async (promise, messages) => {
      const id = add({
        type: 'info',
        title: messages.loading,
        persistent: true,
      });
      
      try {
        const result = await promise;
        update(id, {
          type: 'success',
          title: messages.success,
          persistent: false,
          duration: 3000,
        });
        return result;
      } catch (error) {
        update(id, {
          type: 'error',
          title: messages.error,
          persistent: false,
          duration: 5000,
        });
        throw error;
      }
    },
    
    undo: (title, onUndo, timeout = 5000) => 
      add({
        type: 'info',
        title,
        undo: onUndo,
        undoLabel: '撤销',
        undoTimeout: timeout,
        duration: timeout,
      }),
    
    progress: (title, progress, label) => {
      const existing = toasts.find(t => t.title === title && t.progress !== undefined);
      if (existing) {
        update(existing.id, { progress, progressLabel: label });
        if (progress >= 100) {
          setTimeout(() => remove(existing.id), 1000);
        }
        return existing.id;
      }
      return add({
        type: 'info',
        title,
        progress,
        progressLabel: label,
        persistent: true,
      });
    },
    
    grouped: (groupId, title, message) =>
      add({
        type: 'info',
        title,
        message,
        groupId,
      }),
  };
}

// 全局 Toast 实例
export const toast = createToastStore();

// React Hook
export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setLocalToasts(newToasts);
    toastListeners.push(listener);
    setLocalToasts([...toasts]);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);
  
  return { 
    toasts: localToasts, 
    add: toast.add, 
    remove: toast.remove, 
    update: toast.update, 
    removeAll: toast.removeAll, 
    success: toast.success, 
    error: toast.error, 
    info: toast.info, 
    warning: toast.warning, 
    promise: toast.promise, 
    undo: toast.undo, 
    progress: toast.progress, 
    grouped: toast.grouped 
  };
}

// 图标映射
const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  error: 'text-red-500 border-red-500/30 bg-red-500/10',
  info: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  warning: 'text-neon-amber border-neon-amber/30 bg-neon-amber/10',
};

// Toast 项组件
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [undoTimeLeft, setUndoTimeLeft] = useState(toast.undoTimeout || 0);
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const Icon = iconMap[toast.type];
  
  // 撤销倒计时
  useEffect(() => {
    if (toast.undo && toast.undoTimeout) {
      setUndoTimeLeft(toast.undoTimeout);
      const interval = setInterval(() => {
        setUndoTimeLeft(prev => {
          if (prev <= 100) {
            clearInterval(interval);
            return 0;
          }
          return prev - 100;
        });
      }, 100);
      
      undoTimerRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [toast.undo, toast.undoTimeout]);
  
  const handleUndo = () => {
    toast.undo?.();
    onRemove(toast.id);
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`relative w-full max-w-sm p-4 rounded-xl border shadow-lg backdrop-blur-sm ${colorMap[toast.type]}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{toast.title}</p>
            {toast.groupCount && toast.groupCount > 1 && (
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                {toast.groupCount}
              </span>
            )}
          </div>
          
          {toast.message && (
            <p className="text-sm opacity-80 mt-1 line-clamp-2">{toast.message}</p>
          )}
          
          {/* 进度条 */}
          {toast.progress !== undefined && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1 opacity-70">
                <span>{toast.progressLabel || '处理中...'}</span>
                <span>{Math.round(toast.progress)}%</span>
              </div>
              <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-current"
                  initial={{ width: 0 }}
                  animate={{ width: `${toast.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
          
          {/* 撤销按钮 */}
          {toast.undo && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {toast.undoLabel || '撤销'}
              </button>
              {undoTimeLeft > 0 && (
                <div className="flex-1 h-0.5 bg-black/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-current transition-all duration-100"
                    style={{ width: `${(undoTimeLeft / (toast.undoTimeout || 5000)) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* 自定义操作 */}
          {toast.actions && toast.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {toast.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-white/20 hover:bg-white/30'
                      : 'bg-transparent hover:bg-white/10'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={() => onRemove(toast.id)}
          className="p-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Toast 容器组件
interface ToastContainerProps {
  position?: ToastPosition;
}

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const { toasts, remove } = useToast();
  
  const positionClasses = {
    'top-left': 'top-4 left-4 items-start',
    'top-right': 'top-4 right-4 items-end',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-left': 'bottom-4 left-4 items-start',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
  };

  return (
    <div className={`fixed z-[9999] flex flex-col gap-2 pointer-events-none ${positionClasses[position]}`}>
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={remove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// 通知中心组件（持久通知）
export function NotificationCenter() {
  const { toasts, remove, removeAll } = useToast();
  const persistentToasts = toasts.filter(t => t.persistent);
  const [isOpen, setIsOpen] = useState(false);
  
  if (persistentToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9998]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border border-white/10 rounded-lg shadow-lg hover:bg-white/5 transition-colors"
      >
        <Bell className="w-4 h-4" />
        <span className="w-5 h-5 flex items-center justify-center text-xs bg-neon-cyan text-black rounded-full">
          {persistentToasts.length}
        </span>
      </button>
      
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full right-0 mt-2 w-80 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="font-medium">通知中心</span>
            <button
              onClick={removeAll}
              className="text-xs text-text-tertiary hover:text-text-primary"
            >
              全部清除
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {persistentToasts.map(toast => (
              <ToastItem key={toast.id} toast={toast} onRemove={remove} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default ToastContainer;
