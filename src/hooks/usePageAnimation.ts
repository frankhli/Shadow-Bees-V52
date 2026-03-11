/**
 * 页面动画 Hook
 * 为演示提供统一的页面进入动画控制
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageAnimation() {
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // 页面切换时触发动画
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return {
    isAnimating,
    pageKey: location.pathname,
  };
}

/**
 * 数字动画 Hook
 */
export function useCountUp(
  end: number,
  duration: number = 2000,
  startOnMount: boolean = true
) {
  const [count, setCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!startOnMount) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // 使用 easeOutQuart 缓动
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, startOnMount]);

  return { count, isComplete };
}

export default usePageAnimation;
