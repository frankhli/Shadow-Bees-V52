/**
 * 表单草稿自动保存与恢复
 * Shadow-Bees V52
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface DraftOptions<T> {
  key: string;
  maxAge?: number; // 草稿有效期（毫秒），默认 7 天
  onRestore?: (data: T) => void;
  encrypt?: boolean; // 是否加密敏感数据
}

interface DraftMeta {
  timestamp: number;
  url: string;
}

// 简单的 XOR 加密（用于敏感字段）
function simpleEncrypt(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}

function simpleDecrypt(data: string, key: string): string {
  try {
    const decoded = atob(data);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

const ENCRYPT_KEY = 'shadow-bees-draft-v52';
const DRAFT_PREFIX = 'sb_draft_';
const META_PREFIX = 'sb_draft_meta_';

export function useFormDraft<T extends Record<string, any>>(
  initialData: T,
  options: DraftOptions<T>
) {
  const { key, maxAge = 7 * 24 * 60 * 60 * 1000, onRestore, encrypt = false } = options;
  const storageKey = DRAFT_PREFIX + key;
  const metaKey = META_PREFIX + key;
  
  const [data, setData] = useState<T>(initialData);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ timestamp: number; url: string } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoredRef = useRef(false);

  // 检查是否存在草稿
  useEffect(() => {
    try {
      const meta = localStorage.getItem(metaKey);
      if (meta) {
        const parsed: DraftMeta = JSON.parse(meta);
        const age = Date.now() - parsed.timestamp;
        
        if (age < maxAge) {
          setHasDraft(true);
          setDraftInfo({
            timestamp: parsed.timestamp,
            url: parsed.url,
          });
        } else {
          // 清理过期草稿
          clearDraft();
        }
      }
    } catch {
      // 忽略错误
    }
  }, [key]);

  // 自动保存
  const scheduleSave = useCallback((newData: T) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const dataToSave = encrypt 
          ? simpleEncrypt(JSON.stringify(newData), ENCRYPT_KEY)
          : JSON.stringify(newData);
        
        localStorage.setItem(storageKey, dataToSave);
        localStorage.setItem(metaKey, JSON.stringify({
          timestamp: Date.now(),
          url: window.location.pathname + window.location.search,
        }));
        
        setHasDraft(true);
      } catch (e) {
        console.warn('Failed to save draft:', e);
      }
    }, 500); // 防抖 500ms
  }, [storageKey, metaKey, encrypt]);

  // 更新数据
  const updateData = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setData(prev => {
      const newData = typeof updater === 'function' 
        ? (updater as Function)(prev)
        : { ...prev, ...updater };
      
      scheduleSave(newData);
      return newData;
    });
  }, [scheduleSave]);

  // 设置字段
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    updateData({ [field]: value } as unknown as Partial<T>);
  }, [updateData]);

  // 恢复草稿
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = encrypt 
          ? JSON.parse(simpleDecrypt(saved, ENCRYPT_KEY))
          : JSON.parse(saved);
        
        setData({ ...initialData, ...parsed });
        setHasDraft(false);
        isRestoredRef.current = true;
        onRestore?.(parsed);
        return true;
      }
    } catch (e) {
      console.warn('Failed to restore draft:', e);
    }
    return false;
  }, [storageKey, initialData, onRestore, encrypt]);

  // 清理草稿
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(metaKey);
    setHasDraft(false);
    setDraftInfo(null);
  }, [storageKey, metaKey]);

  // 提交成功后清理
  const onSubmitSuccess = useCallback(() => {
    clearDraft();
    setData(initialData);
    isRestoredRef.current = false;
  }, [clearDraft, initialData]);

  // 重置表单
  const reset = useCallback(() => {
    setData(initialData);
    clearDraft();
    isRestoredRef.current = false;
  }, [initialData, clearDraft]);

  // 清理超时
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 自动提示恢复
  useEffect(() => {
    if (hasDraft && !isRestoredRef.current) {
      // 组件可以监听 hasDraft 显示恢复提示
    }
  }, [hasDraft]);

  return {
    data,
    setData: updateData,
    setField,
    hasDraft,
    draftInfo,
    restoreDraft,
    clearDraft,
    onSubmitSuccess,
    reset,
    isRestored: isRestoredRef.current,
  };
}

// 批量清理过期草稿
export function cleanExpiredDrafts(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
  let cleaned = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(META_PREFIX)) {
        const meta = localStorage.getItem(key);
        if (meta) {
          const parsed: DraftMeta = JSON.parse(meta);
          if (Date.now() - parsed.timestamp > maxAge) {
            const dataKey = key.replace(META_PREFIX, DRAFT_PREFIX);
            localStorage.removeItem(key);
            localStorage.removeItem(dataKey);
            cleaned++;
          }
        }
      }
    }
  } catch {
    // 忽略错误
  }
  return cleaned;
}

// 获取所有草稿信息
export function getAllDrafts(): Array<{ key: string; timestamp: number; url: string }> {
  const drafts: Array<{ key: string; timestamp: number; url: string }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(META_PREFIX)) {
        const meta = localStorage.getItem(key);
        if (meta) {
          const parsed: DraftMeta = JSON.parse(meta);
          drafts.push({
            key: key.replace(META_PREFIX, ''),
            timestamp: parsed.timestamp,
            url: parsed.url,
          });
        }
      }
    }
  } catch {
    // 忽略错误
  }
  return drafts.sort((a, b) => b.timestamp - a.timestamp);
}
