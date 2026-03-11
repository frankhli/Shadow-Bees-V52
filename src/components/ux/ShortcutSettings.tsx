/**
 * 快捷键设置面板
 * Shadow-Bees V52 - 支持自定义快捷键
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Keyboard,
  RotateCcw,
  AlertCircle,
  Check,
  X,
  Search,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useShortcutConfigStore,
  type AppType,
  type ShortcutConfig,
  getCategoryLabel,
} from '@/stores/shortcutConfigStore';
import { toast } from './EnhancedToast';

interface ShortcutSettingsProps {
  appType: AppType;
}

export function ShortcutSettings({ appType }: ShortcutSettingsProps) {
  const {
    configs,
    enabled,
    showKeyPrompts,
    updateShortcut,
    resetToDefault,
    toggleShortcut,
    setEnabled,
    setShowKeyPrompts,
    checkConflict,
  } = useShortcutConfigStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const appConfigs = configs[appType];

  // 过滤和分组
  const filteredConfigs = useMemo(() => {
    let configs = appConfigs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      configs = configs.filter(
        (c) =>
          c.description.toLowerCase().includes(q) ||
          c.defaultKey.toLowerCase().includes(q) ||
          (c.customKey?.toLowerCase().includes(q) ?? false)
      );
    }

    // 按分类分组
    const groups: Record<string, ShortcutConfig[]> = {};
    configs.forEach((config) => {
      const cat = getCategoryLabel(config.category);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(config);
    });
    return groups;
  }, [appConfigs, searchQuery]);

  // 开始录制快捷键
  const startRecording = (configId: string) => {
    setEditingId(configId);
    setRecordingKeys([]);
    setIsRecording(true);
  };

  // 取消录制
  const cancelRecording = () => {
    setEditingId(null);
    setRecordingKeys([]);
    setIsRecording(false);
  };

  // 保存录制的快捷键
  const saveRecording = () => {
    if (!editingId || recordingKeys.length === 0) return;

    const keyCombo = recordingKeys.join(' ');
    const config = appConfigs.find((c) => c.id === editingId);
    if (!config) return;

    // 检查冲突
    if (checkConflict(appType, keyCombo, editingId)) {
      toast.error('快捷键冲突', '该快捷键已被其他功能占用');
      return;
    }

    updateShortcut(appType, editingId, keyCombo);
    toast.success('快捷键已更新', `${config.description}: ${keyCombo}`);
    cancelRecording();
  };

  // 键盘录制监听
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return;

    e.preventDefault();
    const key = e.key.toLowerCase();

    // 忽略修饰键单独触发
    if (['control', 'alt', 'shift', 'meta'].includes(key)) return;

    // 构建快捷键组合
    const parts: string[] = [];
    if (e.metaKey) parts.push('cmd');
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    parts.push(key);

    const combo = parts.join('+');
    if (!recordingKeys.includes(combo)) {
      setRecordingKeys((prev) => [...prev, combo]);
    }
  };

  // 重置所有
  const handleResetAll = () => {
    if (confirm('确定要重置所有快捷键为默认值吗？')) {
      resetToDefault(appType);
      toast.success('已重置', '所有快捷键已恢复默认值');
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题和控制 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neon-cyan/10 rounded-lg">
            <Keyboard className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h3 className="font-medium">键盘快捷键</h3>
            <p className="text-sm text-text-tertiary">自定义快捷键提升操作效率</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* 全局开关 */}
          <button
            onClick={() => {
              setEnabled(!enabled);
              toast.info(enabled ? '快捷键已禁用' : '快捷键已启用');
            }}
            className="flex items-center gap-2 text-sm"
          >
            {enabled ? (
              <ToggleRight className="w-5 h-5 text-neon-cyan" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-text-tertiary" />
            )}
            {enabled ? '已启用' : '已禁用'}
          </button>

          {/* 按键提示开关 */}
          <button
            onClick={() => setShowKeyPrompts(!showKeyPrompts)}
            className="flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary"
          >
            {showKeyPrompts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            按键提示
          </button>

          {/* 重置按钮 */}
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-tertiary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置全部
          </button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          placeholder="搜索快捷键..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-bg-primary border border-white/10 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
        />
      </div>

      {/* 快捷键列表 */}
      <div className="space-y-6">
        {Object.entries(filteredConfigs).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-text-tertiary mb-3">{category}</h4>
            <div className="space-y-2">
              {items.map((config) => (
                <motion.div
                  key={config.id}
                  layout
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    config.disabled
                      ? 'opacity-50 border-white/5 bg-white/5'
                      : editingId === config.id
                      ? 'border-neon-cyan bg-neon-cyan/5'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{config.description}</span>
                    {config.disabled && (
                      <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-text-tertiary">
                        已禁用
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 快捷键显示/编辑 */}
                    {editingId === config.id ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center gap-1 px-3 py-1.5 bg-bg-primary border border-neon-cyan rounded-lg min-w-[120px] h-8"
                          onKeyDown={handleKeyDown}
                          tabIndex={0}
                          autoFocus
                        >
                          {recordingKeys.length > 0 ? (
                            recordingKeys.map((k, i) => (
                              <kbd key={i} className="px-1.5 py-0.5 text-xs bg-neon-cyan/20 rounded">
                                {k}
                              </kbd>
                            ))
                          ) : (
                            <span className="text-xs text-neon-cyan animate-pulse">按键盘录入...</span>
                          )}
                        </div>
                        <button
                          onClick={saveRecording}
                          disabled={recordingKeys.length === 0}
                          className="p-1.5 text-neon-green hover:bg-neon-green/10 rounded-lg disabled:opacity-30"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelRecording}
                          className="p-1.5 text-text-tertiary hover:bg-white/10 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startRecording(config.id)}
                          className="flex items-center gap-1 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {(config.customKey || config.defaultKey).split(' ').map((k, i) => (
                            <kbd
                              key={i}
                              className={`px-1.5 py-0.5 text-xs rounded ${
                                config.customKey
                                  ? 'bg-neon-cyan/20 text-neon-cyan'
                                  : 'bg-white/10'
                              }`}
                            >
                              {k}
                            </kbd>
                          ))}
                        </button>

                        {/* 禁用开关 */}
                        <button
                          onClick={() => toggleShortcut(appType, config.id)}
                          className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-white/10 rounded-lg"
                          title={config.disabled ? '启用' : '禁用'}
                        >
                          {config.disabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        {/* 重置按钮（如果有自定义） */}
                        {config.customKey && (
                          <button
                            onClick={() => resetToDefault(appType, config.id)}
                            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-white/10 rounded-lg"
                            title="恢复默认"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(filteredConfigs).length === 0 && (
          <div className="text-center py-12 text-text-tertiary">
            <Keyboard className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>没有找到匹配的快捷键</p>
          </div>
        )}
      </div>

      {/* 提示信息 */}
      <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg text-sm text-text-tertiary">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p>提示：</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>点击快捷键区域可自定义按键组合</li>
            <li>支持序列快捷键（如 G + O）和组合键（如 Cmd + K）</li>
            <li>自定义的快捷键会显示为青色</li>
            <li>系统会检测快捷键冲突并提示</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ShortcutSettings;
