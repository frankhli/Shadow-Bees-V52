/**
 * Hooks 统一导出
 * Shadow-Bees V52
 */

// 键盘快捷键
export {
  useHotkeys,
  useHotkey,
  useSequenceHotkey,
  useGlobalHotkeys,
  hotkeyRegistry,
  type HotkeyConfig,
} from './useHotkeys';

// 可配置的快捷键
export {
  useConfiguredHotkeys,
  useShortcutDisplay,
  useShortcutAction,
} from './useConfiguredHotkeys';

// 表单草稿
export {
  useFormDraft,
  cleanExpiredDrafts,
  getAllDrafts,
} from './useFormDraft';

// 其他 hooks（保持原有导出）
export { useHotelOrderSync, useHotelContentSync, useAdminDataSync } from './useDataSync';
export { usePageAnimation } from './usePageAnimation';
export { useRefundSync } from './useRefundSync';
export { useHotelTicketSync, useAdminTicketSync } from './useTicketSync';
export { useTimeModeSync } from './useTimeModeSync';
