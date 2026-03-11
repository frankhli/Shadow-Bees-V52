/**
 * 数字滚动动画 Hook
 * 
 * 使用场景：数据展示时的数字递增动画效果
 */
import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  duration?: number;
  easing?: (t: number) => number;
}

// easeOutQuart 缓动函数
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export function useCountUp(
  endValue: number,
  options: UseCountUpOptions = {}
) {
  const { duration = 1500, easing = easeOutQuart } = options;
  const [count, setCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // 重置状态
    setIsComplete(false);
    startTimeRef.current = null;
    startValueRef.current = count;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      
      const currentValue = startValueRef.current + (endValue - startValueRef.current) * easedProgress;
      setCount(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
        setCount(endValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [endValue, duration, easing]);

  return { count, isComplete };
}

export default useCountUp;
