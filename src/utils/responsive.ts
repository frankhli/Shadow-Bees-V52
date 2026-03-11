/**
 * 响应式工具
 * Shadow-Bees V52 - 断点、响应式检测
 */

import { useState, useEffect } from 'react';

// 断点定义
export const breakpoints = {
  xs: 0,      // 手机
  sm: 640,    // 大手机
  md: 768,    // 平板竖屏
  lg: 1024,   // 平板横屏 / 小笔记本
  xl: 1280,   // 笔记本
  '2xl': 1536,// 大屏幕
} as const;

export type Breakpoint = keyof typeof breakpoints;

// 使用当前断点
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('xl');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1536) setBp('2xl');
      else if (width >= 1280) setBp('xl');
      else if (width >= 1024) setBp('lg');
      else if (width >= 768) setBp('md');
      else if (width >= 640) setBp('sm');
      else setBp('xs');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return bp;
}

// 检测设备类型
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const bp = useBreakpoint();
  if (bp === 'xs' || bp === 'sm') return 'mobile';
  if (bp === 'md' || bp === 'lg') return 'tablet';
  return 'desktop';
}

// 响应式 class 生成器
export function responsive<T extends Record<string, string>>(
  config: T
): string {
  return Object.entries(config)
    .map(([bp, value]) => {
      if (bp === 'xs') return value;
      return `${bp}:${value}`;
    })
    .join(' ');
}

// 表格列响应式隐藏
export function getVisibleColumns<T>(
  columns: T[],
  breakpoint: Breakpoint,
  visibilityMap: Record<string, Breakpoint[]>
): T[] {
  const priority: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = priority.indexOf(breakpoint);

  return columns.filter((col: any) => {
    const key = col.key || col.id || col.dataIndex;
    const visibleAt = visibilityMap[key] || ['xs'];
    return visibleAt.some((bp) => priority.indexOf(bp) <= currentIndex);
  });
}

// 导航栏模式
export function useNavMode(): 'sidebar' | 'bottom' | 'drawer' {
  const device = useDeviceType();
  if (device === 'mobile') return 'bottom';
  if (device === 'tablet') return 'drawer';
  return 'sidebar';
}
