/**
 * 全局键盘快捷键系统
 * Shadow-Bees V52 - 管理后台效率工具
 */

import { useEffect, useRef } from 'react';

export interface HotkeyConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  scope?: 'global' | 'input' | 'modal';
  handler: (e: KeyboardEvent) => void | boolean;
}

// 快捷键注册中心
class HotkeyRegistry {
  private handlers: Map<string, HotkeyConfig[]> = new Map();
  private enabled: boolean = true;

  register(config: HotkeyConfig): () => void {
    const key = this.normalizeKey(config);
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key)!.push(config);
    
    return () => {
      const list = this.handlers.get(key);
      if (list) {
        const idx = list.indexOf(config);
        if (idx > -1) list.splice(idx, 1);
      }
    };
  }

  private normalizeKey(config: HotkeyConfig): string {
    const parts: string[] = [];
    if (config.ctrl) parts.push('ctrl');
    if (config.alt) parts.push('alt');
    if (config.shift) parts.push('shift');
    if (config.meta) parts.push('meta');
    parts.push(config.key.toLowerCase());
    return parts.join('+');
  }

  handle(e: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');
    parts.push(e.key.toLowerCase());
    
    const key = parts.join('+');
    const handlers = this.handlers.get(key);
    
    if (!handlers || handlers.length === 0) return false;

    // 按 scope 优先级执行
    const sorted = handlers.sort((a, b) => {
      const scopePriority = { modal: 3, input: 2, global: 1 };
      return scopePriority[b.scope || 'global'] - scopePriority[a.scope || 'global'];
    });

    for (const config of sorted) {
      // 检查 scope 限制
      if (config.scope === 'global' && this.isInputActive()) continue;
      if (config.scope === 'modal' && !this.isModalOpen()) continue;

      const result = config.handler(e);
      if (result !== false) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    }
    return false;
  }

  private isInputActive(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    return active.tagName === 'INPUT' || 
           active.tagName === 'TEXTAREA' || 
           active.getAttribute('contenteditable') === 'true';
  }

  private isModalOpen(): boolean {
    return document.querySelector('[role="dialog"], [data-modal]') !== null;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  getAllHotkeys(): HotkeyConfig[] {
    const all: HotkeyConfig[] = [];
    this.handlers.forEach(list => all.push(...list));
    return all;
  }
}

export const hotkeyRegistry = new HotkeyRegistry();

// React Hook
export function useHotkeys(configs: HotkeyConfig[], deps: React.DependencyList = []) {
  const unregisters = useRef<(() => void)[]>([]);

  useEffect(() => {
    // 清理旧的
    unregisters.current.forEach(fn => fn());
    unregisters.current = [];

    // 注册新的
    configs.forEach(config => {
      const unregister = hotkeyRegistry.register(config);
      unregisters.current.push(unregister);
    });

    return () => {
      unregisters.current.forEach(fn => fn());
      unregisters.current = [];
    };
  }, deps);
}

// 全局快捷键监听
export function useGlobalHotkeys() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      hotkeyRegistry.handle(e);
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);
}

// 快捷注册单个快捷键
export function useHotkey(
  key: string,
  handler: (e: KeyboardEvent) => void | boolean,
  options?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
    description?: string;
    scope?: 'global' | 'input' | 'modal';
  },
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const config: HotkeyConfig = {
      key,
      handler,
      description: options?.description || '',
      scope: options?.scope || 'global',
      ctrl: options?.ctrl,
      alt: options?.alt,
      shift: options?.shift,
      meta: options?.meta,
    };

    const unregister = hotkeyRegistry.register(config);
    return unregister;
  }, deps);
}

// 序列快捷键 (如 G + O)
export function useSequenceHotkey(
  sequence: string[],
  handler: () => void,
  _description: string,
  deps: React.DependencyList = []
) {
  const sequenceRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      // 在输入框中不触发
      const active = document.activeElement;
      if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') {
        sequenceRef.current = [];
        return;
      }

      const key = e.key.toLowerCase();
      sequenceRef.current.push(key);

      // 清理超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        sequenceRef.current = [];
      }, 1000);

      // 检查序列匹配
      const current = sequenceRef.current;
      if (current.length >= sequence.length) {
        const lastN = current.slice(-sequence.length);
        if (lastN.every((k, i) => k === sequence[i].toLowerCase())) {
          e.preventDefault();
          handler();
          sequenceRef.current = [];
        }
      }
    };

    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('keydown', keyHandler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, deps);
}
