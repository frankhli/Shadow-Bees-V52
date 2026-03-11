/**
 * 智能数字格式化工具
 * 根据数字大小自动选择中文单位（万/亿），符合中国用户习惯
 */

export interface SmartFormatResult {
  value: string;
  unit: string;
  prefix: string;
  fullValue: string; // 完整值，用于 tooltip
}

/**
 * 智能金额格式化 - 根据数字大小自动选择中文单位
 * @param amount 金额
 * @param prefix 前缀符号（如 ¥）
 * @param decimals 小数位数
 * @returns 格式化结果
 */
export function formatSmartAmount(
  amount: number,
  prefix: string = '¥',
  decimals: number = 1
): SmartFormatResult {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 100_000_000) {
    // 亿级别
    return { 
      value: (amount / 100_000_000).toFixed(decimals), 
      unit: '亿', 
      prefix,
      fullValue: `${prefix}${amount.toLocaleString()}`
    };
  } else if (absAmount >= 10_000) {
    // 万级别
    return { 
      value: (amount / 10_000).toFixed(decimals), 
      unit: '万', 
      prefix,
      fullValue: `${prefix}${amount.toLocaleString()}`
    };
  } else {
    // 小数字显示原值
    return { 
      value: amount.toFixed(0), 
      unit: '', 
      prefix,
      fullValue: `${prefix}${amount.toLocaleString()}`
    };
  }
}

/**
 * 智能数量格式化 - 用于订单数、曝光量等非金额数字
 * @param count 数量
 * @param decimals 小数位数
 * @returns 格式化结果
 */
export function formatSmartCount(
  count: number,
  decimals: number = 1
): SmartFormatResult {
  const absCount = Math.abs(count);
  
  if (absCount >= 100_000_000) {
    return { 
      value: (count / 100_000_000).toFixed(decimals), 
      unit: '亿', 
      prefix: '',
      fullValue: count.toLocaleString()
    };
  } else if (absCount >= 10_000) {
    return { 
      value: (count / 10_000).toFixed(decimals), 
      unit: '万', 
      prefix: '',
      fullValue: count.toLocaleString()
    };
  } else {
    return { 
      value: count.toFixed(0), 
      unit: '', 
      prefix: '',
      fullValue: count.toLocaleString()
    };
  }
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * 格式化货币（完整显示，用于详情展示）
 */
export function formatCurrency(amount: number, prefix: string = '¥'): string {
  return `${prefix}${amount.toLocaleString()}`;
}

/**
 * 格式化 GMV（万为单位）
 */
export function formatGMV(amount: number): string {
  if (amount >= 10_000) {
    return `${(amount / 10_000).toFixed(1)}万`;
  }
  return `¥${amount.toLocaleString()}`;
}
