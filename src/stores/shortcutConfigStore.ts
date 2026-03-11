/**
 * 快捷键配置 Store
 * Shadow-Bees V52 - 支持自定义快捷键
 * 
 * 注意：所有快捷键默认需要按住 Control 键触发，避免误触
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppType = 'hotel' | 'group' | 'admin';

export interface ShortcutConfig {
  id: string;
  action: string;
  description: string;
  defaultKey: string;
  customKey?: string;
  category: 'navigation' | 'action' | 'edit' | 'view';
  requiresMeta?: boolean;
  requiresCtrl?: boolean;
  requiresAlt?: boolean;
  requiresShift?: boolean;
  disabled?: boolean;
}

interface ShortcutState {
  // 各端的快捷键配置
  configs: Record<AppType, ShortcutConfig[]>;
  // 全局开关
  enabled: boolean;
  // 是否显示按键提示
  showKeyPrompts: boolean;
}

interface ShortcutActions {
  // 更新快捷键
  updateShortcut: (appType: AppType, id: string, customKey: string) => void;
  // 重置为默认
  resetToDefault: (appType: AppType, id?: string) => void;
  // 禁用/启用快捷键
  toggleShortcut: (appType: AppType, id: string) => void;
  // 设置全局开关
  setEnabled: (enabled: boolean) => void;
  // 设置按键提示
  setShowKeyPrompts: (show: boolean) => void;
  // 获取有效的快捷键
  getEffectiveKey: (appType: AppType, id: string) => string;
  // 检查快捷键是否冲突
  checkConflict: (appType: AppType, key: string, excludeId?: string) => boolean;
}

// 默认快捷键配置 - 所有导航快捷键都需要 Ctrl 键
const defaultConfigs: Record<AppType, ShortcutConfig[]> = {
  // 酒店端 (Hotel) - 匹配 Layout.tsx 导航菜单
  hotel: [
    // 主导航 - Ctrl+数字
    { id: 'nav.overview', action: 'navigate', description: '经营概览', defaultKey: '1', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.market', action: 'navigate', description: '市场情报', defaultKey: '2', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.pricing', action: 'navigate', description: '收益管理', defaultKey: '3', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.content', action: 'navigate', description: '去卖货', defaultKey: '4', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.inventory', action: 'navigate', description: '钱货盘点', defaultKey: '5', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.service', action: 'navigate', description: '客户咨询', defaultKey: '6', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.support', action: 'navigate', description: '工单支持', defaultKey: '7', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.settings', action: 'navigate', description: '系统设置', defaultKey: '8', requiresCtrl: true, category: 'navigation' },
    
    // 子页面导航 - Ctrl+Shift+字母
    // 市场情报子页面
    { id: 'nav.market.events', action: 'navigate', description: '事件情报', defaultKey: 'e', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.market.competitors', action: 'navigate', description: '竞品分析', defaultKey: 'c', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    
    // 收益管理子页面
    { id: 'nav.pricing.platform', action: 'navigate', description: '实时定价', defaultKey: 'p', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.pricing.future', action: 'navigate', description: '未来预测', defaultKey: 'f', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.pricing.approval', action: 'navigate', description: '价格审批', defaultKey: 'a', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    
    // 去卖货子页面
    { id: 'nav.content.factory', action: 'navigate', description: '内容工厂', defaultKey: 't', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.content.publish', action: 'navigate', description: '发布状态', defaultKey: 'u', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    
    // 客户咨询子页面
    { id: 'nav.service.ai', action: 'navigate', description: 'AI客服', defaultKey: 'i', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.service.human', action: 'navigate', description: '人工工作台', defaultKey: 'h', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    
    // 钱货盘点子页面
    { id: 'nav.inventory.rooms', action: 'navigate', description: '库存与房态', defaultKey: 'r', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.inventory.orders', action: 'navigate', description: '订单管理', defaultKey: 'o', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.inventory.finance', action: 'navigate', description: '财务合规', defaultKey: 'v', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    
    // 操作
    { id: 'action.commandPalette', action: 'commandPalette', description: '打开命令面板', defaultKey: 'k', requiresCtrl: true, category: 'action' },
    { id: 'action.refresh', action: 'refresh', description: '刷新数据', defaultKey: 'r', requiresCtrl: true, category: 'action' },
    { id: 'action.help', action: 'help', description: '快捷键帮助', defaultKey: '/', requiresCtrl: true, category: 'action' },
    { id: 'action.search', action: 'search', description: '聚焦搜索', defaultKey: 's', requiresCtrl: true, category: 'action' },
    
    // 定价操作
    { id: 'pricing.apply', action: 'applyPrice', description: '应用建议价格', defaultKey: 'y', requiresCtrl: true, requiresShift: true, category: 'edit' },
  ],
  
  // 集团端 (Group) - 匹配 group/App.tsx 和 group/Layout.tsx
  group: [
    // 导航
    { id: 'nav.dashboard', action: 'navigate', description: '每日简报', defaultKey: '1', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.ai', action: 'navigate', description: 'AI价值', defaultKey: '2', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.hotels', action: 'navigate', description: '门店全景', defaultKey: '3', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.channels', action: 'navigate', description: '渠道分析', defaultKey: '4', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.strategy', action: 'navigate', description: '策略中心', defaultKey: '5', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.operations', action: 'navigate', description: '运营中心', defaultKey: '6', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.inventory', action: 'navigate', description: '库存日历', defaultKey: '7', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.finance', action: 'navigate', description: '财务合规', defaultKey: '8', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.settings', action: 'navigate', description: '系统设置', defaultKey: '9', requiresCtrl: true, category: 'navigation' },
    // 操作
    { id: 'action.commandPalette', action: 'commandPalette', description: '打开命令面板', defaultKey: 'k', requiresCtrl: true, category: 'action' },
    { id: 'action.refresh', action: 'refresh', description: '刷新数据', defaultKey: 'r', requiresCtrl: true, category: 'action' },
    { id: 'action.help', action: 'help', description: '快捷键帮助', defaultKey: '/', requiresCtrl: true, category: 'action' },
    // 分析
    { id: 'analysis.export', action: 'export', description: '导出报表', defaultKey: 'e', requiresCtrl: true, category: 'edit' },
    { id: 'analysis.compare', action: 'compare', description: '新建对比', defaultKey: 'n', requiresCtrl: true, category: 'edit' },
  ],
  
  // 管理端 (Admin) - 匹配 admin/components/AdminLayout.tsx 导航菜单
  admin: [
    // 导航 - 主菜单 (Ctrl + 数字)
    { id: 'nav.dashboard', action: 'navigate', description: '数据与运营中心', defaultKey: '1', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.customers', action: 'navigate', description: '客户与服务中心', defaultKey: '2', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.algorithm', action: 'navigate', description: '数据与算法中心', defaultKey: '3', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.monitor', action: 'navigate', description: '异常与监控中心', defaultKey: '4', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.channels', action: 'navigate', description: '渠道与运营中心', defaultKey: '5', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.support', action: 'navigate', description: '工单与支持中心', defaultKey: '6', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.finance', action: 'navigate', description: '财务与结算中心', defaultKey: '7', requiresCtrl: true, category: 'navigation' },
    { id: 'nav.system', action: 'navigate', description: '系统与配置中心', defaultKey: '8', requiresCtrl: true, category: 'navigation' },
    
    // 子页面导航 (Ctrl + Shift + 字母)
    { id: 'nav.pricing-insights', action: 'navigate', description: '算法与定价洞察', defaultKey: 'p', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.warehouse', action: 'navigate', description: '数据仓库', defaultKey: 'w', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.training', action: 'navigate', description: '培训管理', defaultKey: 't', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.sla', action: 'navigate', description: 'SLA监控', defaultKey: 's', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    { id: 'nav.analytics', action: 'navigate', description: '工单分析', defaultKey: 'a', requiresCtrl: true, requiresShift: true, category: 'navigation' },
    
    // 操作
    { id: 'action.commandPalette', action: 'commandPalette', description: '打开命令面板', defaultKey: 'k', requiresCtrl: true, category: 'action' },
    { id: 'action.refresh', action: 'refresh', description: '刷新数据', defaultKey: 'r', requiresCtrl: true, category: 'action' },
    { id: 'action.help', action: 'help', description: '快捷键帮助', defaultKey: '/', requiresCtrl: true, category: 'action' },
    { id: 'action.search', action: 'search', description: '聚焦搜索', defaultKey: 'f', requiresCtrl: true, category: 'action' },
    
    // 客户操作
    { id: 'customer.new', action: 'newCustomer', description: '新建客户', defaultKey: 'n', requiresCtrl: true, requiresShift: true, category: 'edit' },
    { id: 'customer.search', action: 'searchCustomer', description: '搜索客户', defaultKey: 'f', requiresCtrl: true, requiresShift: true, category: 'action' },
    
    // 工单操作
    { id: 'ticket.new', action: 'newTicket', description: '新建工单', defaultKey: 't', requiresCtrl: true, requiresShift: true, category: 'edit' },
    { id: 'ticket.assign', action: 'assignTicket', description: '分配工单', defaultKey: 'a', requiresCtrl: true, requiresAlt: true, category: 'edit' },
  ],
};

// 导航路径映射
export const navigationPaths: Record<AppType, Record<string, string>> = {
  hotel: {
    // 主导航
    'nav.overview': '/',
    'nav.market': '/market',
    'nav.pricing': '/pricing',
    'nav.content': '/content',
    'nav.inventory': '/inventory',
    'nav.service': '/service',
    'nav.support': '/support',
    'nav.settings': '/settings',
    // 市场情报子页面
    'nav.market.events': '/market?tab=events',
    'nav.market.competitors': '/market?tab=competitors',
    // 收益管理子页面
    'nav.pricing.platform': '/pricing?tab=platform',
    'nav.pricing.future': '/pricing?tab=future',
    'nav.pricing.approval': '/pricing?tab=approval',
    // 去卖货子页面
    'nav.content.factory': '/content',
    'nav.content.publish': '/publish',
    // 客户咨询子页面
    'nav.service.ai': '/service',
    'nav.service.human': '/service/human',
    // 钱货盘点子页面
    'nav.inventory.rooms': '/inventory',
    'nav.inventory.orders': '/orders',
    'nav.inventory.finance': '/finance',
  },
  group: {
    'nav.dashboard': '/',
    'nav.ai': '/ai',
    'nav.hotels': '/hotels',
    'nav.channels': '/channels',
    'nav.strategy': '/strategy',
    'nav.operations': '/operations',
    'nav.inventory': '/inventory',
    'nav.finance': '/finance',
    'nav.settings': '/settings',
  },
  admin: {
    'nav.dashboard': '/',
    'nav.customers': '/customers',
    'nav.algorithm': '/pricing-insights',
    'nav.monitor': '/anomalies',
    'nav.channels': '/channels',
    'nav.support': '/support',
    'nav.finance': '/finance',
    'nav.system': '/system',
    'nav.pricing-insights': '/pricing-insights',
    'nav.warehouse': '/warehouse',
    'nav.training': '/training',
    'nav.sla': '/support/sla',
    'nav.analytics': '/support/analytics',
  },
};

export const useShortcutConfigStore = create<ShortcutState & ShortcutActions>()(
  persist(
    (set, get) => ({
      configs: defaultConfigs,
      enabled: true,
      showKeyPrompts: true,

      updateShortcut: (appType, id, customKey) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [appType]: state.configs[appType].map((config) =>
              config.id === id ? { ...config, customKey } : config
            ),
          },
        }));
      },

      resetToDefault: (appType, id) => {
        if (id) {
          set((state) => ({
            configs: {
              ...state.configs,
              [appType]: state.configs[appType].map((config) =>
                config.id === id ? { ...config, customKey: undefined } : config
              ),
            },
          }));
        } else {
          set((state) => ({
            configs: {
              ...state.configs,
              [appType]: defaultConfigs[appType],
            },
          }));
        }
      },

      toggleShortcut: (appType, id) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [appType]: state.configs[appType].map((config) =>
              config.id === id ? { ...config, disabled: !config.disabled } : config
            ),
          },
        }));
      },

      setEnabled: (enabled) => set({ enabled }),

      setShowKeyPrompts: (showKeyPrompts) => set({ showKeyPrompts }),

      getEffectiveKey: (appType, id) => {
        const config = get().configs[appType].find((c) => c.id === id);
        if (!config || config.disabled) return '';
        return config.customKey || config.defaultKey;
      },

      checkConflict: (appType, key, excludeId) => {
        const configs = get().configs[appType];
        return configs.some(
          (config) =>
            config.id !== excludeId &&
            !config.disabled &&
            (config.customKey || config.defaultKey).toLowerCase() === key.toLowerCase()
        );
      },
    }),
    {
      name: 'sb-shortcut-config-v2', // 更新存储名称，强制刷新默认配置
      version: 2,
    }
  )
);

// 获取分类标签
export function getCategoryLabel(category: ShortcutConfig['category']): string {
  const labels = {
    navigation: '页面导航',
    action: '快捷操作',
    edit: '编辑操作',
    view: '查看操作',
  };
  return labels[category];
}

// 格式化快捷键显示
export function formatShortcut(key: string, meta?: boolean, ctrl?: boolean, shift?: boolean, alt?: boolean): string {
  const parts: string[] = [];
  if (meta) parts.push('⌘');
  if (ctrl) parts.push('Ctrl');
  if (shift) parts.push('Shift');
  if (alt) parts.push('Alt');
  parts.push(key.toUpperCase());
  return parts.join(' + ');
}

// 从配置生成快捷键显示文本
export function formatShortcutFromConfig(config: ShortcutConfig): string {
  return formatShortcut(
    config.customKey || config.defaultKey,
    config.requiresMeta,
    config.requiresCtrl,
    config.requiresShift,
    config.requiresAlt
  );
}

export default useShortcutConfigStore;
