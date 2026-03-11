/**
 * 命令面板 - 全局快捷操作入口
 * Shadow-Bees V52 - 支持酒店/集团/管理三端
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Home,
  Building2,
  DollarSign,
  Package,
  Users,
  Settings,
  FileText,
  BarChart3,
  Radar,
  Rocket,
  MessageCircle,
  Ticket,
  AlertTriangle,
  GraduationCap,
  ChevronRight,
  Command,
  TrendingUp,
  MapPin,
  Briefcase,
  Crown,
  Shield,
  Keyboard,
  X,
  RefreshCw,
} from 'lucide-react';


export type AppType = 'hotel' | 'group' | 'admin';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  section: string;
  action: () => void;
  badge?: string | number;
}

interface CommandPaletteProps {
  appType: AppType;
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcutHelp?: () => void;
}

// 页面导航配置
const navigationCommands: Record<AppType, CommandItem[]> = {
  hotel: [
    {
      id: 'nav-overview',
      title: '经营概览',
      subtitle: '今日数据、趋势分析',
      icon: <Home className="w-5 h-5" />,
      shortcut: 'G O',
      keywords: ['overview', 'dashboard', '今日', '首页'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-market',
      title: '市场情报',
      subtitle: '事件情报、竞品分析',
      icon: <Radar className="w-5 h-5" />,
      shortcut: 'G M',
      keywords: ['market', 'competitor', '事件', '竞品'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-pricing',
      title: '收益管理',
      subtitle: '实时定价、未来预测',
      icon: <DollarSign className="w-5 h-5" />,
      shortcut: 'G P',
      keywords: ['pricing', 'price', '定价', '收益'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-content',
      title: '去卖货',
      subtitle: '内容生成、发布管理',
      icon: <Rocket className="w-5 h-5" />,
      shortcut: 'G C',
      keywords: ['content', 'publish', '内容', '发布'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-inventory',
      title: '库存管理',
      subtitle: '房态管理、库存分配',
      icon: <Package className="w-5 h-5" />,
      shortcut: 'G I',
      keywords: ['inventory', 'room', '库存', '房态'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-service',
      title: '客户服务',
      subtitle: 'AI对话、人工客服',
      icon: <MessageCircle className="w-5 h-5" />,
      shortcut: 'G S',
      keywords: ['service', 'chat', '客服', '对话'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-finance',
      title: '财务合规',
      subtitle: '财务报表、合规检查',
      icon: <FileText className="w-5 h-5" />,
      shortcut: 'G F',
      keywords: ['finance', 'report', '财务', '报表'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-settings',
      title: '系统设置',
      subtitle: '账号、通知、偏好',
      icon: <Settings className="w-5 h-5" />,
      shortcut: 'G ,',
      keywords: ['settings', 'config', '设置', '配置'],
      section: '导航',
      action: () => {},
    },
  ],
  group: [
    {
      id: 'nav-dashboard',
      title: '集团概览',
      subtitle: '全集团数据总览',
      icon: <Building2 className="w-5 h-5" />,
      shortcut: 'G D',
      keywords: ['dashboard', 'overview', '概览', '首页'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-hotels',
      title: '酒店管理',
      subtitle: '酒店列表、对比分析',
      icon: <MapPin className="w-5 h-5" />,
      shortcut: 'G H',
      keywords: ['hotels', 'management', '酒店', '管理'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-revenue',
      title: '收益中心',
      subtitle: '集团收益分析',
      icon: <TrendingUp className="w-5 h-5" />,
      shortcut: 'G R',
      keywords: ['revenue', 'profit', '收益', '营收'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-strategy',
      title: '策略中心',
      subtitle: '定价策略、促销管理',
      icon: <Briefcase className="w-5 h-5" />,
      shortcut: 'G S',
      keywords: ['strategy', 'pricing', '策略', '定价'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-channel',
      title: '渠道分析',
      subtitle: '渠道表现、流量分析',
      icon: <BarChart3 className="w-5 h-5" />,
      shortcut: 'G C',
      keywords: ['channel', 'distribution', '渠道', '流量'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-command',
      title: '运营指挥中心',
      subtitle: '实时运营监控',
      icon: <Command className="w-5 h-5" />,
      shortcut: 'G O',
      keywords: ['operations', 'command', '运营', '指挥'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-anomaly',
      title: '异常中心',
      subtitle: '异常检测、预警管理',
      icon: <AlertTriangle className="w-5 h-5" />,
      shortcut: 'G A',
      keywords: ['anomaly', 'alert', '异常', '预警'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-content-gov',
      title: '内容治理',
      subtitle: '内容审核、合规检查',
      icon: <Shield className="w-5 h-5" />,
      shortcut: 'G G',
      keywords: ['content', 'governance', '内容', '治理'],
      section: '导航',
      action: () => {},
    },
  ],
  admin: [
    {
      id: 'nav-admin-dashboard',
      title: '管理驾驶舱',
      subtitle: '全局数据监控',
      icon: <Crown className="w-5 h-5" />,
      shortcut: 'G D',
      keywords: ['dashboard', 'admin', '驾驶舱', '管理'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-customers',
      title: '客户成功',
      subtitle: '客户管理、健康度分析',
      icon: <Users className="w-5 h-5" />,
      shortcut: 'G C',
      keywords: ['customers', 'success', '客户', '成功'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-training',
      title: '培训管理',
      subtitle: '培训课程、认证管理',
      icon: <GraduationCap className="w-5 h-5" />,
      shortcut: 'G T',
      keywords: ['training', 'learning', '培训', '学习'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-tickets',
      title: '工单中心',
      subtitle: '工单处理、客服支持',
      icon: <Ticket className="w-5 h-5" />,
      shortcut: 'G K',
      keywords: ['tickets', 'support', '工单', '客服'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-content-admin',
      title: '内容管理',
      subtitle: '素材管理、文案审核',
      icon: <FileText className="w-5 h-5" />,
      shortcut: 'G O',
      keywords: ['content', 'materials', '内容', '素材'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-anomalies',
      title: '异常管理',
      subtitle: '系统异常、告警处理',
      icon: <AlertTriangle className="w-5 h-5" />,
      shortcut: 'G A',
      keywords: ['anomalies', 'alerts', '异常', '告警'],
      section: '导航',
      action: () => {},
    },
    {
      id: 'nav-system',
      title: '系统管理',
      subtitle: '配置管理、权限设置',
      icon: <Settings className="w-5 h-5" />,
      shortcut: 'G ,',
      keywords: ['system', 'settings', '系统', '设置'],
      section: '导航',
      action: () => {},
    },
  ],
};

// 通用操作命令
const commonActions: CommandItem[] = [
  {
    id: 'action-refresh',
    title: '刷新数据',
    subtitle: '重新加载当前页面数据',
    icon: <RefreshCw className="w-5 h-5" />,
    shortcut: 'R',
    keywords: ['refresh', 'reload', '刷新', '重新加载'],
    section: '操作',
    action: () => window.location.reload(),
  },
  {
    id: 'action-help',
    title: '快捷键帮助',
    subtitle: '查看所有可用快捷键',
    icon: <Keyboard className="w-5 h-5" />,
    shortcut: '?',
    keywords: ['help', 'shortcuts', '帮助', '快捷键'],
    section: '操作',
    action: () => {},
  },
  {
    id: 'action-close',
    title: '关闭弹窗/返回',
    subtitle: '关闭当前弹窗或返回上一级',
    icon: <X className="w-5 h-5" />,
    shortcut: 'Esc',
    keywords: ['close', 'back', '关闭', '返回'],
    section: '操作',
    action: () => {},
  },
];

export function CommandPalette({ appType, isOpen, onClose, onOpenShortcutHelp }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 构建完整命令列表
  const allCommands = useMemo<CommandItem[]>(() => {
    const navs = navigationCommands[appType].map(cmd => ({
      ...cmd,
      action: () => {
        const pathMap: Record<string, string> = {
          'nav-overview': '/',
          'nav-market': '/market',
          'nav-pricing': '/pricing',
          'nav-content': '/content',
          'nav-inventory': '/inventory',
          'nav-service': '/service',
          'nav-finance': '/finance',
          'nav-settings': '/settings',
          'nav-dashboard': '/',
          'nav-hotels': '/hotels',
          'nav-revenue': '/revenue',
          'nav-strategy': '/strategy',
          'nav-channel': '/channel',
          'nav-command': '/operations',
          'nav-anomaly': '/anomalies',
          'nav-content-gov': '/content-governance',
          'nav-admin-dashboard': '/',
          'nav-customers': '/customers',
          'nav-training': '/training',
          'nav-tickets': '/tickets',
          'nav-content-admin': '/content',
          'nav-anomalies': '/anomalies',
          'nav-system': '/system',
        };
        const path = pathMap[cmd.id];
        if (path) {
          navigate(path);
          onClose();
        }
      },
    }));

    const actions = commonActions.map(cmd => ({
      ...cmd,
      action: () => {
        if (cmd.id === 'action-help') {
          onOpenShortcutHelp?.();
          onClose();
        } else if (cmd.id === 'action-close') {
          onClose();
        } else {
          cmd.action();
          onClose();
        }
      },
    }));

    return [...navs, ...actions];
  }, [appType, navigate, onClose, onOpenShortcutHelp]);

  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    
    const q = query.toLowerCase();
    return allCommands.filter(cmd => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchSubtitle = cmd.subtitle?.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some(k => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchKeywords;
    });
  }, [allCommands, query]);

  // 按 section 分组
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.section]) groups[cmd.section] = [];
      groups[cmd.section].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) cmd.action();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]"
        onClick={onClose}
      >
        {/* 遮罩 */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* 面板 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl mx-4 bg-bg-secondary rounded-xl shadow-2xl border border-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 搜索输入 */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
            <Search className="w-5 h-5 text-text-tertiary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="搜索命令、页面或操作..."
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-text-tertiary"
            />
            <kbd className="px-2 py-1 text-xs bg-white/10 rounded">ESC</kbd>
          </div>

          {/* 命令列表 */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
            {Object.entries(groupedCommands).map(([section, commands], sectionIdx) => (
              <div key={section}>
                <div className="px-4 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  {section}
                </div>
                {commands.map((cmd, cmdIdx) => {
                  const globalIdx = Object.values(groupedCommands)
                    .slice(0, sectionIdx)
                    .flat().length + cmdIdx;
                  const isSelected = globalIdx === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-neon-cyan/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-neon-cyan/30' : 'bg-white/5'}`}>
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{cmd.title}</div>
                        {cmd.subtitle && (
                          <div className="text-sm text-text-tertiary truncate">{cmd.subtitle}</div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <div className="flex items-center gap-1">
                          {cmd.shortcut.split(' ').map((key, i) => (
                            <kbd key={i} className="px-1.5 py-0.5 text-xs bg-white/10 rounded">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="px-4 py-12 text-center text-text-tertiary">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>未找到相关命令</p>
                <p className="text-sm mt-1">尝试使用其他关键词</p>
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="flex items-center justify-between px-4 py-2 text-xs text-text-tertiary border-t border-white/10 bg-white/5">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 bg-white/10 rounded">↑</kbd>
                <kbd className="px-1 bg-white/10 rounded">↓</kbd>
                选择
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 bg-white/10 rounded">↵</kbd>
                确认
              </span>
            </div>
            <span>{filteredCommands.length} 个命令</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CommandPalette;
