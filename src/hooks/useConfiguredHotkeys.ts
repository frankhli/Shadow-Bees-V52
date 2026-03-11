/**
 * 可配置的快捷键 Hook
 * 从 shortcutConfigStore 读取配置并应用
 * Shadow-Bees V52
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useShortcutConfigStore, type AppType, navigationPaths } from '@/stores/shortcutConfigStore';
import { useHotkeys } from './useHotkeys';
import { toast } from '@/components/ux';

interface UseConfiguredHotkeysOptions {
  appType: AppType;
  enabled?: boolean;
}

/**
 * 使用配置的快捷键
 * 从 store 读取快捷键配置并自动绑定
 */
export function useConfiguredHotkeys({ appType, enabled = true }: UseConfiguredHotkeysOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const { configs, enabled: globalEnabled } = useShortcutConfigStore();
  
  const appConfigs = configs[appType] || [];
  const isEnabled = enabled && globalEnabled;

  // 构建快捷键配置
  const hotkeyConfigs = appConfigs
    .filter(config => !config.disabled && isEnabled)
    .map(config => {
      const key = config.customKey || config.defaultKey;
      const paths = navigationPaths[appType];
      
      // 导航类快捷键
      if (config.action === 'navigate' && paths[config.id]) {
        const path = paths[config.id];
        return {
          key,
          ctrl: config.requiresCtrl,
          shift: config.requiresShift,
          alt: config.requiresAlt,
          meta: config.requiresMeta,
          description: config.description,
          handler: (): boolean => {
            if (location.pathname !== path) {
              navigate(path);
              toast.info(`导航到${config.description}`);
            }
            return true;
          },
        };
      }
      
      // 刷新
      if (config.action === 'refresh') {
        return {
          key,
          ctrl: config.requiresCtrl,
          shift: config.requiresShift,
          alt: config.requiresAlt,
          meta: config.requiresMeta,
          description: config.description,
          scope: 'global' as const,
          handler: (): boolean => {
            toast.promise(
              new Promise(resolve => {
                window.location.reload();
                resolve(undefined);
              }),
              { loading: '正在刷新...', success: '刷新成功', error: '刷新失败' }
            );
            return true;
          },
        };
      }
      
      // 帮助
      if (config.action === 'help') {
        return {
          key,
          ctrl: config.requiresCtrl,
          shift: config.requiresShift,
          alt: config.requiresAlt,
          meta: config.requiresMeta,
          description: config.description,
          handler: () => {
            // 触发打开快捷键帮助事件
            window.dispatchEvent(new CustomEvent('open-shortcut-help', { detail: { appType } }));
            return true;
          },
        };
      }
      
      // 其他操作 - 触发对应事件
      return {
        key,
        ctrl: config.requiresCtrl,
        shift: config.requiresShift,
        alt: config.requiresAlt,
        meta: config.requiresMeta,
        description: config.description,
        handler: () => {
          window.dispatchEvent(new CustomEvent('shortcut-action', { 
            detail: { action: config.action, appType, configId: config.id } 
          }));
          return true;
        },
      };
    });

  // 应用快捷键
  useHotkeys(hotkeyConfigs, [appConfigs, isEnabled, location.pathname]);
}

/**
 * 获取快捷键显示文本
 */
export function useShortcutDisplay(appType: AppType) {
  const { configs } = useShortcutConfigStore();
  const appConfigs = configs[appType] || [];
  
  const getDisplay = (configId: string): string => {
    const config = appConfigs.find(c => c.id === configId);
    if (!config) return '';
    
    const parts: string[] = [];
    if (config.requiresCtrl) parts.push('Ctrl');
    if (config.requiresShift) parts.push('Shift');
    if (config.requiresAlt) parts.push('Alt');
    if (config.requiresMeta) parts.push('⌘');
    parts.push((config.customKey || config.defaultKey).toUpperCase());
    return parts.join(' + ');
  };
  
  return { getDisplay };
}

/**
 * 监听快捷键操作事件
 */
export function useShortcutAction(
  action: string,
  handler: (detail: { appType: AppType; configId: string }) => void
) {
  useEffect(() => {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.action === action) {
        handler(customEvent.detail);
      }
    };
    
    window.addEventListener('shortcut-action', listener);
    return () => window.removeEventListener('shortcut-action', listener);
  }, [action, handler]);
}

export default useConfiguredHotkeys;
