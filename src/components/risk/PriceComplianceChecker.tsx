/**
 * 价格合规检测组件
 * 检查定价是否在合理区间（PMS底价70%-125%）
 */

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { PriceComplianceResult } from '@/types/risk';

interface PriceComplianceCheckerProps {
  price: number;
  basePrice: number;  // PMS底价
  minDiscount?: number;  // 默认0.7 (70%)
  maxMarkup?: number;    // 默认1.25 (125%)
  onResult?: (result: PriceComplianceResult) => void;
  className?: string;
}

export function PriceComplianceChecker({
  price,
  basePrice,
  minDiscount = 0.7,
  maxMarkup = 1.25,
  onResult,
  className = ''
}: PriceComplianceCheckerProps) {
  const [result, setResult] = useState<PriceComplianceResult | null>(null);

  const checkPrice = useCallback((): PriceComplianceResult => {
    const minPrice = basePrice * minDiscount;
    const maxPrice = basePrice * maxMarkup;
    
    const isValid = price >= minPrice && price <= maxPrice;
    const isTooLow = price < minPrice;
    const isTooHigh = price > maxPrice;
    
    let suggestion = '';
    if (isTooLow) {
      suggestion = `价格过低，低于PMS底价的${(minDiscount * 100).toFixed(0)}%。建议定价至少¥${Math.ceil(minPrice)}`;
    } else if (isTooHigh) {
      suggestion = `价格偏高，超过PMS底价的${(maxMarkup * 100).toFixed(0)}%。可能会影响转化率`;
    } else {
      const discountRate = ((price / basePrice) * 100).toFixed(0);
      if (parseInt(discountRate) < 90) {
        suggestion = `当前定价为底价的${discountRate}%，有竞争力且符合平台规则`;
      } else {
        suggestion = '当前定价在合理范围内';
      }
    }

    return {
      isValid,
      minPrice,
      maxPrice,
      currentPrice: price,
      basePrice,
      suggestion,
      isTooLow,
      isTooHigh
    };
  }, [price, basePrice, minDiscount, maxMarkup]);

  useEffect(() => {
    if (!price || !basePrice) {
      setResult(null);
      return;
    }

    const checkResult = checkPrice();
    setResult(checkResult);
    onResult?.(checkResult);
  }, [price, basePrice, checkPrice, onResult]);

  if (!price || !basePrice) {
    return (
      <div className={`flex items-center gap-2 text-sm text-text-secondary ${className}`}>
        <DollarSign size={16} />
        <span>输入价格后将检测合规性</span>
      </div>
    );
  }

  if (!result) return null;

  const { isValid, minPrice, maxPrice, currentPrice, basePrice: base, suggestion, isTooLow, isTooHigh } = result;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 价格状态卡片 */}
      <div className={`p-3 rounded-lg border ${
        isValid
          ? 'bg-neon-green/10 border-neon-green/30'
          : 'bg-neon-red/10 border-neon-red/30'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle size={18} className="text-neon-green" />
            ) : (
              <AlertTriangle size={18} className="text-neon-red" />
            )}
            <span className={`font-medium ${isValid ? 'text-neon-green' : 'text-neon-red'}`}>
              {isValid ? '价格合规' : '价格不合规'}
            </span>
          </div>
          <div className="text-sm text-text-secondary">
            底价: ¥{base}
          </div>
        </div>

        {/* 价格区间可视化 */}
        <div className="relative h-6 bg-bg-tertiary rounded-full overflow-hidden mb-2">
          {/* 价格区间背景 */}
          <div 
            className="absolute top-0 h-full bg-neon-green/20"
            style={{
              left: `${minDiscount * 100}%`,
              right: `${100 - maxMarkup * 100}%`
            }}
          />
          {/* 当前价格指示器 */}
          <div 
            className={`absolute top-0 w-1 h-full ${
              isValid ? 'bg-neon-green' : 'bg-neon-red'
            }`}
            style={{
              left: `${Math.min(Math.max((currentPrice / base) * 50, 0), 100)}%`
            }}
          />
          {/* 标签 */}
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
            <span className="text-text-secondary">底价</span>
            <span className="text-neon-green">合规区间</span>
            <span className="text-text-secondary">上限</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">
            最低: ¥{minPrice.toFixed(0)}
          </span>
          <span className={`font-medium ${
            isTooLow ? 'text-neon-red' : isTooHigh ? 'text-neon-amber' : 'text-neon-green'
          }`}>
            当前: ¥{currentPrice}
          </span>
          <span className="text-text-secondary">
            最高: ¥{maxPrice.toFixed(0)}
          </span>
        </div>
      </div>

      {/* 建议提示 */}
      <div className={`flex items-start gap-2 p-2 rounded text-sm ${
        isValid ? 'bg-neon-green/5 text-text-secondary' : 'bg-neon-red/5 text-neon-red'
      }`}>
        {isTooLow ? (
          <TrendingDown size={16} className="flex-shrink-0 mt-0.5" />
        ) : isTooHigh ? (
          <TrendingUp size={16} className="flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
        )}
        <span>{suggestion}</span>
      </div>

      {/* 风险提示 */}
      {!isValid && (
        <div className="p-2 bg-neon-amber/10 border border-neon-amber/20 rounded text-xs text-neon-amber">
          <strong>平台规则：</strong>价格低于底价的70%可能被判定为异常定价，导致限流或下架
        </div>
      )}
    </div>
  );
}
