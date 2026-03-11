/**
 * SaaS运营后台 - 客户管理（酒店维度）
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Building2,
  ChevronRight,
  TrendingUp,
  Hotel,
  Building,
  Home,
  CreditCard,
} from 'lucide-react';
import { useAdminStore, type Customer } from '../../stores/adminStore';
import { CustomerDetailModal } from './CustomerDetailModal';
import { CreateCustomerModal } from './CreateCustomerModal';
import CustomerSuccess from './CustomerSuccess';
import { Button } from '../../components/ui';
import { GroupDetailDrawer } from '../../components/GroupDetailDrawer';



const statusLabels: Record<string, { text: string; color: string }> = {
  trial: { text: '试用中', color: 'text-neon-cyan' },
  active: { text: '正常', color: 'text-neon-green' },
  suspended: { text: '已停用', color: 'text-neon-red' },
  expired: { text: '已过期', color: 'text-gray-400' },
};

const typeLabels: Record<string, { text: string; color: string; bgColor: string; icon: React.ElementType }> = {
  single: { text: '单体', color: 'text-neon-cyan', bgColor: 'bg-neon-cyan/10', icon: Home },
  group: { text: '集团', color: 'text-neon-purple', bgColor: 'bg-neon-purple/10', icon: Building },
};

const tierLabels: Record<string, { text: string; color: string }> = {
  free: { text: '免费版', color: 'text-gray-400' },
  starter: { text: '入门版', color: 'text-neon-cyan' },
  professional: { text: '专业版', color: 'text-neon-purple' },
  enterprise: { text: '企业版', color: 'text-neon-amber' },
};

export default function CustomersPage() {
  const { customers, selectCustomer, selectedCustomer } = useAdminStore();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'list' | 'success'>('list');
  const [isLoading, setIsLoading] = useState(true);
  
  // 模拟加载
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, [activeTab]);
  
  // 根据URL参数自动切换tab
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'success') {
      setActiveTab('success');
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 过滤客户（兼容旧数据：如果没有 type 则默认为 single）
  const filteredCustomers = customers.filter((customer) => {
    const customerType = customer.type || 'single';
    const matchesSearch =
      customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.hotelIds.some(id => id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesType = typeFilter === 'all' || customerType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // 统计
  // 单体酒店 = 单体客户旗下的酒店总数
  // 集团酒店 = 集团客户旗下的酒店总数  
  // 集团 = 集团客户数量
  const singleHotels = customers
    .filter(c => c.type === 'single')
    .reduce((sum, c) => sum + c.hotels.length, 0);
  const groupHotels = customers
    .filter(c => c.type === 'group')
    .reduce((sum, c) => sum + c.hotels.length, 0);
  
  const customerStats = {
    total: customers.length,
    totalHotels: customers.reduce((sum, c) => sum + c.hotels.length, 0),
    singleHotels,  // 单体酒店数
    groupHotels,   // 集团酒店数
    singleCustomers: customers.filter(c => c.type === 'single').length,
    groupCustomers: customers.filter(c => c.type === 'group').length,
  };

  const handleViewDetail = (customer: Customer) => {
    selectCustomer(customer);
    // 集团客户打开抽屉，单体客户打开弹窗
    if (customer.type === 'group') {
      setShowGroupDrawer(true);
    } else {
      setShowDetail(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {activeTab === 'success' ? '客户成功' : '客户管理'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === 'success' 
              ? '客户健康度分析 · 续约预警 · 成功指标'
              : `管理酒店客户 · 共 ${customers.length} 家 · ${customers.reduce((sum, c) => sum + c.hotels.length, 0)} 个酒店`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 只在客户列表页面显示新增按钮 */}
          {activeTab === 'list' && (
            <Button icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
              新增客户
            </Button>
          )}
        </div>
      </div>

      {/* Tab内容 */}
      <AnimatePresence mode="wait">
        {activeTab === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CustomerSuccess />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">总客户</span>
            <Building2 size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2">{customerStats.total}</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">单体酒店</span>
            <Home size={18} className="text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-cyan">{customerStats.singleHotels}</p>
          <p className="text-xs text-gray-500">{customerStats.singleCustomers}家单体客户</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">集团</span>
            <Building size={18} className="text-neon-purple" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-purple">{customerStats.groupCustomers}</p>
          <p className="text-xs text-gray-500">{customerStats.groupHotels}家集团酒店</p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">活跃客户</span>
            <TrendingUp size={18} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-green">
            {customers.filter(c => c.status === 'active').length}
          </p>
          <div className="h-1.5 bg-gray-800 rounded-full mt-2">
            <div 
              className="h-1.5 bg-neon-green rounded-full transition-all duration-1000" 
              style={{ width: `${(customers.filter(c => c.status === 'active').length / customers.length) * 100}%` }} 
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {((customers.filter(c => c.status === 'active').length / customers.length) * 100).toFixed(0)}% 活跃率
          </p>
        </div>
        <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">月GMV</span>
            <CreditCard size={18} className="text-neon-amber" />
          </div>
          <p className="text-2xl font-bold mt-2 text-neon-amber whitespace-nowrap">
            ¥{(customers.reduce((sum, c) => sum + c.monthlyRevenue, 0) / 10000).toFixed(1)}万
          </p>
          <p className="text-xs text-gray-500 mt-1">
            人均 ¥{(customers.reduce((sum, c) => sum + c.monthlyRevenue, 0) / customers.length / 10000).toFixed(1)}万
          </p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="搜索客户名称、酒店ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部类型</option>
            <option value="single">单体酒店</option>
            <option value="group">集团客户</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option value="trial">试用中</option>
            <option value="active">正常</option>
            <option value="suspended">已停用</option>
            <option value="expired">已过期</option>
          </select>
        </div>
      </div>

      {/* 客户列表 */}
      {isLoading ? (
        <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden p-8">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-1/4 animate-pulse" />
                  <div className="h-3 bg-gray-800 rounded w-1/6 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0B0F19]">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">客户/酒店</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">类型</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">套餐</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">状态</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">月GMV</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">健康度</th>
                <th className="text-left text-xs font-medium text-gray-400 py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-[#1E2538] transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="space-y-2">
                      {/* 客户信息 */}
                      {(() => {
                        const customerType = customer.type || 'single';
                        return (
                          <>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                customerType === 'group' 
                                  ? 'bg-gradient-to-br from-neon-purple/20 to-neon-purple/10' 
                                  : 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20'
                              }`}>
                                <Building2 size={18} className={customerType === 'group' ? 'text-neon-purple' : 'text-neon-cyan'} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{customer.companyName}</p>
                                  {customerType === 'group' && (
                                    <span className="px-1.5 py-0.5 bg-neon-purple/10 text-neon-purple text-xs rounded border border-neon-purple/30">
                                      集团
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">
                                  {customer.contactName} · {customer.hotels.length} 个酒店
                                  {customerType === 'group' && customer.groupProfile && (
                                    <> · {customer.groupProfile.regionCount}个区域</>
                                  )}
                                </p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                      {/* 酒店列表 */}
                      <div className="flex items-center gap-2 ml-13 flex-wrap">
                        {customer.hotels.slice(0, 4).map((hotel) => (
                          <span
                            key={hotel.id}
                            className="px-2 py-0.5 bg-gray-800 text-xs rounded flex items-center gap-1"
                          >
                            <Hotel size={10} />
                            {hotel.name}
                          </span>
                        ))}
                        {customer.hotels.length > 4 && (
                          <span className="px-2 py-0.5 bg-gray-800 text-xs rounded text-gray-400">
                            +{customer.hotels.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {(() => {
                      const customerType = customer.type || 'single';
                      const typeConfig = typeLabels[customerType];
                      const TypeIcon = typeConfig.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${typeConfig.bgColor} ${typeConfig.color}`}>
                          <TypeIcon size={12} />
                          {typeConfig.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-sm ${tierLabels[customer.tier].color}`}>
                      {tierLabels[customer.tier].text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-sm ${statusLabels[customer.status].color}`}>
                      {statusLabels[customer.status].text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium">
                      ¥{customer.monthlyRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      累计 ¥{(customer.totalRevenue / 10000).toFixed(1)}万
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    {customer.healthScore ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          customer.healthScore >= 80 ? 'bg-neon-green/10' :
                          customer.healthScore >= 60 ? 'bg-neon-amber/10' : 'bg-neon-red/10'
                        }`}>
                          <span className={`text-sm font-bold ${
                            customer.healthScore >= 80 ? 'text-neon-green' :
                            customer.healthScore >= 60 ? 'text-neon-amber' : 'text-neon-red'
                          }`}>
                            {customer.healthScore}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {customer.healthScore >= 80 ? '健康' :
                           customer.healthScore >= 60 ? '需关注' : '高风险'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleViewDetail(customer)}
                      className="flex items-center gap-1 px-3 py-1 bg-neon-cyan/20 text-neon-cyan text-sm rounded-lg hover:bg-neon-cyan/30 transition-all"
                    >
                      详情
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 客户详情弹窗（单体客户） */}
      {showDetail && selectedCustomer && selectedCustomer.type !== 'group' && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* 集团详情抽屉（集团客户） */}
      {selectedCustomer && (
        <GroupDetailDrawer
          customer={selectedCustomer}
          isOpen={showGroupDrawer}
          onClose={() => setShowGroupDrawer(false)}
        />
      )}

      {/* 新增客户弹窗 */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
