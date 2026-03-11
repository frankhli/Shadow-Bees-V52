/**
 * 企业版客户管理 V2
 * 
 * 双维度客户管理：
 * 1. B端客户（酒店客户）- 华美会的加盟酒店客户
 * 2. C端客户（住客管理）- 酒店的住客/会员
 * 
 * 酒店选择器影响：
 * - B端：不受影响，始终查看所有加盟酒店
 * - C端：受酒店选择器过滤，查看选中酒店的住客
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Users, Star, Building2,
  DollarSign, Search,
  Download, Plus, Edit2, Eye,
  MessageSquare, ShoppingBag, Award,
  CheckCircle2,
  XCircle, Clock,
  TrendingUp as TrendingUpIcon,
  Layers, X, Phone, MapPin, Calendar,
  RefreshCw
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { customerApi } from '../../api';
import type { HotelPartner, Customer } from '../../api/customerApi';
import { useToast } from '../../../components/ui/Toast';

// ============================================
// 类型定义（从API导入）
// ============================================

import type { 
  HotelPartnerStatus, 
  HotelPartnerTier,
  CustomerTier,
  CustomerStatus,
  CustomerSource
} from '../../api/customerApi';

// ============================================
// 配置
// ============================================

// B端酒店客户配置
const hotelPartnerStatusConfig: Record<HotelPartnerStatus, { name: string; color: string; bgColor: string; icon: any }> = {
  active: { name: '合作中', color: '#10B981', bgColor: '#F0FDF4', icon: CheckCircle2 },
  pending: { name: '待审核', color: '#F59E0B', bgColor: '#FFFBEB', icon: Clock },
  suspended: { name: '已暂停', color: '#EF4444', bgColor: '#FEF2F2', icon: XCircle },
  terminated: { name: '已终止', color: '#6B7280', bgColor: '#F3F4F6', icon: XCircle },
};

const hotelPartnerTierConfig: Record<HotelPartnerTier, { name: string; color: string; bgColor: string }> = {
  strategic: { name: '战略合作', color: '#8B5CF6', bgColor: '#F5F3FF' },
  core: { name: '核心伙伴', color: '#3B82F6', bgColor: '#EFF6FF' },
  standard: { name: '标准合作', color: '#10B981', bgColor: '#F0FDF4' },
  trial: { name: '试用期', color: '#F59E0B', bgColor: '#FFFBEB' },
};

// C端住客配置
const customerTierConfig: Record<CustomerTier, { name: string; color: string; bgColor: string; icon: any }> = {
  vip: { name: 'VIP', color: '#8B5CF6', bgColor: '#F5F3FF', icon: Star },
  gold: { name: '金卡', color: '#F59E0B', bgColor: '#FFFBEB', icon: Star },
  silver: { name: '银卡', color: '#6B7280', bgColor: '#F3F4F6', icon: Star },
  regular: { name: '普通', color: '#10B981', bgColor: '#F0FDF4', icon: Users },
};

const customerStatusConfig: Record<CustomerStatus, { name: string; color: string; bgColor: string }> = {
  active: { name: '活跃', color: '#10B981', bgColor: '#F0FDF4' },
  inactive: { name: '沉睡', color: '#F59E0B', bgColor: '#FFFBEB' },
  lost: { name: '流失', color: '#EF4444', bgColor: '#FEF2F2' },
};

const customerSourceConfig: Record<CustomerSource, { name: string; color: string; bgColor: string }> = {
  ota: { name: 'OTA', color: '#3B82F6', bgColor: '#EFF6FF' },
  wechat: { name: '微信', color: '#07C160', bgColor: '#F0FDF4' },
  xianyu: { name: '闲鱼', color: '#FF6B00', bgColor: '#FFF7ED' },
  xhs: { name: '小红书', color: '#FF2442', bgColor: '#FEF2F2' },
  direct: { name: '直客', color: '#8B5CF6', bgColor: '#F5F3FF' },
  referral: { name: '转介绍', color: '#F59E0B', bgColor: '#FFFBEB' },
};

// ============================================
// Mock 数据
// ============================================

// ============================================
// 主组件 - 数据通过 API 从 customerApi 加载
// ============================================

export function CustomerManagement() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotelsList = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );
  const toast = useToast();
  
  // Tab 状态
  const [activeTab, setActiveTab] = useState<'b-customer' | 'c-customer'>('b-customer');
  
  // 搜索和筛选
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // 数据状态
  const [hotelPartners, setHotelPartners] = useState<HotelPartner[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  // Loading state for future use with skeleton loaders
  // const [isLoading, setIsLoading] = useState(false);
  
  // 从API加载B端客户（酒店）数据
  useEffect(() => {
    const loadHotelPartners = async () => {
      // setIsLoading(true);
      try {
        const response = await customerApi.getHotelPartners({
          page: 1,
          pageSize: 100,
        });
        if (response.success) {
          setHotelPartners(response.data.list);
        }
      } catch (error) {
        console.error('加载B端客户失败:', error);
      } finally {
        // setIsLoading(false);
      }
    };

    loadHotelPartners();
  }, []);
  
  // 从API加载C端客户（住客）数据
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await customerApi.getCustomers({
          page: 1,
          pageSize: 100,
          hotelIds: selectedHotelIds.length > 0 ? selectedHotelIds : undefined,
        });
        if (response.success) {
          setCustomers(response.data.list);
        }
      } catch (error) {
        console.error('加载C端客户失败:', error);
      }
    };

    loadCustomers();
  }, [selectedHotelIds]);
  
  // 模态框状态
  const [selectedPartner, setSelectedPartner] = useState<HotelPartner | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // 添加酒店弹窗状态
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelCity, setNewHotelCity] = useState('');
  const [newHotelAddress, setNewHotelAddress] = useState('');
  const [newHotelContact, setNewHotelContact] = useState('');
  const [newHotelPhone, setNewHotelPhone] = useState('');
  const [isAddingHotel, setIsAddingHotel] = useState(false);
  
  // 编辑酒店弹窗状态
  const [showEditHotelModal, setShowEditHotelModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelPartner | null>(null);
  const [editHotelName, setEditHotelName] = useState('');
  const [editHotelCity, setEditHotelCity] = useState('');
  const [editHotelAddress, setEditHotelAddress] = useState('');
  const [editHotelContact, setEditHotelContact] = useState('');
  const [editHotelPhone, setEditHotelPhone] = useState('');
  const [editHotelStatus, setEditHotelStatus] = useState<HotelPartnerStatus>('active');
  const [editHotelTier, setEditHotelTier] = useState<HotelPartnerTier>('standard');
  const [isSavingHotel, setIsSavingHotel] = useState(false);
  
  // 发送消息弹窗状态
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{id: string, name: string, type: 'partner' | 'customer'} | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // ===== B端酒店客户筛选 =====
  const filteredHotelPartners = useMemo(() => {
    return hotelPartners.filter(partner => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!partner.name.toLowerCase().includes(query) && 
            !partner.city.toLowerCase().includes(query) &&
            !partner.contactName.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filterTier !== 'all' && partner.tier !== filterTier) return false;
      if (filterStatus !== 'all' && partner.status !== filterStatus) return false;
      return true;
    });
  }, [hotelPartners, searchQuery, filterTier, filterStatus]);
  
  // ===== C端住客筛选（关联酒店选择器）=====
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // 酒店选择器过滤
      if (selectedHotelIds.length > 0) {
        const hasVisitedSelectedHotel = customer.allVisitedHotels.some(hotelName => 
          selectedHotelsList.some(h => h.name === hotelName)
        ) || selectedHotelIds.includes(customer.preferredHotelId || '');
        
        if (!hasVisitedSelectedHotel) return false;
      }
      
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!customer.name.toLowerCase().includes(query) && 
            !customer.phone.includes(query)) {
          return false;
        }
      }
      
      if (filterTier !== 'all' && customer.tier !== filterTier) return false;
      if (filterStatus !== 'all' && customer.status !== filterStatus) return false;
      
      return true;
    });
  }, [customers, selectedHotelIds, selectedHotelsList, searchQuery, filterTier, filterStatus]);
  
  // 统计
  const bStats = useMemo(() => {
    const activeCount = hotelPartners.filter(p => p.status === 'active').length;
    const totalRevenue = hotelPartners.reduce((sum, p) => sum + p.monthlyRevenue, 0);
    const avgRating = hotelPartners.reduce((sum, p) => sum + p.rating, 0) / hotelPartners.length;
    
    return {
      total: hotelPartners.length,
      activeCount,
      pendingCount: hotelPartners.filter(p => p.status === 'pending').length,
      suspendedCount: hotelPartners.filter(p => p.status === 'suspended').length,
      totalRevenue,
      avgRating: avgRating.toFixed(1),
    };
  }, [hotelPartners]);
  
  const cStats = useMemo(() => {
    const filtered = filteredCustomers;
    const totalSpent = filtered.reduce((sum, c) => sum + c.totalSpent, 0);
    
    return {
      total: filtered.length,
      vipCount: filtered.filter(c => c.tier === 'vip').length,
      activeCount: filtered.filter(c => c.status === 'active').length,
      totalSpent,
      avgOrderValue: filtered.length > 0 ? Math.round(totalSpent / filtered.length) : 0,
    };
  }, [filteredCustomers]);
  
  // 获取状态颜色
  const getPartnerStatusColor = (status: HotelPartnerStatus) => hotelPartnerStatusConfig[status];
  const getPartnerTierColor = (tier: HotelPartnerTier) => hotelPartnerTierConfig[tier];
  const getCustomerTierColor = (tier: CustomerTier) => customerTierConfig[tier];
  const getCustomerStatusColor = (status: CustomerStatus) => customerStatusConfig[status];
  
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            华美会双维度客户管理：加盟酒店（B端）+ 住客会员（C端）
          </p>
        </div>
      </div>
      
      {/* Tab 导航 */}
      <div className="bg-white rounded-xl border border-gray-200 p-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('b-customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'b-customer'
                ? 'bg-violet-100 text-violet-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>B端客户</span>
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {bStats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('c-customer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'c-customer'
                ? 'bg-violet-100 text-violet-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>C端住客</span>
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {cStats.total}
            </span>
          </button>
        </div>
      </div>
      
      {/* C端住客管理时显示酒店选择器提示 */}
      {activeTab === 'c-customer' && selectedHotelIds.length > 1 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  正在查看 {selectedHotelIds.length} 家酒店的住客数据
                </span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3" />
                {selectedHotelsList.slice(0, 3).map(h => h.name).join('、')}
                {selectedHotelsList.length > 3 && ` 等${selectedHotelsList.length - 3}家`}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* C端住客管理时未选择酒店提示 */}
      {activeTab === 'c-customer' && selectedHotelIds.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="font-medium text-amber-900">未选择酒店</div>
              <div className="text-sm text-amber-700">
                请从顶部酒店选择器中选择酒店，查看对应酒店的住客数据
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* B端酒店客户 */}
      {activeTab === 'b-customer' && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{bStats.total}</div>
                  <div className="text-sm text-gray-500">加盟酒店总数</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{bStats.activeCount}</div>
                  <div className="text-sm text-gray-500">合作中</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">¥{(bStats.totalRevenue / 10000).toFixed(1)}万</div>
                  <div className="text-sm text-gray-500">月总营收</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{bStats.avgRating}</div>
                  <div className="text-sm text-gray-500">平均评分</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 筛选和搜索 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索酒店名称、城市、联系人..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">全部等级</option>
                <option value="strategic">战略合作</option>
                <option value="core">核心伙伴</option>
                <option value="standard">标准合作</option>
                <option value="trial">试用期</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">全部状态</option>
                <option value="active">合作中</option>
                <option value="pending">待审核</option>
                <option value="suspended">已暂停</option>
              </select>
              <button 
                onClick={() => setShowAddHotelModal(true)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加酒店
              </button>
            </div>
          </div>
          
          {/* 酒店客户列表 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">酒店信息</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">合作等级</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">业绩数据</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">客户经理</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHotelPartners.map((partner) => {
                  const statusStyle = getPartnerStatusColor(partner.status);
                  const tierStyle = getPartnerTierColor(partner.tier);
                  const StatusIcon = statusStyle.icon;
                  
                  return (
                    <tr key={partner.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-fuchsia-400 rounded-lg flex items-center justify-center text-white font-bold">
                            {partner.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{partner.name}</div>
                            <div className="text-sm text-gray-500">{partner.brand} · {partner.city}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full`} style={{ color: tierStyle.color, backgroundColor: tierStyle.bgColor }}>
                          {tierStyle.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full`} style={{ color: statusStyle.color, backgroundColor: statusStyle.bgColor }}>
                          <StatusIcon className="w-3 h-3" />
                          {statusStyle.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">¥{partner.monthlyRevenue.toLocaleString()}</div>
                          <div className="text-gray-500">{partner.totalOrders}单 · 佣金{partner.commissionRate}%</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="text-gray-900">{partner.contactName}</div>
                          <div className="text-gray-500">{partner.contactPhone}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{partner.accountManager}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedPartner(partner);
                              setShowPartnerModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingHotel(partner);
                              setEditHotelName(partner.name);
                              setEditHotelCity(partner.city);
                              setEditHotelAddress(partner.address || '');
                              setEditHotelContact(partner.contactName || '');
                              setEditHotelPhone(partner.contactPhone || '');
                              setEditHotelStatus(partner.status);
                              setEditHotelTier(partner.tier);
                              setShowEditHotelModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* C端住客管理 */}
      {activeTab === 'c-customer' && selectedHotelIds.length > 0 && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{cStats.total}</div>
                  <div className="text-sm text-gray-500">住客总数</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{cStats.vipCount}</div>
                  <div className="text-sm text-gray-500">VIP会员</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUpIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">¥{(cStats.totalSpent / 10000).toFixed(1)}万</div>
                  <div className="text-sm text-gray-500">总消费额</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">¥{cStats.avgOrderValue}</div>
                  <div className="text-sm text-gray-500">客单价</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 筛选和搜索 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索客户姓名、手机号..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">全部等级</option>
                <option value="vip">VIP</option>
                <option value="gold">金卡</option>
                <option value="silver">银卡</option>
                <option value="regular">普通</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">全部状态</option>
                <option value="active">活跃</option>
                <option value="inactive">沉睡</option>
                <option value="lost">流失</option>
              </select>
              <button 
                onClick={() => {
                  if (filteredCustomers.length === 0) {
                    toast.warning('暂无数据可导出');
                    return;
                  }
                  try {
                    const headers = ['客户姓名', '手机号', '会员等级', '状态', '总消费(元)', '订单数', '偏好酒店', '来源'];
                    const rows = filteredCustomers.map(c => [
                      c.name, c.phone, c.tier, c.status, c.totalSpent, c.totalOrders, c.preferredHotelName || '-', c.source
                    ]);
                    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `住客数据_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success('导出成功', '住客数据已导出');
                  } catch (error) {
                    toast.error('导出失败', '请稍后重试');
                  }
                }}
                disabled={filteredCustomers.length === 0}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          </div>
          
          {/* 住客列表 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">客户信息</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">会员等级</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">消费记录</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">偏好酒店</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">来源</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const tierStyle = getCustomerTierColor(customer.tier);
                  const statusStyle = getCustomerStatusColor(customer.status);
                  const sourceStyle = customerSourceConfig[customer.source];
                  const TierIcon = tierStyle.icon;
                  
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full`} style={{ color: tierStyle.color, backgroundColor: tierStyle.bgColor }}>
                          <TierIcon className="w-3 h-3" />
                          {tierStyle.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full`} style={{ color: statusStyle.color, backgroundColor: statusStyle.bgColor }}>
                          {statusStyle.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">¥{customer.totalSpent.toLocaleString()}</div>
                          <div className="text-gray-500">{customer.totalOrders}次入住</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="text-gray-900">{customer.preferredHotelName || '-'}</div>
                          {customer.allVisitedHotels.length > 1 && (
                            <div className="text-gray-500">曾住{customer.allVisitedHotels.length}家酒店</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full`} style={{ color: sourceStyle.color, backgroundColor: sourceStyle.bgColor }}>
                          {sourceStyle.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowCustomerModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setMessageTarget({id: customer.id, name: customer.name, type: 'customer'});
                              setMessageContent('');
                              setShowMessageModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* C端空状态 */}
      {activeTab === 'c-customer' && selectedHotelIds.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">请选择酒店查看住客数据</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            C端住客管理需要选择至少一家酒店才能查看。<br/>
            支持查看跨酒店的会员档案和消费记录。
          </p>
        </div>
      )}
          
      {/* B端酒店客户详情模态框 */}
      {showPartnerModal && selectedPartner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-fuchsia-400 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  {selectedPartner.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPartner.name}</h3>
                  <p className="text-sm text-gray-500">{selectedPartner.brand} · {selectedPartner.city}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPartnerModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 状态标签 */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm rounded-full`} style={{ 
                  color: hotelPartnerTierConfig[selectedPartner.tier].color, 
                  backgroundColor: hotelPartnerTierConfig[selectedPartner.tier].bgColor 
                }}>
                  {hotelPartnerTierConfig[selectedPartner.tier].name}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full`} style={{ 
                  color: hotelPartnerStatusConfig[selectedPartner.status].color, 
                  backgroundColor: hotelPartnerStatusConfig[selectedPartner.status].bgColor 
                }}>
                  {hotelPartnerStatusConfig[selectedPartner.status].name}
                </span>
              </div>
              
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">地址</span>
                  </div>
                  <p className="text-gray-900">{selectedPartner.address}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">客房数</span>
                  </div>
                  <p className="text-gray-900">{selectedPartner.roomCount}间</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">联系人</span>
                  </div>
                  <p className="text-gray-900">{selectedPartner.contactName}</p>
                  <p className="text-gray-500 text-sm">{selectedPartner.contactPhone}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">合作时间</span>
                  </div>
                  <p className="text-gray-900">{selectedPartner.joinDate} 至 {selectedPartner.contractEndDate}</p>
                </div>
              </div>
              
              {/* 业绩数据 */}
              <div className="p-4 bg-violet-50 rounded-xl">
                <h4 className="font-medium text-violet-900 mb-4">业绩数据</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-violet-700">¥{selectedPartner.monthlyRevenue.toLocaleString()}</div>
                    <div className="text-sm text-violet-600">月营收</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-violet-700">{selectedPartner.totalOrders}</div>
                    <div className="text-sm text-violet-600">月订单</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-violet-700">{selectedPartner.commissionRate}%</div>
                    <div className="text-sm text-violet-600">佣金比例</div>
                  </div>
                </div>
              </div>
              
              {/* 标签 */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">标签</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPartner.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowPartnerModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                关闭
              </button>
              <button 
                onClick={() => {
                  if (selectedPartner) {
                    setEditingHotel(selectedPartner);
                    setEditHotelName(selectedPartner.name);
                    setEditHotelCity(selectedPartner.city);
                    setEditHotelAddress(selectedPartner.address || '');
                    setEditHotelContact(selectedPartner.contactName || '');
                    setEditHotelPhone(selectedPartner.contactPhone || '');
                    setEditHotelStatus(selectedPartner.status);
                    setEditHotelTier(selectedPartner.tier);
                    setShowPartnerModal(false);
                    setShowEditHotelModal(true);
                  }
                }}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                编辑信息
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* C端住客详情模态框 */}
      {showCustomerModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h3>
                  <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 会员等级和状态 */}
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full`} style={{ 
                  color: customerTierConfig[selectedCustomer.tier].color, 
                  backgroundColor: customerTierConfig[selectedCustomer.tier].bgColor 
                }}>
                  <Star className="w-3 h-3" />
                  {customerTierConfig[selectedCustomer.tier].name}会员
                </span>
                <span className={`px-3 py-1 text-sm rounded-full`} style={{ 
                  color: customerStatusConfig[selectedCustomer.status].color, 
                  backgroundColor: customerStatusConfig[selectedCustomer.status].bgColor 
                }}>
                  {customerStatusConfig[selectedCustomer.status].name}
                </span>
              </div>
              
              {/* 消费统计 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-violet-700">¥{selectedCustomer.totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-violet-600">总消费</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-700">{selectedCustomer.totalOrders}</div>
                  <div className="text-sm text-blue-600">入住次数</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-700">¥{Math.round(selectedCustomer.totalSpent / selectedCustomer.totalOrders)}</div>
                  <div className="text-sm text-green-600">客单价</div>
                </div>
              </div>
              
              {/* 酒店偏好 */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  酒店偏好
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">偏好酒店</span>
                    <span className="font-medium text-gray-900">{selectedCustomer.preferredHotelName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">住过酒店数</span>
                    <span className="font-medium text-gray-900">{selectedCustomer.allVisitedHotels.length}家</span>
                  </div>
                  {selectedCustomer.lastStayDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">最近入住</span>
                      <span className="font-medium text-gray-900">{selectedCustomer.lastStayDate}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 来源和标签 */}
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-sm text-gray-500">客户来源</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full`} style={{ 
                    color: customerSourceConfig[selectedCustomer.source].color, 
                    backgroundColor: customerSourceConfig[selectedCustomer.source].bgColor 
                  }}>
                    {customerSourceConfig[selectedCustomer.source].name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500">标签</span>
                  {selectedCustomer.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* 备注 */}
              {selectedCustomer.note && (
                <div className="p-4 bg-amber-50 rounded-xl">
                  <h4 className="font-medium text-amber-900 mb-1">备注</h4>
                  <p className="text-amber-800">{selectedCustomer.note}</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                关闭
              </button>
              <button 
                onClick={() => {
                  if (selectedCustomer) {
                    setMessageTarget({id: selectedCustomer.id, name: selectedCustomer.name, type: 'customer'});
                    setMessageContent('');
                    setShowCustomerModal(false);
                    setShowMessageModal(true);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                发送消息
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加酒店弹窗 */}
      {showAddHotelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">添加新酒店</h3>
              <button 
                onClick={() => setShowAddHotelModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">酒店名称 *</label>
                <input
                  type="text"
                  value={newHotelName}
                  onChange={(e) => setNewHotelName(e.target.value)}
                  placeholder="例如：如家酒店·成都春熙路店"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">城市 *</label>
                  <input
                    type="text"
                    value={newHotelCity}
                    onChange={(e) => setNewHotelCity(e.target.value)}
                    placeholder="例如：成都"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input
                    type="text"
                    value={newHotelContact}
                    onChange={(e) => setNewHotelContact(e.target.value)}
                    placeholder="负责人姓名"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                <input
                  type="text"
                  value={newHotelPhone}
                  onChange={(e) => setNewHotelPhone(e.target.value)}
                  placeholder="138xxxxxxx"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
                <textarea
                  value={newHotelAddress}
                  onChange={(e) => setNewHotelAddress(e.target.value)}
                  placeholder="酒店详细地址"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddHotelModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!newHotelName.trim() || !newHotelCity.trim()) {
                    toast.warning('请填写必填项', '酒店名称和城市为必填项');
                    return;
                  }
                  
                  setIsAddingHotel(true);
                  try {
                    // 模拟API调用
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // 创建新酒店对象
                    const newHotel: HotelPartner = {
                      id: `hotel-${Date.now()}`,
                      name: newHotelName,
                      brand: newHotelName,
                      city: newHotelCity,
                      address: newHotelAddress || '待完善',
                      contactName: newHotelContact || '待完善',
                      contactPhone: newHotelPhone || '待完善',
                      status: 'pending',
                      tier: 'trial',
                      joinDate: new Date().toISOString().split('T')[0],
                      contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      roomCount: 0,
                      monthlyRevenue: 0,
                      totalOrders: 0,
                      settlementCycle: 'monthly',
                      commissionRate: 10,
                      rating: 4.0,
                      tags: ['新签约'],
                      lastActiveDate: new Date().toISOString().split('T')[0],
                    };
                    
                    // 添加到列表
                    setHotelPartners(prev => [newHotel, ...prev]);
                    
                    toast.success('添加成功', `已添加酒店：${newHotelName}`);
                    setShowAddHotelModal(false);
                    
                    // 重置表单
                    setNewHotelName('');
                    setNewHotelCity('');
                    setNewHotelAddress('');
                    setNewHotelContact('');
                    setNewHotelPhone('');
                  } catch (error) {
                    toast.error('添加失败', '请稍后重试');
                  } finally {
                    setIsAddingHotel(false);
                  }
                }}
                disabled={isAddingHotel || !newHotelName.trim() || !newHotelCity.trim()}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isAddingHotel && <RefreshCw className="w-4 h-4 animate-spin" />}
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑酒店弹窗 */}
      {showEditHotelModal && editingHotel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">编辑酒店信息</h3>
              <button 
                onClick={() => setShowEditHotelModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">酒店名称 *</label>
                <input
                  type="text"
                  value={editHotelName}
                  onChange={(e) => setEditHotelName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">城市 *</label>
                  <input
                    type="text"
                    value={editHotelCity}
                    onChange={(e) => setEditHotelCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input
                    type="text"
                    value={editHotelContact}
                    onChange={(e) => setEditHotelContact(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                <input
                  type="text"
                  value={editHotelPhone}
                  onChange={(e) => setEditHotelPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
                <textarea
                  value={editHotelAddress}
                  onChange={(e) => setEditHotelAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">合作状态</label>
                  <select
                    value={editHotelStatus}
                    onChange={(e) => setEditHotelStatus(e.target.value as HotelPartnerStatus)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="active">合作中</option>
                    <option value="pending">待审核</option>
                    <option value="suspended">已暂停</option>
                    <option value="terminated">已终止</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">合作等级</label>
                  <select
                    value={editHotelTier}
                    onChange={(e) => setEditHotelTier(e.target.value as HotelPartnerTier)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="strategic">战略合作</option>
                    <option value="core">核心伙伴</option>
                    <option value="standard">标准合作</option>
                    <option value="trial">试用期</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowEditHotelModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!editHotelName.trim() || !editHotelCity.trim()) {
                    toast.warning('请填写必填项', '酒店名称和城市为必填项');
                    return;
                  }
                  
                  setIsSavingHotel(true);
                  try {
                    // 模拟API调用
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // 更新酒店信息
                    setHotelPartners(prev => prev.map(h => 
                      h.id === editingHotel.id 
                        ? {
                            ...h,
                            name: editHotelName,
                            city: editHotelCity,
                            address: editHotelAddress || h.address,
                            contactName: editHotelContact || h.contactName,
                            contactPhone: editHotelPhone || h.contactPhone,
                            status: editHotelStatus,
                            tier: editHotelTier,
                          }
                        : h
                    ));
                    
                    toast.success('保存成功', `已更新酒店：${editHotelName}`);
                    setShowEditHotelModal(false);
                    setEditingHotel(null);
                  } catch (error) {
                    toast.error('保存失败', '请稍后重试');
                  } finally {
                    setIsSavingHotel(false);
                  }
                }}
                disabled={isSavingHotel || !editHotelName.trim() || !editHotelCity.trim()}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingHotel && <RefreshCw className="w-4 h-4 animate-spin" />}
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发送消息弹窗 */}
      {showMessageModal && messageTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                发送消息给 {messageTarget.name}
              </h3>
              <button 
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageContent('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">消息内容</label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="请输入要发送的消息内容..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持发送文字消息，对方将在系统中收到通知。
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageContent('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!messageContent.trim()) {
                    toast.warning('请输入消息内容', '消息内容不能为空');
                    return;
                  }
                  
                  setIsSendingMessage(true);
                  try {
                    // 模拟API调用
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    toast.success('发送成功', `已向 ${messageTarget.name} 发送消息`);
                    setShowMessageModal(false);
                    setMessageContent('');
                    setMessageTarget(null);
                  } catch (error) {
                    toast.error('发送失败', '请稍后重试');
                  } finally {
                    setIsSendingMessage(false);
                  }
                }}
                disabled={isSendingMessage || !messageContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSendingMessage && <RefreshCw className="w-4 h-4 animate-spin" />}
                发送消息
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerManagement;
