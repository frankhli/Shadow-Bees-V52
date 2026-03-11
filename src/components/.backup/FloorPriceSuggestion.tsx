/**
 * 底价智能建议组件 - 浮动通知样式
 * 当系统检测到底价设置不合理时给出调整建议
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';

export function FloorPriceSuggestion() {
  const { smartPricing, dismissFloorPriceSuggestion, applyFloorPriceSuggestion, currentRoomType } = useUnifiedStore();
  const suggestion = smartPricing.floorPriceSuggestion;

  // 如果建议不是针对当前房型的，自动清除
  useEffect(() => {
    if (suggestion?.show && suggestion?.roomTypeId !== currentRoomType?.id) {
      dismissFloorPriceSuggestion();
    }
  }, [suggestion, currentRoomType, dismissFloorPriceSuggestion]);

  return (
    <AnimatePresence>
      {suggestion?.show && suggestion?.roomTypeId === currentRoomType?.id && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          className={`fixed right-6 top-24 z-50 w-96 rounded-xl border shadow-2xl p-4 ${
            suggestion.trend === 'up'
              ? 'bg-neon-green/10 border-neon-green/40 shadow-neon-green/20'
              : 'bg-neon-amber/10 border-neon-amber/40 shadow-neon-amber/20'
          }`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                suggestion.trend === 'up'
                  ? 'bg-neon-green/20'
                  : 'bg-neon-amber/20'
              }`}
            >
              {suggestion.trend === 'up' ? (
                <TrendingUp className="w-5 h-5 text-neon-green" />
              ) : (
                <TrendingDown className="w-5 h-5 text-neon-amber" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-text-primary flex items-center gap-1.5 text-sm">
                  <AlertCircle className="w-3.5 h-3.5" />
                  底价调整建议
                </h4>
                <button
                  onClick={dismissFloorPriceSuggestion}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{suggestion.reason}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-secondary">建议:</span>
                  <span
                    className={`text-base font-bold font-mono ${
                      suggestion.trend === 'up' ? 'text-neon-green' : 'text-neon-amber'
                    }`}
                  >
                    ¥{suggestion.suggestedPrice}
                  </span>
                </div>
                <button
                  onClick={applyFloorPriceSuggestion}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    suggestion.trend === 'up'
                      ? 'bg-neon-green text-[#0A0E1A] hover:bg-neon-green/90'
                      : 'bg-neon-amber text-[#0A0E1A] hover:bg-neon-amber/90'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  应用
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
