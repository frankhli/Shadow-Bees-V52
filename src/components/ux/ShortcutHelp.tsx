/**
 * 快捷键帮助面板
 * Shadow-Bees V52 - 支持酒店/集团/管理三端
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command, ArrowRight, CornerDownLeft, Search, RefreshCw } from 'lucide-react';
import type { AppType } from './CommandPalette';

interface ShortcutHelpProps {
  appType: AppType;
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const shortcutsConfig: Record<AppType, ShortcutGroup[]> = {
  hotel: [
    {
      title: '全局操作',
      shortcuts: [
        { keys: ['⌘', 'K'], description: '打开命令面板' },
        { keys: ['?'], description: '打开快捷键帮助' },
        { keys: ['Esc'], description: '关闭弹窗 / 返回上一级' },
        { keys: ['R'], description: '刷新当前页面数据' },
      ],
    },
    {
      title: '页面导航 (G + ...)',
      shortcuts: [
        { keys: ['G', 'O'], description: '跳转经营概览' },
        { keys: ['G', 'M'], description: '跳转市场情报' },
        { keys: ['G', 'P'], description: '跳转收益管理' },
        { keys: ['G', 'C'], description: '跳转去卖货' },
        { keys: ['G', 'I'], description: '跳转库存管理' },
        { keys: ['G', 'S'], description: '跳转客户服务' },
        { keys: ['G', 'F'], description: '跳转财务合规' },
        { keys: ['G', ','], description: '跳转系统设置' },
      ],
    },
    {
      title: '定价操作',
      shortcuts: [
        { keys: ['N', 'P'], description: '新建定价方案' },
        { keys: ['A', 'P'], description: '应用建议价格' },
        { keys: ['Space'], description: '暂停/继续实时监控' },
        { keys: ['F'], description: '切换定价模式' },
      ],
    },
    {
      title: '搜索与筛选',
      shortcuts: [
        { keys: ['/'], description: '聚焦搜索框' },
        { keys: ['Ctrl', 'F'], description: '页面内查找' },
        { keys: ['T'], description: '按时间筛选' },
        { keys: ['P'], description: '按平台筛选' },
      ],
    },
  ],
  group: [
    {
      title: '全局操作',
      shortcuts: [
        { keys: ['⌘', 'K'], description: '打开命令面板' },
        { keys: ['?'], description: '打开快捷键帮助' },
        { keys: ['Esc'], description: '关闭弹窗 / 返回上一级' },
        { keys: ['R'], description: '刷新当前页面数据' },
      ],
    },
    {
      title: '页面导航 (G + ...)',
      shortcuts: [
        { keys: ['G', 'D'], description: '跳转集团概览' },
        { keys: ['G', 'H'], description: '跳转酒店管理' },
        { keys: ['G', 'R'], description: '跳转收益中心' },
        { keys: ['G', 'S'], description: '跳转策略中心' },
        { keys: ['G', 'C'], description: '跳转渠道分析' },
        { keys: ['G', 'O'], description: '跳转运营指挥中心' },
        { keys: ['G', 'A'], description: '跳转异常中心' },
        { keys: ['G', 'G'], description: '跳转内容治理' },
        { keys: ['G', ','], description: '跳转系统设置' },
      ],
    },
    {
      title: '对比与分析',
      shortcuts: [
        { keys: ['N', 'C'], description: '新建对比分析' },
        { keys: ['E', 'E'], description: '导出报表' },
        { keys: ['D'], description: '切换日期范围' },
        { keys: ['H'], description: '切换热力图视图' },
      ],
    },
    {
      title: '搜索与筛选',
      shortcuts: [
        { keys: ['/'], description: '聚焦搜索框' },
        { keys: ['Ctrl', 'F'], description: '页面内查找' },
        { keys: ['F', 'H'], description: '筛选酒店' },
        { keys: ['F', 'R'], description: '筛选区域' },
      ],
    },
  ],
  admin: [
    {
      title: '全局操作',
      shortcuts: [
        { keys: ['⌘', 'K'], description: '打开命令面板' },
        { keys: ['?'], description: '打开快捷键帮助' },
        { keys: ['Esc'], description: '关闭弹窗 / 返回上一级' },
        { keys: ['R'], description: '刷新当前页面数据' },
      ],
    },
    {
      title: '页面导航 (G + ...)',
      shortcuts: [
        { keys: ['G', 'D'], description: '跳转管理驾驶舱' },
        { keys: ['G', 'C'], description: '跳转客户成功' },
        { keys: ['G', 'T'], description: '跳转培训管理' },
        { keys: ['G', 'K'], description: '跳转到工单中心' },
        { keys: ['G', 'O'], description: '跳转内容管理' },
        { keys: ['G', 'A'], description: '跳转异常管理' },
        { keys: ['G', ','], description: '跳转系统管理' },
      ],
    },
    {
      title: '客户操作',
      shortcuts: [
        { keys: ['N', 'C'], description: '新建客户' },
        { keys: ['S', 'C'], description: '搜索客户' },
        { keys: ['H', 'H'], description: '查看健康度报告' },
        { keys: ['T', 'T'], description: '安排培训' },
      ],
    },
    {
      title: '工单操作',
      shortcuts: [
        { keys: ['N', 'T'], description: '新建工单' },
        { keys: ['A', 'A'], description: '分配工单' },
        { keys: ['M', 'R'], description: '标记已解决' },
        { keys: ['U'], description: '升级工单' },
      ],
    },
    {
      title: '搜索与筛选',
      shortcuts: [
        { keys: ['/'], description: '聚焦搜索框' },
        { keys: ['Ctrl', 'F'], description: '页面内查找' },
        { keys: ['F', 'S'], description: '按状态筛选' },
        { keys: ['F', 'P'], description: '按优先级筛选' },
      ],
    },
  ],
};

export function ShortcutHelp({ appType, isOpen, onClose }: ShortcutHelpProps) {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'tips'>('shortcuts');
  const shortcuts = shortcutsConfig[appType];

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const formatKey = (key: string) => {
    if (key === '⌘') return isMac ? '⌘' : 'Ctrl';
    if (key === 'Ctrl' && isMac) return '⌘';
    return key;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-bg-secondary rounded-xl shadow-2xl border border-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-cyan/20 rounded-lg">
                <Keyboard className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">键盘快捷键</h2>
                <p className="text-sm text-text-tertiary">使用键盘快速操作系统</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 标签页 */}
          <div className="flex gap-1 px-6 pt-4">
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'shortcuts'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              快捷键列表
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'tips'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              效率技巧
            </button>
          </div>

          {/* 内容 */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'shortcuts' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shortcuts.map((group, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
                      {group.title}
                    </h3>
                    <div className="space-y-2">
                      {group.shortcuts.map((shortcut, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <span className="text-sm">{shortcut.description}</span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, kIdx) => (
                              <kbd
                                key={kIdx}
                                className="px-2 py-1 text-xs font-mono bg-white/10 rounded border border-white/10"
                              >
                                {formatKey(key)}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Command className="w-4 h-4 text-neon-cyan" />
                    使用命令面板
                  </h4>
                  <p className="text-sm text-text-tertiary">
                    按 <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">⌘ K</kbd> 或 
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">Ctrl K</kbd> 打开命令面板，
                    可以快速跳转到任意页面或执行操作，无需记忆所有快捷键。
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-neon-violet" />
                    序列快捷键
                  </h4>
                  <p className="text-sm text-text-tertiary">
                    导航快捷键使用序列模式：先按 <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">G</kbd>，
                    然后快速按第二个键（如 <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">O</kbd>）跳转到经营概览。
                    两次按键间隔不超过 1 秒。
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CornerDownLeft className="w-4 h-4 text-neon-amber" />
                    表单快捷操作
                  </h4>
                  <p className="text-sm text-text-tertiary">
                    在表单中按 <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">⌘ Enter</kbd> 或
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">Ctrl Enter</kbd> 快速提交。
                    未完成的表单会自动保存草稿，下次访问时提示恢复。
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4 text-neon-pink" />
                    快速搜索
                  </h4>
                  <p className="text-sm text-text-tertiary">
                    按 <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">/</kbd> 快速聚焦搜索框。
                    在搜索框中使用 <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">↓</kbd> 在搜索结果间切换。
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-neon-green" />
                    数据刷新
                  </h4>
                  <p className="text-sm text-text-tertiary">
                    按 <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-text-primary">R</kbd> 刷新当前页面数据，
                    无需等待自动刷新周期。刷新时数字会有高亮动画提示更新。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 底部 */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5">
            <span className="text-xs text-text-tertiary">
              提示：按 <kbd className="px-1.5 py-0.5 bg-white/10 rounded">?</kbd> 随时打开此面板
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-colors"
            >
              知道了
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ShortcutHelp;
