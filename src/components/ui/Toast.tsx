/**
 * Toast 提示组件 - 酒店端
 * 替代原生 alert，更优雅的提示方式
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastItemProps extends Toast {
  onClose: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-neon-green/10 border-neon-green/30 text-neon-green',
  error: 'bg-neon-red/10 border-neon-red/30 text-neon-red',
  warning: 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber',
  info: 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan',
};

function ToastItem({ type, title, message, onClose }: ToastItemProps) {
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`flex items-start gap-3 p-4 rounded-lg border min-w-[300px] backdrop-blur-sm ${styles[type]}`}
    >
      <Icon size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {message && <p className="text-sm opacity-80 mt-1">{message}</p>}
      </div>
      <button
        onClick={onClose}
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-6 right-6 z-[100] space-y-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            {...toast}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// 简单的全局状态管理
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...toasts]));
};

export const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { ...toast, id }];
  notifyListeners();

  // 3秒后自动移除
  setTimeout(() => {
    removeToast(id);
  }, 3000);
};

export const removeToast = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
};

export const subscribeToToasts = (listener: (toasts: Toast[]) => void) => {
  toastListeners.push(listener);
  listener([...toasts]);
  return () => {
    toastListeners = toastListeners.filter((l) => l !== listener);
  };
};

// Hook 版本
export function useToast() {
  return {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
  };
}

export default ToastItem;
