/**
 * Toast Provider - 全局 Toast 容器
 * 在 Layout 中使用，提供全局提示能力
 */

import { useState, useEffect } from 'react';
import { ToastContainer, subscribeToToasts, Toast } from './Toast';

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts(setToasts);
    return unsubscribe;
  }, []);

  const handleRemove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return <ToastContainer toasts={toasts} onRemove={handleRemove} />;
}

export default ToastProvider;
