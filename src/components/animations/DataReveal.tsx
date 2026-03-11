/**
 * 数据揭示动画组件
 * 演示效果：数据卡片依次揭示，增强数据呈现的仪式感
 */

import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode, useEffect, useState } from 'react';

interface DataRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function DataReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: DataRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const directionOffset = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        ...directionOffset[direction],
      }}
      animate={isInView ? {
        opacity: 1,
        y: 0,
        x: 0,
      } : {}}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 计数器揭示组件
 * 从0开始计数到目标值
 */
export function CountUpReveal({
  end,
  duration = 2,
  suffix = '',
  prefix = '',
  className = '',
}: {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // 使用 easeOutQuart 缓动
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
      >
        {count.toLocaleString('zh-CN')}
      </motion.span>
      {suffix}
    </span>
  );
}

/**
 * 文字逐字揭示
 */
export function TextReveal({
  text,
  className = '',
  charDelay = 0.03,
}: {
  text: string;
  className?: string;
  charDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <span ref={ref} className={className}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.3,
            delay: i * charDelay,
            ease: 'easeOut',
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

export default DataReveal;
