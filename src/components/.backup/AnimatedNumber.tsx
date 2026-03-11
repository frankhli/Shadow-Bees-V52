/**
 * 数字增长动画组件
 * 演示效果：收入、订单数等数据从0滚动到目标值
 */

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform, useInView } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  startOnView?: boolean;
  formatter?: (val: number) => string;
}

export function AnimatedNumber({
  value,
  duration = 2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  startOnView = true,
  formatter,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hasStarted, setHasStarted] = useState(!startOnView);

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const display = useTransform(spring, (current) => {
    if (formatter) {
      return formatter(current);
    }
    return current.toFixed(decimals);
  });

  useEffect(() => {
    if (isInView && startOnView) {
      setHasStarted(true);
    }
  }, [isInView, startOnView]);

  useEffect(() => {
    if (hasStarted) {
      spring.set(value);
    }
  }, [hasStarted, value, spring]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

/**
 * 货币金额动画组件
 */
export function AnimatedCurrency({
  value,
  currency = '¥',
  className = '',
  ...props
}: Omit<AnimatedNumberProps, 'prefix' | 'formatter'> & { currency?: string }) {
  return (
    <AnimatedNumber
      value={value}
      prefix={currency}
      decimals={0}
      className={className}
      formatter={(val) => val.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
      {...props}
    />
  );
}

/**
 * 百分比动画组件
 */
export function AnimatedPercentage({
  value,
  className = '',
  ...props
}: Omit<AnimatedNumberProps, 'suffix' | 'decimals'>) {
  return (
    <AnimatedNumber
      value={value}
      suffix="%"
      decimals={1}
      className={className}
      {...props}
    />
  );
}

export default AnimatedNumber;
