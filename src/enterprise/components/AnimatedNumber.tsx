/**
 * 数字动画组件
 * 用于统计卡片等需要数字动画效果的场景
 */

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({ 
  value, 
  duration = 1.5, 
  format,
  className = '',
  prefix = '',
  suffix = ''
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  
  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // 使用 easeOutExpo 缓动函数
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const currentValue = startValue + (endValue - startValue) * easeOutExpo;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  const formattedValue = format 
    ? format(displayValue)
    : Math.round(displayValue).toLocaleString();
  
  return (
    <motion.span 
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key={value}
    >
      {prefix}{formattedValue}{suffix}
    </motion.span>
  );
}

interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
}

export function CountUp({ 
  from = 0, 
  to, 
  duration = 1.5, 
  className = '',
  format,
  prefix = '',
  suffix = ''
}: CountUpProps) {
  const spring = useSpring(from, { 
    duration: duration * 1000,
    bounce: 0
  });
  
  const display = useTransform(spring, (current) => 
    format ? format(current) : Math.round(current).toLocaleString()
  );
  
  useEffect(() => {
    spring.set(to);
  }, [spring, to]);
  
  return (
    <span className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

export default AnimatedNumber;
