/**
 * 右键上下文菜单
 * Shadow-Bees V52 - 支持表格、卡片、图表等场景
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  children?: MenuItem[];
  onClick?: () => void;
}

interface ContextMenuProps {
  items: MenuItem[];
  children: React.ReactNode;
  className?: string;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

// 全局右键菜单状态
let globalContextMenu: { close: () => void } | null = null;

export function ContextMenu({ items, children, className = '' }: ContextMenuProps) {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
    setActiveSubmenu(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // 关闭其他打开的菜单
    if (globalContextMenu && globalContextMenu.close !== closeMenu) {
      globalContextMenu.close();
    }
    globalContextMenu = { close: closeMenu };

    // 计算菜单位置，确保不超出视口
    const menuWidth = 220;
    const menuHeight = Math.min(items.length * 36 + 16, 400);
    
    let x = e.clientX;
    let y = e.clientY;
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setState({ isOpen: true, x, y });
  }, [items.length, closeMenu]);

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled || item.children) return;
    item.onClick?.();
    closeMenu();
  };

  // 点击外部关闭
  useEffect(() => {
    if (!state.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [state.isOpen, closeMenu]);

  // 清理全局引用
  useEffect(() => {
    return () => {
      if (globalContextMenu?.close === closeMenu) {
        globalContextMenu = null;
      }
    };
  }, [closeMenu]);

  return (
    <div className={className} onContextMenu={handleContextMenu}>
      {children}
      
      <AnimatePresence>
        {state.isOpen && (
          <>
            {/* 遮罩（阻止其他交互） */}
            <div className="fixed inset-0 z-[9990]" onClick={closeMenu} />
            
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{ 
                position: 'fixed', 
                left: state.x, 
                top: state.y,
                zIndex: 9991,
              }}
              className="min-w-[180px] max-w-[280px] py-2 bg-bg-secondary rounded-xl shadow-2xl border border-white/10 overflow-hidden"
            >
              {items.map((item) => (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  isActive={activeSubmenu === item.id}
                  onHover={() => item.children && setActiveSubmenu(item.id)}
                  onLeave={() => setActiveSubmenu(null)}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// 菜单项组件
function MenuItemComponent({
  item,
  isActive,
  onHover,
  onLeave,
  onClick,
}: {
  item: MenuItem;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (item.divider) {
    return <div className="my-1.5 border-t border-white/10" />;
  }

  return (
    <div
      className="relative"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <button
        onClick={onClick}
        disabled={item.disabled}
        className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg text-sm transition-colors text-left ${
          item.disabled
            ? 'opacity-40 cursor-not-allowed'
            : item.danger
            ? 'hover:bg-red-500/10 text-red-400'
            : 'hover:bg-white/10'
        } ${isActive ? 'bg-white/10' : ''}`}
      >
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span className="flex-1 truncate">{item.label}</span>
        {item.shortcut && (
          <kbd className="px-1.5 py-0.5 text-xs bg-white/10 rounded">
            {item.shortcut}
          </kbd>
        )}
        {hasChildren && <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />}
      </button>

      {/* 子菜单 */}
      {hasChildren && isActive && (
        <motion.div
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-full top-0 ml-1 min-w-[160px] py-2 bg-bg-secondary rounded-xl shadow-2xl border border-white/10"
        >
          {item.children!.map(child => (
            <button
              key={child.id}
              onClick={() => {
                child.onClick?.();
                onClick();
              }}
              disabled={child.disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg text-sm transition-colors text-left ${
                child.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : child.danger
                  ? 'hover:bg-red-500/10 text-red-400'
                  : 'hover:bg-white/10'
              }`}
            >
              {child.icon && <child.icon className="w-4 h-4 flex-shrink-0" />}
              <span className="flex-1 truncate">{child.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// 表格行右键菜单 hook
export function useTableContextMenu<T extends { id: string }>(
  actions: {
    view?: (item: T) => void;
    edit?: (item: T) => void;
    delete?: (item: T) => void;
    copy?: (item: T) => void;
    duplicate?: (item: T) => void;
    export?: (item: T) => void;
  }
) {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const menuItems: MenuItem[] = [
    actions.view && {
      id: 'view',
      label: '查看详情',
      icon: Eye,
      shortcut: 'Enter',
      onClick: () => selectedItem && actions.view!(selectedItem),
    },
    actions.edit && {
      id: 'edit',
      label: '编辑',
      icon: Edit,
      shortcut: 'E',
      onClick: () => selectedItem && actions.edit!(selectedItem),
    },
    (actions.view || actions.edit) && { id: 'divider1', divider: true },
    actions.copy && {
      id: 'copy',
      label: '复制ID',
      icon: Copy,
      shortcut: '⌘C',
      onClick: () => selectedItem && actions.copy!(selectedItem),
    },
    actions.duplicate && {
      id: 'duplicate',
      label: '复制记录',
      icon: Copy,
      onClick: () => selectedItem && actions.duplicate!(selectedItem),
    },
    actions.export && {
      id: 'export',
      label: '导出',
      icon: ExternalLink,
      onClick: () => selectedItem && actions.export!(selectedItem),
    },
    (actions.copy || actions.duplicate || actions.export) && { id: 'divider2', divider: true },
    actions.delete && {
      id: 'delete',
      label: '删除',
      icon: Trash2,
      shortcut: 'Del',
      danger: true,
      onClick: () => selectedItem && actions.delete!(selectedItem),
    },
  ].filter(Boolean) as MenuItem[];

  const contextMenuProps = (item: T) => ({
    items: menuItems,
    onContextMenu: () => setSelectedItem(item),
  });

  return { contextMenuProps, selectedItem, menuItems };
}

// 快捷使用方式：表格行右键菜单包装器
interface TableRowContextMenuProps<T> {
  item: T;
  children: React.ReactNode;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onCopy?: (item: T) => void;
  onDuplicate?: (item: T) => void;
  onExport?: (item: T) => void;
}

export function TableRowContextMenu<T extends { id: string }>({
  children,
  onView,
  onEdit,
  onDelete,
  onCopy,
  onDuplicate,
  onExport,
}: TableRowContextMenuProps<T>) {
  const { menuItems } = useTableContextMenu({
    view: onView,
    edit: onEdit,
    delete: onDelete,
    copy: onCopy,
    duplicate: onDuplicate,
    export: onExport,
  });

  return (
    <ContextMenu items={menuItems}>
      {children}
    </ContextMenu>
  );
}

export default ContextMenu;
