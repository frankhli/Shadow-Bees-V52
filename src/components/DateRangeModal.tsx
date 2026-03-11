/**
 * 日期范围选择弹窗
 * 用于自定义时间维度筛选
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar } from 'lucide-react';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
}

export function DateRangeModal({ isOpen, onClose, onConfirm }: DateRangeModalProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const handleConfirm = () => {
    if (startDate && endDate) {
      onConfirm(startDate, endDate);
      onClose();
    }
  };

  // 快捷选项
  const quickOptions = [
    { label: '最近7天', days: 7 },
    { label: '最近30天', days: 30 },
    { label: '本月', days: 0, type: 'month' as const },
    { label: '上月', days: 0, type: 'lastMonth' as const },
  ];

  const applyQuickOption = (option: typeof quickOptions[0]) => {
    const end = new Date();
    const start = new Date();
    
    if (option.type === 'month') {
      start.setDate(1);
    } else if (option.type === 'lastMonth') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
    } else {
      start.setDate(start.getDate() - option.days);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗 - 使用flex居中 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-md mx-4 z-10"
      >
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6 shadow-2xl">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00F0FF]" />
              <h3 className="text-lg font-semibold text-text-primary">选择日期范围</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-border-color transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* 快捷选项 */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => applyQuickOption(option)}
                className="px-4 py-2 rounded-lg bg-bg-primary border border-border-color text-sm text-text-secondary hover:border-[#00F0FF]/50 hover:text-[#00F0FF] transition-all"
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* 日期输入 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-text-secondary mb-2">开始日期</label>
              <input
                type="date"
                value={startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-bg-primary border border-border-color rounded-lg text-text-secondary focus:outline-none focus:border-[#00F0FF]/50 cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-2">结束日期</label>
              <input
                type="date"
                value={endDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-bg-primary border border-border-color rounded-lg text-text-secondary focus:outline-none focus:border-[#00F0FF]/50 cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border-color text-text-secondary hover:bg-border-color transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF]/30 transition-colors"
            >
              确认
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
