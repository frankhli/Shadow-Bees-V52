/**
 * Shadow-Bees V52 - 账号池管理（企业版）
 * 
 * 核心功能：
 * 1. 与顶部酒店选择器关联（按酒店筛选/分配账号）
 * 2. 批量新增账号（一次添加多个同平台账号）
 * 3. 与渠道配置同步（动态获取平台列表）
 * 4. 账号分配/回收/状态管理
 * 
 * 主题：企业版浅色主题
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  ArrowRightLeft,
  QrCode,
  Smartphone,
  X,
  Building2,
  Layers,
  Info,
  Pencil,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { accountApi } from '../../api';
import type { Account } from '../../api/types';

// ==================== 类型定义 ====================

interface PlatformInfo {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  logo?: string;
  icon: 'refresh' | 'phone' | 'qr' | 'smartphone';
}



// ==================== 常量配置 ====================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  active: { label: '活跃', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  inactive: { label: '闲置', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: XCircle },
  suspended: { label: '冻结', color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertCircle },
};

const ICON_MAP: Record<string, any> = {
  refresh: RefreshCw,
  phone: Smartphone,
  qr: QrCode,
  smartphone: Smartphone,
};

// ==================== 工具函数 ====================

// 从 localStorage 读取渠道配置
const loadPlatformsFromChannelConfig = (): PlatformInfo[] => {
  try {
    const saved = localStorage.getItem('shadow-bees-channel-config');
    if (saved) {
      const channels = JSON.parse(saved);
      return channels.map((c: any) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        bgColor: c.bgColor || 'bg-gray-50',
        logo: c.logo,
        icon: c.type === 'c2c' ? 'refresh' : c.type === 'private' ? 'qr' : 'phone',
      }));
    }
  } catch {
    // 读取失败使用默认
  }
  
  // 默认平台配置
  return [
    { id: 'xiaohongshu', name: '小红书', color: '#FF2442', bgColor: 'bg-red-50', logo: '/logos/xiaohongshu.jpg', icon: 'phone' },
    { id: 'xianyu', name: '闲鱼', color: '#FF6B00', bgColor: 'bg-orange-50', logo: '/logos/xianyu.jpg', icon: 'refresh' },
    { id: 'wechat', name: '微信', color: '#07C160', bgColor: 'bg-green-50', logo: '/logos/wechat.jpg', icon: 'qr' },
    { id: 'douyin', name: '抖音', color: '#000000', bgColor: 'bg-gray-100', logo: '/logos/douyin.jpg', icon: 'smartphone' },
  ];
};

// ==================== 子组件 ====================

// 统计卡片
function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${color.split(' ')[1]}`}>{value}</div>
    </div>
  );
}

// 新增账号弹窗（支持批量）
function CreateAccountModal({
  show,
  onClose,
  onCreate,
  platforms,
  defaultHotelId,
}: {
  show: boolean;
  onClose: () => void;
  onCreate: (accounts: Partial<Account>[]) => void;
  platforms: PlatformInfo[];
  defaultHotelId?: string;
}) {
  const [form, setForm] = useState({
    platform: '',
    usernames: '',
    loginMethod: 'qr' as const,
    status: 'active' as const,
    count: 1,
  });
  const [isBatch, setIsBatch] = useState(false);

  useEffect(() => {
    if (show && platforms.length > 0 && !form.platform) {
      setForm(f => ({ ...f, platform: platforms[0].id }));
    }
  }, [show, platforms]);

  const handleSubmit = () => {
    if (!form.platform) {
      alert('请选择平台');
      return;
    }

    const platformName = platforms.find(p => p.id === form.platform)?.name || form.platform;
    const accounts: Partial<Account>[] = [];

    if (isBatch) {
      // 批量模式：解析多行输入
      const names = form.usernames.split('\n').map(n => n.trim()).filter(Boolean);
      if (names.length === 0) {
        alert('请至少输入一个账号名称');
        return;
      }
      names.forEach((name) => {
        accounts.push({
          platform: platformName,
          username: name,
          loginMethod: form.loginMethod,
          status: form.status,
          hotelId: defaultHotelId || 'unassigned',
        });
      });
    } else {
      // 单账号模式
      if (!form.usernames.trim()) {
        alert('请输入账号名称');
        return;
      }
      accounts.push({
        platform: platformName,
        username: form.usernames.trim(),
        loginMethod: form.loginMethod,
        status: form.status,
        hotelId: defaultHotelId || 'unassigned',
      });
    }

    onCreate(accounts);
    setForm({ platform: platforms[0]?.id || '', usernames: '', loginMethod: 'qr', status: 'active', count: 1 });
    setIsBatch(false);
  };

  if (!show) return null;

  // 当前选中的平台信息
  void platforms.find(p => p.id === form.platform);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {isBatch ? '批量新增账号' : '新增账号'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 模式切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsBatch(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg ${
              !isBatch ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            单个添加
          </button>
          <button
            onClick={() => setIsBatch(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg ${
              isBatch ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            批量添加
          </button>
        </div>

        <div className="space-y-4">
          {/* 平台选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">平台 *</label>
            <div className="grid grid-cols-4 gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setForm(f => ({ ...f, platform: platform.id }))}
                  className={`py-2 px-1 rounded-lg text-sm border transition-all flex flex-col items-center gap-1 ${
                    form.platform === platform.id
                      ? 'border-violet-500 bg-violet-50 text-violet-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {platform.logo ? (
                    <img src={platform.logo} alt={platform.name} className="w-5 h-5 object-contain rounded" />
                  ) : (
                    <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
                    >
                      {platform.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs truncate w-full text-center">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 账号名称输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isBatch ? '账号名称列表 *（每行一个）' : '账号名称 *'}
            </label>
            {isBatch ? (
              <textarea
                value={form.usernames}
                onChange={(e) => setForm(f => ({ ...f, usernames: e.target.value }))}
                placeholder="如：&#10;北京酒店代订小王&#10;上海民宿推荐官&#10;广州住宿达人"
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              />
            ) : (
              <input
                type="text"
                value={form.usernames}
                onChange={(e) => setForm(f => ({ ...f, usernames: e.target.value }))}
                placeholder="如：北京酒店代订小王"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
              />
            )}
            {isBatch && (
              <p className="text-xs text-gray-500 mt-1">
                将添加 {form.usernames.split('\n').filter(n => n.trim()).length} 个账号
              </p>
            )}
          </div>

          {/* 登录方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">登录方式</label>
            <div className="flex gap-2">
              {[
                { value: 'qr', label: '扫码登录' },
                { value: 'sso', label: '手机号' },
                { value: 'password', label: '密码' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, loginMethod: opt.value as any }))}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                    form.loginMethod === opt.value
                      ? 'border-violet-500 bg-violet-50 text-violet-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 初始状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">初始状态</label>
            <div className="flex gap-2">
              {[
                { value: 'active', label: '活跃', color: 'green' },
                { value: 'inactive', label: '闲置', color: 'gray' },
              ].map((opt: any) => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, status: opt.value as any }))}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                    form.status === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-600`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 默认分配酒店提示 */}
          {defaultHotelId && (
            <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 p-3 rounded-lg">
              <Info className="w-4 h-4" />
              <span>账号将默认分配给当前选中的酒店</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            {isBatch ? '批量创建' : '创建账号'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 编辑账号弹窗
function EditAccountModal({
  show,
  onClose,
  onEdit,
  account,
  platforms,
}: {
  show: boolean;
  onClose: () => void;
  onEdit: (accountId: string, updates: Partial<Account>) => void;
  account: Account | null;
  platforms: PlatformInfo[];
}) {
  const [form, setForm] = useState<{
    platform: string;
    username: string;
    loginMethod: 'qr' | 'sso' | 'password';
    status: 'active' | 'inactive' | 'suspended';
    notes: string;
  }>({
    platform: '',
    username: '',
    loginMethod: 'qr',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (show && account) {
      const platformId = platforms.find(p => p.name === account.platform)?.id || '';
      setForm({
        platform: platformId,
        username: account.username,
        loginMethod: account.loginMethod as any,
        status: account.status,
        notes: account.notes || '',
      });
    }
  }, [show, account, platforms]);

  const handleSubmit = () => {
    if (!account) return;
    if (!form.username.trim()) {
      alert('请输入账号名称');
      return;
    }

    const platformName = platforms.find(p => p.id === form.platform)?.name || form.platform;
    onEdit(account.id, {
      platform: platformName,
      username: form.username.trim(),
      loginMethod: form.loginMethod,
      status: form.status,
      notes: form.notes.trim() || undefined,
    });
  };

  if (!show || !account) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">编辑账号</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 平台选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">平台 *</label>
            <div className="grid grid-cols-4 gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setForm(f => ({ ...f, platform: platform.id }))}
                  className={`py-2 px-1 rounded-lg text-sm border transition-all flex flex-col items-center gap-1 ${
                    form.platform === platform.id
                      ? 'border-violet-500 bg-violet-50 text-violet-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {platform.logo ? (
                    <img src={platform.logo} alt={platform.name} className="w-5 h-5 object-contain rounded" />
                  ) : (
                    <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${platform.color}20`, color: platform.color }}
                    >
                      {platform.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs truncate w-full text-center">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 账号名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">账号名称 *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="如：北京酒店代订小王"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* 登录方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">登录方式</label>
            <div className="flex gap-2">
              {[
                { value: 'qr', label: '扫码登录' },
                { value: 'phone', label: '手机号' },
                { value: 'password', label: '密码' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, loginMethod: opt.value as any }))}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                    form.loginMethod === opt.value
                      ? 'border-violet-500 bg-violet-50 text-violet-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <div className="flex gap-2">
              {[
                { value: 'active', label: '活跃', color: 'green' },
                { value: 'inactive', label: '闲置', color: 'gray' },
                { value: 'suspended', label: '冻结', color: 'red' },
              ].map((opt: any) => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, status: opt.value as any }))}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                    form.status === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-600`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="可选：添加账号备注信息"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}

// 分配账号弹窗（支持批量）
function AssignModal({
  show,
  accounts,
  hotels,
  onClose,
  onAssign,
}: {
  show: boolean;
  accounts: Account[];
  hotels: any[];
  onClose: () => void;
  onAssign: (accountIds: string[], hotelId: string) => void;
}) {
  const [selectedHotelId, setSelectedHotelId] = useState('');

  if (!show || accounts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            分配账号 {accounts.length > 1 && `(${accounts.length}个)`}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {accounts.length === 1 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">账号</p>
            <p className="font-medium text-gray-900">{accounts[0].username}</p>
            <p className="text-xs text-gray-400">{accounts[0].platform}</p>
          </div>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-2">选择要分配的酒店</p>
          {hotels.map((hotel) => (
            <button
              key={hotel.id}
              onClick={() => setSelectedHotelId(hotel.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                selectedHotelId === hotel.id
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Building className="w-5 h-5 text-gray-400" />
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{hotel.name}</p>
                <p className="text-xs text-gray-500">{hotel.city}</p>
              </div>
              {selectedHotelId === hotel.id && (
                <CheckCircle className="w-5 h-5 text-violet-600" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onAssign(accounts.map(a => a.id), selectedHotelId)}
            disabled={!selectedHotelId}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            确认分配
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export default function AccountPool() {
  const { hotels: allHotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    allHotels.filter(h => selectedHotelIds.includes(h.id)),
    [allHotels, selectedHotelIds]
  );

  // 从渠道配置同步平台列表
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);

  useEffect(() => {
    // 初始加载
    setPlatforms(loadPlatformsFromChannelConfig());

    // 监听 storage 变化（当渠道配置页面修改时）
    const handleStorageChange = () => {
      setPlatforms(loadPlatformsFromChannelConfig());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 账号数据（从API加载）
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 从API加载账号数据
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoading(true);
      try {
        const response = await accountApi.getAccounts({
          page: 1,
          pageSize: 100,
          hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
        });
        if (response.success) {
          setAccounts(response.data.list);
        }
      } catch (error) {
        console.error('加载账号失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, [selectedHotelIds]);

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Account[]>([]);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // 筛选状态
  const [filters, setFilters] = useState({
    keyword: '',
    platform: '',
    status: '',
  });

  // 批量选择模式
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 筛选后的账号
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      // 按酒店筛选
      if (selectedHotels.length > 0 && !selectedHotels.find(h => h.id === acc.hotelId)) {
        return false;
      }
      if (filters.keyword && !acc.username.toLowerCase().includes(filters.keyword.toLowerCase())) {
        return false;
      }
      if (filters.platform && acc.platform !== filters.platform) {
        return false;
      }
      if (filters.status && acc.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [accounts, selectedHotels, filters]);

  // 统计
  const stats = useMemo(() => {
    // 根据当前选中的酒店统计
    const relevantAccounts = selectedHotels.length > 0 
      ? accounts.filter(a => selectedHotels.find(h => h.id === a.hotelId))
      : accounts;
    
    return {
      total: relevantAccounts.length,
      active: relevantAccounts.filter(a => a.status === 'active').length,
      assigned: relevantAccounts.filter(a => a.hotelId !== 'unassigned').length,
      unassigned: relevantAccounts.filter(a => a.hotelId === 'unassigned').length,
    };
  }, [accounts, selectedHotels]);

  // 创建账号
  const handleCreate = async (newAccounts: Partial<Account>[]) => {
    try {
      const response = await accountApi.batchCreateAccounts(newAccounts as Omit<Account, 'id' | 'createdAt'>[]);
      if (response.success) {
        // 重新加载账号列表
        const reloadResponse = await accountApi.getAccounts({
          page: 1,
          pageSize: 100,
          hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
        });
        if (reloadResponse.success) {
          setAccounts(reloadResponse.data.list);
        }
        setShowCreateModal(false);
      } else {
        alert('创建失败: ' + (response.message || '未知错误'));
      }
    } catch (error) {
      console.error('创建账号失败:', error);
      alert('创建失败，请稍后重试');
    }
  };

  // 批量分配
  const handleBatchAssign = async (accountIds: string[], hotelId: string) => {
    try {
      const hotelName = allHotels.find(h => h.id === hotelId)?.name;
      const response = await accountApi.batchAssignAccounts(accountIds, hotelId, hotelName);
      if (response.success) {
        // 重新加载账号列表
        const reloadResponse = await accountApi.getAccounts({
          page: 1,
          pageSize: 100,
          hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
        });
        if (reloadResponse.success) {
          setAccounts(reloadResponse.data.list);
        }
        setShowAssignModal(false);
        setSelectedAccounts([]);
        setSelectedIds([]);
        setBatchMode(false);
      } else {
        alert('分配失败: ' + (response.message || '未知错误'));
      }
    } catch (error) {
      console.error('分配账号失败:', error);
      alert('分配失败，请稍后重试');
    }
  };

  // 回收账号
  const handleUnassign = async (accountId: string) => {
    if (confirm('确定要回收该账号吗？回收后账号将返回账号池。')) {
      try {
        const response = await accountApi.unassignAccount(accountId);
        if (response.success) {
          // 重新加载账号列表
          const reloadResponse = await accountApi.getAccounts({
            page: 1,
            pageSize: 100,
            hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
          });
          if (reloadResponse.success) {
            setAccounts(reloadResponse.data.list);
          }
        } else {
          alert('回收失败: ' + (response.message || '未知错误'));
        }
      } catch (error) {
        console.error('回收账号失败:', error);
        alert('回收失败，请稍后重试');
      }
    }
  };

  // 删除账号
  const handleDelete = async (accountId: string) => {
    if (confirm('确定要删除该账号吗？此操作不可撤销。')) {
      try {
        const response = await accountApi.deleteAccount(accountId);
        if (response.success) {
          // 重新加载账号列表
          const reloadResponse = await accountApi.getAccounts({
            page: 1,
            pageSize: 100,
            hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
          });
          if (reloadResponse.success) {
            setAccounts(reloadResponse.data.list);
          }
          setSelectedIds(prev => prev.filter(id => id !== accountId));
        } else {
          alert('删除失败: ' + (response.message || '未知错误'));
        }
      } catch (error) {
        console.error('删除账号失败:', error);
        alert('删除失败，请稍后重试');
      }
    }
  };

  // 批量删除账号
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.length} 个账号吗？此操作不可撤销。`)) {
      try {
        const response = await accountApi.batchDeleteAccounts(selectedIds);
        if (response.success) {
          // 重新加载账号列表
          const reloadResponse = await accountApi.getAccounts({
            page: 1,
            pageSize: 100,
            hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
          });
          if (reloadResponse.success) {
            setAccounts(reloadResponse.data.list);
          }
          setSelectedIds([]);
          alert(`成功删除 ${response.data.deleted} 个账号${response.data.failed > 0 ? `，${response.data.failed} 个失败` : ''}`);
        } else {
          alert('批量删除失败: ' + (response.message || '未知错误'));
        }
      } catch (error) {
        console.error('批量删除账号失败:', error);
        alert('批量删除失败，请稍后重试');
      }
    }
  };

  // 编辑账号
  const handleEdit = async (accountId: string, updates: Partial<Account>) => {
    try {
      const response = await accountApi.updateAccount(accountId, updates);
      if (response.success) {
        // 重新加载账号列表
        const reloadResponse = await accountApi.getAccounts({
          page: 1,
          pageSize: 100,
          hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
        });
        if (reloadResponse.success) {
          setAccounts(reloadResponse.data.list);
        }
        setShowEditModal(false);
        setEditingAccount(null);
      } else {
        alert('更新失败: ' + (response.message || '未知错误'));
      }
    } catch (error) {
      console.error('更新账号失败:', error);
      alert('更新失败，请稍后重试');
    }
  };

  // 切换账号选择
  const toggleAccountSelection = (account: Account) => {
    setSelectedIds(prev =>
      prev.includes(account.id)
        ? prev.filter(id => id !== account.id)
        : [...prev, account.id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAccounts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAccounts.map(a => a.id));
    }
  };

  // 获取平台显示配置
  const getPlatformConfig = (platformName: string): PlatformInfo => {
    return platforms.find(p => p.name === platformName) || {
      id: platformName,
      name: platformName,
      color: '#6366F1',
      bgColor: 'bg-gray-50',
      icon: 'smartphone',
    };
  };

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Smartphone className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店管理账号</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          账号池管理需要选择至少一家酒店才能展示对应账号。<br/>
          您可以为酒店添加、分配和管理各平台的运营账号。
        </p>
        <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
          <Building2 className="w-4 h-4" />
          <span>请从顶部酒店选择器中选择酒店</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BatchOperationBar />

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">账号池管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1
              ? `管理 ${selectedHotels[0].name} 的各平台账号`
              : `批量管理 ${selectedHotels.length} 家酒店的账号`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedHotels.length > 1 && (
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                setSelectedIds([]);
              }}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                batchMode
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              {batchMode ? '退出批量' : '批量操作'}
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增账号
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="总账号数" value={stats.total} color="bg-gray-100 text-gray-600" />
        <StatCard title="活跃账号" value={stats.active} color="bg-green-100 text-green-600" />
        <StatCard title="已分配" value={stats.assigned} color="bg-blue-100 text-blue-600" />
        <StatCard title="待分配" value={stats.unassigned} color="bg-yellow-100 text-yellow-600" />
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索账号名称..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* 平台筛选 */}
          <select
            value={filters.platform}
            onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="">全部平台</option>
            {platforms.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          {/* 状态筛选 */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* 批量操作按钮 */}
          {batchMode && selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">已选择 {selectedIds.length} 个账号</span>
              <button
                onClick={() => {
                  setSelectedAccounts(accounts.filter(a => selectedIds.includes(a.id)));
                  setShowAssignModal(true);
                }}
                className="px-3 py-1.5 text-sm text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg"
              >
                批量分配
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
              >
                批量删除
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消选择
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 账号列表 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p>加载中...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Smartphone className="w-12 h-12 mb-4" />
            <p>暂无账号数据</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-violet-600 hover:text-violet-700 text-sm"
            >
              添加第一个账号
            </button>
          </div>
        ) : (
          <>
            {/* 表头 */}
            {batchMode && (
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedIds.length === filteredAccounts.length && filteredAccounts.length > 0
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-gray-300'
                  }`}>
                    {selectedIds.length === filteredAccounts.length && filteredAccounts.length > 0 && (
                      <CheckCircle className="w-3 h-3" />
                    )}
                  </div>
                  全选
                </button>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {filteredAccounts.map((account) => {
                const platformConfig = getPlatformConfig(account.platform);
                const statusConfig = STATUS_CONFIG[account.status] || STATUS_CONFIG['inactive'];
                const PlatformIcon = ICON_MAP[platformConfig.icon] || Smartphone;
                const StatusIcon = statusConfig.icon;
                const assignedHotel = allHotels.find(h => h.id === account.hotelId);
                const isSelected = selectedIds.includes(account.id);

                return (
                  <div
                    key={account.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-violet-50/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* 批量选择框 */}
                      {batchMode && (
                        <button
                          onClick={() => toggleAccountSelection(account)}
                          className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'border-gray-300 hover:border-violet-400'
                          }`}
                        >
                          {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* 平台图标 */}
                      <div className={`w-12 h-12 rounded-xl ${platformConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                        {platformConfig.logo ? (
                          <img src={platformConfig.logo} alt={platformConfig.name} className="w-7 h-7 object-contain rounded" />
                        ) : (
                          <PlatformIcon className="w-6 h-6" style={{ color: platformConfig.color }} />
                        )}
                      </div>

                      {/* 账号信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{account.username}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${platformConfig.bgColor}`}
                            style={{ color: platformConfig.color }}
                          >
                            {platformConfig.name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>ID: {account.id}</span>
                          <span>登录: {account.loginMethod === 'qr' ? '扫码' : account.loginMethod === 'password' ? '密码' : 'SSO'}</span>
                          {account.lastLoginAt && (
                            <span>最近登录: {new Date(account.lastLoginAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      {/* 分配状态 */}
                      <div className="flex-shrink-0 w-48">
                        {account.hotelId !== 'unassigned' ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 truncate">{assignedHotel?.name || '未知酒店'}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">未分配</span>
                        )}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAccount(account);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑账号"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {account.hotelId !== 'unassigned' ? (
                          <button
                            onClick={() => handleUnassign(account.id)}
                            className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="回收账号"
                          >
                            <ArrowRightLeft className="w-4 h-4 inline mr-1" />
                            回收
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAccounts([account]);
                              setShowAssignModal(true);
                            }}
                            className="px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          >
                            <Building className="w-4 h-4 inline mr-1" />
                            分配
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除账号"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 新增账号弹窗 */}
      <CreateAccountModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        platforms={platforms}
        defaultHotelId={selectedHotels.length === 1 ? selectedHotels[0].id : undefined}
      />

      {/* 分配账号弹窗 */}
      <AssignModal
        show={showAssignModal}
        accounts={selectedAccounts}
        hotels={selectedHotels.length > 0 ? selectedHotels : allHotels}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedAccounts([]);
        }}
        onAssign={handleBatchAssign}
      />

      {/* 编辑账号弹窗 */}
      <EditAccountModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAccount(null);
        }}
        onEdit={handleEdit}
        account={editingAccount}
        platforms={platforms}
      />

      {/* 说明 */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">账号管理说明</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>平台列表与「渠道配置」保持同步，新增渠道后此处自动显示对应平台</li>
              <li>支持单个添加和批量添加账号（每行一个账号名称）</li>
              <li>选中多家酒店时可进行批量分配/回收操作</li>
              <li>账号分配后可在对应酒店的运营工作台中使用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
