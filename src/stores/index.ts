/**
 * Shadow-Bees V52 - Store统一导出
 */

// 统一状态管理（新版本，包含完整联动）
export { useUnifiedStore } from './unifiedStore';
export type { TimeMode } from './unifiedStore';

// 为了保持向后兼容，也导出旧store
// 但这些将在未来版本中被弃用
export { useAppStore } from './appStore';
export { useTimeModeStore } from './timeModeStore';
export { useShortcutConfigStore } from './shortcutConfigStore';
// export { useDashboardStore } from './dashboardStore';  // 暂时注释掉
