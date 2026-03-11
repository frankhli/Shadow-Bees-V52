/**
 * Toast 通知组件
 * 全局浮动提示，用于替代 alert
 */

import { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    // 自动关闭
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

// Toast 容器
function ToastContainer({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItemComponent key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// 单个 Toast
function ToastItemComponent({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const icons = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertTriangle,
    info: Info,
  };
  
  const colors = {
    success: 'bg-neon-green/10 border-neon-green/30 text-neon-green',
    warning: 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber',
    error: 'bg-neon-red/10 border-neon-red/30 text-neon-red',
    info: 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue',
  };
  
  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm min-w-[300px] max-w-[500px] shadow-lg ${colors[toast.type]}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// 简化的 Toast Hook（无需 Provider，直接操作 DOM）
let toastCallback: ((message: string, type?: ToastType) => void) | null = null;

export function setGlobalToast(callback: (message: string, type?: ToastType) => void) {
  toastCallback = callback;
}

export function toast(message: string, type: ToastType = 'info') {
  if (toastCallback) {
    toastCallback(message, type);
  } else {
    console.warn('Toast not initialized');
  }
}

export default ToastProvider;
