/**
 * 远程配置服务（酒店端）
 * 监听管理端下发的配置更新
 */

import type { ConfigPackage, ConfigPushEvent } from '@/types/remoteConfig';

const CONFIG_CHANNEL = 'hotel_config_sync';
const STORAGE_KEY = 'sb_remote_config';
const VERSION_KEY = 'sb_config_version';

class RemoteConfigService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(config: ConfigPackage) => void> = new Set();
  private updateListeners: Set<(hasUpdate: boolean, config?: ConfigPackage) => void> = new Set();

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CONFIG_CHANNEL);
      this.setupListener();
    }
    
    // 启动时检查本地配置
    this.checkLocalConfig();
  }

  private setupListener() {
    if (!this.channel) return;

    this.channel.onmessage = (event) => {
      const message = event.data as ConfigPushEvent;
      
      if (message.type === 'CONFIG_PUSH') {
        console.log('[RemoteConfig] Received new config:', message.config);
        
        // 保存到本地
        this.savePendingConfig(message.config);
        
        // 通知有更新可用
        this.notifyUpdateAvailable(message.config);
      }
    };
  }

  /**
   * 检查本地配置状态
   */
  private checkLocalConfig() {
    const currentVersion = localStorage.getItem(VERSION_KEY) || '1.0.0';
    const pendingConfig = this.getPendingConfig();
    
    if (pendingConfig && pendingConfig.version !== currentVersion) {
      this.notifyUpdateAvailable(pendingConfig);
    }
  }

  /**
   * 获取当前运行的配置版本
   */
  getCurrentVersion(): string {
    return localStorage.getItem(VERSION_KEY) || '1.0.0';
  }

  /**
   * 获取待更新的配置
   */
  getPendingConfig(): ConfigPackage | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}_pending`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * 保存待更新配置
   */
  private savePendingConfig(config: ConfigPackage) {
    try {
      localStorage.setItem(`${STORAGE_KEY}_pending`, JSON.stringify(config));
    } catch (error) {
      console.error('[RemoteConfig] Failed to save pending config:', error);
    }
  }

  /**
   * 应用配置更新
   */
  async applyUpdate(): Promise<boolean> {
    const pendingConfig = this.getPendingConfig();
    if (!pendingConfig) return false;

    try {
      // 保存为当前配置
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingConfig));
      localStorage.setItem(VERSION_KEY, pendingConfig.version);
      
      // 清除待更新
      localStorage.removeItem(`${STORAGE_KEY}_pending`);
      
      // 通知配置已应用
      this.listeners.forEach(cb => cb(pendingConfig));
      this.updateListeners.forEach(cb => cb(false));
      
      console.log('[RemoteConfig] Config applied:', pendingConfig.version);
      return true;
    } catch (error) {
      console.error('[RemoteConfig] Failed to apply config:', error);
      return false;
    }
  }

  /**
   * 获取当前生效的配置
   */
  getCurrentConfig(): ConfigPackage | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * 检查是否有更新
   */
  hasUpdate(): boolean {
    const pending = this.getPendingConfig();
    const currentVersion = this.getCurrentVersion();
    return pending !== null && pending.version !== currentVersion;
  }

  /**
   * 订阅配置更新事件
   */
  onConfigApplied(callback: (config: ConfigPackage) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 订阅更新可用事件
   */
  onUpdateAvailable(callback: (hasUpdate: boolean, config?: ConfigPackage) => void) {
    this.updateListeners.add(callback);
    
    // 立即检查一次
    const pending = this.getPendingConfig();
    if (pending && pending.version !== this.getCurrentVersion()) {
      callback(true, pending);
    }
    
    return () => this.updateListeners.delete(callback);
  }

  private notifyUpdateAvailable(config: ConfigPackage) {
    this.updateListeners.forEach(cb => cb(true, config));
  }

  /**
   * 忽略当前更新
   */
  dismissUpdate() {
    localStorage.removeItem(`${STORAGE_KEY}_pending`);
    this.updateListeners.forEach(cb => cb(false));
  }

  /**
   * 获取配置应用历史
   */
  getUpdateHistory(): Array<{ version: string; appliedAt: string }> {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}_history`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

export const remoteConfig = new RemoteConfigService();

// Hook for React components
export function useRemoteConfig() {
  return {
    getCurrentVersion: () => remoteConfig.getCurrentVersion(),
    getPendingConfig: () => remoteConfig.getPendingConfig(),
    hasUpdate: () => remoteConfig.hasUpdate(),
    applyUpdate: () => remoteConfig.applyUpdate(),
    dismissUpdate: () => remoteConfig.dismissUpdate(),
    onUpdateAvailable: (cb: (hasUpdate: boolean, config?: ConfigPackage) => void) => 
      remoteConfig.onUpdateAvailable(cb),
    onConfigApplied: (cb: (config: ConfigPackage) => void) => 
      remoteConfig.onConfigApplied(cb),
  };
}
