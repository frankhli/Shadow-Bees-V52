/**
 * 滚动位置保持 Hook
 * 防止路由切换时自动滚动到顶部
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollRestoration() {
  const location = useLocation();
  const scrollPositions = useRef<Record<string, number>>({});
  const lastPathname = useRef(location.pathname);

  // 保存滚动位置
  useEffect(() => {
    const main = document.querySelector('main');
    
    // 当路径变化前保存当前滚动位置
    return () => {
      if (main) {
        scrollPositions.current[lastPathname.current] = main.scrollTop;
      }
    };
  }, [location.pathname]);

  // 恢复滚动位置并阻止自动滚动到顶部
  useEffect(() => {
    const main = document.querySelector('main');
    
    // 阻止浏览器的默认滚动行为
    const preventScroll = () => {
      if (main && scrollPositions.current[location.pathname] !== undefined) {
        main.scrollTop = scrollPositions.current[location.pathname];
      }
    };

    // 使用 requestAnimationFrame 确保在渲染后执行
    const timer = requestAnimationFrame(() => {
      preventScroll();
      lastPathname.current = location.pathname;
    });

    // 同时监听 popstate 事件
    const handlePopState = () => {
      preventScroll();
    };

    window.addEventListener('popstate', handlePopState);
    
    // 额外保护：在多个时机尝试恢复滚动位置
    const timers = [
      setTimeout(preventScroll, 0),
      setTimeout(preventScroll, 50),
      setTimeout(preventScroll, 100),
    ];

    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener('popstate', handlePopState);
      timers.forEach(clearTimeout);
    };
  }, [location.pathname]);

  // 提供一个手动保存和恢复的方法
  const saveScrollPosition = () => {
    const main = document.querySelector('main');
    if (main) {
      scrollPositions.current[location.pathname] = main.scrollTop;
    }
  };

  const restoreScrollPosition = () => {
    const main = document.querySelector('main');
    if (main && scrollPositions.current[location.pathname] !== undefined) {
      main.scrollTop = scrollPositions.current[location.pathname];
    }
  };

  return { saveScrollPosition, restoreScrollPosition };
}

export default useScrollRestoration;
