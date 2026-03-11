/**
 * SaaS运营后台 - 系统设置模块
 * 功能：基础配置、用户权限管理、通知设置、日志审计
 */

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Users,
  Bell,
  FileText,
  Save,
  CheckCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Mail,
  MessageSquare,
  Smartphone,
  Filter,
  Clock,
  MapPin,
  X,
  Download,
  Server,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { ShortcutSettings } from '@/components/ux';
import { PageSkeleton } from '@/components/ux/Skeleton';
import ConfigManager from './ConfigManager';
import { useAdminStore, rolePermissions, type UserRole, type SystemUser, type OperationType } from '../../stores/adminStore';
import { useToast } from '../../components/ui/Toast';

// 标签页配置
const tabs = [
  { id: 'basic', label: '基础配置', icon: Settings },
  { id: 'config', label: '配置下发', icon: Server },
  { id: 'users', label: '用户权限', icon: Users },
  { id: 'notifications', label: '通知设置', icon: Bell },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'logs', label: '日志审计', icon: FileText },
];

// 角色配置
const roleConfig: Record<UserRole, { label: string; color: string; bgColor: string; description: string }> = {
  super: { label: '超级管理员', color: 'text-purple-400', bgColor: 'bg-purple-400/20', description: '全部权限' },
  admin: { label: '运营管理员', color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/20', description: '日常运营管理' },
  finance: { label: '财务人员', color: 'text-neon-green', bgColor: 'bg-neon-green/20', description: '财务相关操作' },
  support: { label: '客服人员', color: 'text-neon-amber', bgColor: 'bg-neon-amber/20', description: '工单处理' },
};

// 模块名称映射
const moduleNames: Record<string, string> = {
  dashboard: '数据概览',
  customers: '客户管理',
  content: '内容管理',
  support: '工单支持',
  finance: '财务中心',
  system: '系统设置',
};

// 操作类型配置
const operationConfig: Record<OperationType, { label: string; color: string; bgColor: string }> = {
  login: { label: '登录', color: 'text-neon-green', bgColor: 'bg-neon-green/20' },
  logout: { label: '登出', color: 'text-gray-400', bgColor: 'bg-gray-700/50' },
  create: { label: '创建', color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/20' },
  update: { label: '更新', color: 'text-neon-amber', bgColor: 'bg-neon-amber/20' },
  delete: { label: '删除', color: 'text-neon-red', bgColor: 'bg-neon-red/20' },
  export: { label: '导出', color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  approve: { label: '审批', color: 'text-neon-green', bgColor: 'bg-neon-green/20' },
  reject: { label: '拒绝', color: 'text-neon-red', bgColor: 'bg-neon-red/20' },
};

export default function SystemPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'basic');
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 同步 URL 参数到 activeTab
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabs.some(t => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Tab 切换时显示加载动画
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // 切换标签时更新 URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-gray-400 text-sm mt-1">管理SaaS平台系统配置、用户权限和日志审计</p>
      </div>

      {/* 标签页切换 */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'text-neon-cyan border-neon-cyan'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容区域 */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151B2B] rounded-xl border border-gray-800 p-6"
      >
        {activeTab === 'basic' && <BasicSettings onSave={handleSave} />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'notifications' && <NotificationSettings onSave={handleSave} />}
        {activeTab === 'config' && <ConfigManager />}
        {activeTab === 'shortcuts' && (
          <div className="space-y-6">
            <ShortcutSettings appType="admin" />
          </div>
        )}
        {activeTab === 'logs' && <LogAudit />}
      </motion.div>

      {/* 保存成功提示 */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green/50 rounded-lg"
          >
            <CheckCircle size={18} />
            保存成功
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 1. 基础配置
// ============================================
function BasicSettings({ onSave }: { onSave: () => void }) {
  const { systemConfig, updateSystemConfig } = useAdminStore();
  const [formData, setFormData] = useState(systemConfig);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    updateSystemConfig(formData);
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Settings size={20} className="text-neon-cyan" />
          基础配置
        </h3>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all"
        >
          <Save size={18} />
          保存设置
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 平台名称 */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">平台名称</label>
          <input
            type="text"
            value={formData.platformName}
            onChange={(e) => handleChange('platformName', e.target.value)}
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none transition-colors"
            placeholder="请输入平台名称"
          />
        </div>

        {/* Logo设置 */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Logo URL</label>
          <input
            type="text"
            value={formData.logoUrl}
            onChange={(e) => handleChange('logoUrl', e.target.value)}
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none transition-colors"
            placeholder="/logo.png"
          />
        </div>

        {/* 客服电话 */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">客服电话</label>
          <input
            type="text"
            value={formData.contactPhone}
            onChange={(e) => handleChange('contactPhone', e.target.value)}
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none transition-colors"
            placeholder="400-xxx-xxxx"
          />
        </div>

        {/* 客服邮箱 */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">客服邮箱</label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none transition-colors"
            placeholder="support@example.com"
          />
        </div>

        {/* 时区设置 */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">系统时区</label>
          <select
            value={formData.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none transition-colors"
          >
            <option value="Asia/Shanghai">Asia/Shanghai (GMT+8)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
            <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
            <option value="America/New_York">America/New_York (GMT-5)</option>
            <option value="Europe/London">Europe/London (GMT+0)</option>
          </select>
        </div>

        {/* 语言设置 */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">默认语言</label>
          <select
            value={formData.language}
            onChange={(e) => handleChange('language', e.target.value)}
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none transition-colors"
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁体中文</option>
            <option value="en-US">English</option>
            <option value="ja-JP">日本語</option>
          </select>
        </div>
      </div>

      {/* Logo预览 - 与左上角保持一致 */}
      <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-700">
        <p className="text-sm text-gray-400 mb-3">Logo预览（与左上角导航一致）</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#151B2B] rounded-lg flex items-center justify-center border border-gray-700">
            <svg viewBox="0 0 48 48" className="w-10 h-10">
              <defs>
                <linearGradient id="previewGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00D4FF" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
              {/* 简化的蜜蜂图标 */}
              <path 
                d="M24 10 C30 10 34 15 34 20 C34 24 32 26 30 27 C32 28 34 30 34 34 C34 39 30 42 24 42 C18 42 14 39 14 34 C14 30 16 28 18 27 C16 26 14 24 14 20 C14 15 18 10 24 10 Z"
                fill="none"
                stroke="url(#previewGrad)"
                strokeWidth="2"
              />
              <path d="M15 19 h18 M14 24 h20 M15 33 h18" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="24" cy="27" r="2" fill="#FFB800" />
            </svg>
          </div>
          <div>
            <p className="font-medium">
              Shadow<span className="text-neon-cyan">-</span>Bees
            </p>
            <p className="text-sm text-gray-400">SaaS管理后台系统</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          提示：Logo 使用 SVG 图标，平台名称显示在导航栏中
        </p>
      </div>

      {/* 重新观看启动动画 */}
      <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-700">
        <p className="text-sm text-gray-400 mb-3">启动动画</p>
        <button
          onClick={() => {
            sessionStorage.removeItem('sb_admin_booted');
            localStorage.removeItem('sb_skip_boot_animation');
            window.location.reload();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/20 transition-all"
        >
          <Sparkles size={16} />
          重新观看启动动画
        </button>
        <p className="text-xs text-gray-500 mt-2">
          刷新页面后将再次显示 Shadow-Bees SaaS 平台启动动画
        </p>
      </div>
    </div>
  );
}

// ============================================
// 2. 用户权限管理
// ============================================
function UserManagement() {
  const { systemUsers, addSystemUser, updateSystemUser, deleteSystemUser } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // 过滤用户
  const filteredUsers = useMemo(() => {
    return systemUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [systemUsers, searchQuery, roleFilter]);

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该用户吗？')) {
      deleteSystemUser(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Users size={20} className="text-neon-cyan" />
          用户权限管理
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPermissionMatrix(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg hover:border-neon-cyan transition-all text-sm"
          >
            <Shield size={16} />
            权限矩阵
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all text-sm"
          >
            <Plus size={16} />
            添加用户
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索用户名、姓名、邮箱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
        >
          <option value="all">全部角色</option>
          <option value="super">超级管理员</option>
          <option value="admin">运营管理员</option>
          <option value="finance">财务人员</option>
          <option value="support">客服人员</option>
        </select>
      </div>

      {/* 用户列表 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">用户</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">角色</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">状态</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">最后登录</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const role = roleConfig[user.role];
              return (
                <tr key={user.id} className="border-b border-gray-800/50 hover:bg-[#1E2538]/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${role.bgColor} ${role.color}`}>
                      {role.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        user.status === 'active'
                          ? 'bg-neon-green/20 text-neon-green'
                          : 'bg-gray-700/50 text-gray-400'
                      }`}
                    >
                      {user.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <p>{user.lastLoginAt !== '-' ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '-'}</p>
                      {user.lastLoginIp !== '-' && (
                        <p className="text-gray-400 text-xs">{user.lastLoginIp}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-neon-cyan/10 rounded-lg transition-colors text-neon-cyan"
                        title="编辑"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 hover:bg-neon-red/10 rounded-lg transition-colors text-neon-red"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 添加用户弹窗 */}
      <AnimatePresence>
        {showAddModal && (
          <UserModal
            mode="add"
            onClose={() => setShowAddModal(false)}
            onSubmit={(data) => {
              addSystemUser(data as Parameters<typeof addSystemUser>[0]);
              setShowAddModal(false);
            }}
          />
        )}
        {showEditModal && editingUser && (
          <UserModal
            mode="edit"
            user={editingUser}
            onClose={() => {
              setShowEditModal(false);
              setEditingUser(null);
            }}
            onSubmit={(data) => {
              updateSystemUser(editingUser.id, data);
              setShowEditModal(false);
              setEditingUser(null);
            }}
          />
        )}
        {showPermissionMatrix && (
          <PermissionMatrixModal onClose={() => setShowPermissionMatrix(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// 用户弹窗组件
function UserModal({
  mode,
  user,
  onClose,
  onSubmit,
}: {
  mode: 'add' | 'edit';
  user?: SystemUser;
  onClose: () => void;
  onSubmit: (data: Partial<SystemUser>) => void;
}) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'support',
    status: user?.status || 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[#151B2B] rounded-xl border border-gray-800 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">{mode === 'add' ? '添加用户' : '编辑用户'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">用户名</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">邮箱</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">手机号</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">角色</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
            >
              <option value="super">超级管理员</option>
              <option value="admin">运营管理员</option>
              <option value="finance">财务人员</option>
              <option value="support">客服人员</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">状态</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'disabled' })}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg focus:border-neon-cyan focus:outline-none"
            >
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:border-gray-600 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all"
            >
              {mode === 'add' ? '添加' : '保存'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// 权限矩阵弹窗
function PermissionMatrixModal({ onClose }: { onClose: () => void }) {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-[#151B2B] rounded-xl border border-gray-800 p-6 w-full max-w-4xl max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Shield size={20} className="text-neon-cyan" />
            权限矩阵
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* 角色说明 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(Object.keys(roleConfig) as UserRole[]).map((role) => {
            const config = roleConfig[role];
            return (
              <div key={role} className={`p-3 rounded-lg ${config.bgColor} bg-opacity-10`}>
                <p className={`font-medium ${config.color}`}>{config.label}</p>
                <p className="text-xs text-gray-400 mt-1">{config.description}</p>
              </div>
            );
          })}
        </div>

        {/* 权限矩阵表格 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">功能模块</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-purple-400">超级管理员</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-neon-cyan">运营管理员</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-neon-green">财务人员</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-neon-amber">客服人员</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(moduleNames).map((module) => (
                <tr key={module} className="border-b border-gray-800/50">
                  <td className="py-3 px-4 font-medium">{moduleNames[module]}</td>
                  {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                    const perms = rolePermissions[role].find((p: { module: string; actions: { view: boolean; create: boolean; update: boolean; delete: boolean; export: boolean } }) => p.module === module);
                    const hasView = perms?.actions.view;
                    const hasFull = perms?.actions.create && perms?.actions.update && perms?.actions.delete;
                    return (
                      <td key={role} className="py-3 px-4 text-center">
                        {hasFull ? (
                          <span className="px-2 py-1 text-xs rounded bg-neon-green/20 text-neon-green">完整权限</span>
                        ) : hasView ? (
                          <span className="px-2 py-1 text-xs rounded bg-neon-amber/20 text-neon-amber">只读</span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded bg-gray-700/50 text-gray-400">无权限</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs rounded bg-neon-green/20 text-neon-green">完整权限</span>
            <span className="text-sm text-gray-400">查看/创建/编辑/删除</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs rounded bg-neon-amber/20 text-neon-amber">只读</span>
            <span className="text-sm text-gray-400">仅查看</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs rounded bg-gray-700/50 text-gray-400">无权限</span>
            <span className="text-sm text-gray-400">不可访问</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// 3. 通知设置
// ============================================
function NotificationSettings({ onSave }: { onSave: () => void }) {
  const { notificationSettings, updateNotificationSettings, systemUsers } = useAdminStore();
  const [formData, setFormData] = useState(notificationSettings);

  const handleChannelChange = (channel: keyof typeof formData.channels, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      channels: { ...prev.channels, [channel]: value },
    }));
  };

  const handleTypeChange = (type: keyof typeof formData.types, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: value },
    }));
  };

  const handleRecipientToggle = (userId: string) => {
    setFormData((prev) => {
      const recipients = prev.recipients.includes(userId)
        ? prev.recipients.filter((id) => id !== userId)
        : [...prev.recipients, userId];
      return { ...prev, recipients };
    });
  };

  const handleSubmit = () => {
    updateNotificationSettings(formData);
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Bell size={20} className="text-neon-cyan" />
          通知设置
        </h3>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-neon-cyan text-black rounded-lg hover:bg-neon-cyan/90 transition-all"
        >
          <Save size={18} />
          保存设置
        </button>
      </div>

      {/* 通知渠道 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-400">通知渠道</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neon-cyan/20 rounded-lg">
                  <MessageSquare size={18} className="text-neon-cyan" />
                </div>
                <div>
                  <p className="font-medium">站内通知</p>
                  <p className="text-xs text-gray-400">系统内消息中心</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.channels.inApp}
                  onChange={(e) => handleChannelChange('inApp', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan" />
              </label>
            </div>
          </div>

          <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neon-amber/20 rounded-lg">
                  <Mail size={18} className="text-neon-amber" />
                </div>
                <div>
                  <p className="font-medium">邮件通知</p>
                  <p className="text-xs text-gray-400">发送至绑定邮箱</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.channels.email}
                  onChange={(e) => handleChannelChange('email', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan" />
              </label>
            </div>
          </div>

          <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neon-green/20 rounded-lg">
                  <Smartphone size={18} className="text-neon-green" />
                </div>
                <div>
                  <p className="font-medium">短信通知</p>
                  <p className="text-xs text-gray-400">发送至绑定手机</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.channels.sms}
                  onChange={(e) => handleChannelChange('sms', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 通知类型 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-400">通知类型</h4>
        <div className="space-y-3">
          {[
            { key: 'ticket', label: '工单通知', desc: '新工单、工单状态变更、客户回复', icon: MessageSquare },
            { key: 'contentAnomaly', label: '内容异常', desc: '内容审核异常、举报、下架通知', icon: FileText },
            { key: 'finance', label: '财务通知', desc: '退款申请、发票开具、对账异常', icon: Mail },
            { key: 'system', label: '系统通知', desc: '系统更新、维护公告、安全警告', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex items-center justify-between p-4 bg-[#0B0F19] rounded-lg border border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#151B2B] rounded-lg">
                    <Icon size={18} className="text-neon-cyan" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.types[item.key as keyof typeof formData.types]}
                    onChange={(e) => handleTypeChange(item.key as keyof typeof formData.types, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* 接收人配置 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-400">接收人配置</h4>
        <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400 mb-3">选择接收以上通知的管理员</p>
          <div className="flex flex-wrap gap-2">
            {systemUsers
              .filter((u) => u.status === 'active')
              .map((user) => {
                const isSelected = formData.recipients.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => handleRecipientToggle(user.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                        : 'bg-[#151B2B] border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-[#0B0F19] flex items-center justify-center text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-sm">{user.name}</span>
                    {isSelected && <CheckCircle size={14} />}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 4. 日志审计
// ============================================
function LogAudit() {
  const { operationLogs, addOperationLog } = useAdminStore();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<OperationType | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // 获取所有操作用户
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    operationLogs.forEach((log) => users.set(log.userId, log.username));
    return Array.from(users.entries());
  }, [operationLogs]);

  // 过滤日志
  const filteredLogs = useMemo(() => {
    return operationLogs.filter((log) => {
      const matchesSearch =
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.module.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUser = userFilter === 'all' || log.userId === userFilter;
      const matchesOperation = operationFilter === 'all' || log.operation === operationFilter;

      let matchesTime = true;
      const logDate = new Date(log.createdAt);
      const now = new Date();
      if (timeFilter === 'today') {
        matchesTime = logDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = logDate >= weekAgo;
      } else if (timeFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesTime = logDate >= monthAgo;
      }

      return matchesSearch && matchesUser && matchesOperation && matchesTime;
    });
  }, [operationLogs, searchQuery, userFilter, operationFilter, timeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <FileText size={20} className="text-neon-cyan" />
          操作日志
          <span className="text-sm font-normal text-gray-400">({filteredLogs.length} 条记录)</span>
        </h3>
        <button
          onClick={() => {
            const data = {
              logs: filteredLogs,
              exportTime: new Date().toISOString(),
              totalCount: filteredLogs.length,
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `操作日志_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addOperationLog({
              userId: 'USER-001',
              username: '系统管理员',
              operation: 'export',
              module: 'system',
              description: `导出操作日志，共${filteredLogs.length}条`,
              ip: '192.168.1.100',
              userAgent: navigator.userAgent,
            });
            toast.success('日志导出成功', `已导出${filteredLogs.length}条记录`);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg hover:border-neon-cyan transition-all text-sm"
        >
          <Download size={16} />
          导出日志
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索操作描述、用户..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部用户</option>
            {uniqueUsers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value as OperationType | 'all')}
            className="px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部操作</option>
            <option value="login">登录</option>
            <option value="logout">登出</option>
            <option value="create">创建</option>
            <option value="update">更新</option>
            <option value="delete">删除</option>
            <option value="export">导出</option>
            <option value="approve">审批</option>
            <option value="reject">拒绝</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            className="px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近7天</option>
            <option value="month">最近30天</option>
          </select>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">时间</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">用户</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">操作</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">模块</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">描述</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">IP地址</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const opConfig = operationConfig[log.operation];
              return (
                <tr key={log.id} className="border-b border-gray-800/50 hover:bg-[#1E2538]/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-gray-400" />
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center text-xs text-neon-cyan">
                        {log.username.charAt(0)}
                      </div>
                      <span className="text-sm">{log.username}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded ${opConfig.bgColor} ${opConfig.color}`}>
                      {opConfig.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{moduleNames[log.module] || log.module}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{log.description}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin size={14} />
                      {log.ip}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 空状态 */}
      {filteredLogs.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">暂无操作日志</p>
        </div>
      )}
    </div>
  );
}
