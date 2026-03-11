/**
 * 集团详情抽屉 - 展示集团→区域→门店层级结构
 * Phase 1: 集团客户基础能力
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building,
  MapPin,
  Hotel,
  Users,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Network,
  TrendingUp,
  Activity,
  Target,
  FileText
} from 'lucide-react';
import type { Customer, HotelData } from '../stores/adminStore';
import { AIValueReport } from './AIValueReport';
import { GroupBroadcastBridge, useGroupBroadcast } from './GroupBroadcastBridge';
import { Radio } from 'lucide-react';

interface GroupDetailDrawerProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

// 按区域分组酒店
function groupHotelsByRegion(hotels: HotelData[], regionCount: number): Map<string, HotelData[]> {
  const regions = new Map<string, HotelData[]>();
  
  // 如果没有区域数据，按简单规则分配（实际应从后端获取）
  const regionNames = ['华东区', '华北区', '华南区', '西南区', '其他'];
  
  hotels.forEach((hotel, index) => {
    // 模拟区域分配：根据酒店ID或名称哈希分配
    const regionIndex = index % Math.max(regionCount, 1);
    const regionName = regionNames[regionIndex] || '其他';
    
    if (!regions.has(regionName)) {
      regions.set(regionName, []);
    }
    regions.get(regionName)!.push(hotel);
  });
  
  return regions;
}

// 酒店状态标签
function HotelStatusBadge({ hotel }: { hotel: HotelData }) {
  const lastLogin = new Date(hotel.lastLoginAt || Date.now());
  const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  
  let status = { label: '活跃', color: 'bg-neon-green/20 text-neon-green', icon: Activity };
  if (daysSinceLogin > 7) status = { label: '低频', color: 'bg-neon-amber/20 text-neon-amber', icon: Calendar };
  if (daysSinceLogin > 30) status = { label: '沉睡', color: 'bg-neon-red/20 text-neon-red', icon: X };
  
  const Icon = status.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${status.color}`}>
      <Icon size={10} />
      {status.label}
    </span>
  );
}

// 区域折叠面板
function RegionAccordion({
  regionName,
  hotels,
  defaultOpen = false
}: {
  regionName: string;
  hotels: HotelData[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // 计算区域统计
  const totalRevenue = hotels.reduce((sum, h) => sum + (h.todayRevenue || 0), 0);
  const avgOccupancy = hotels.reduce((sum, h) => sum + (h.occupancyRate || 0), 0) / hotels.length;
  const activeHotels = hotels.filter(h => {
    const daysSince = Math.floor((Date.now() - new Date(h.lastLoginAt || 0).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 7;
  }).length;
  
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[#0B0F19] hover:bg-[#1E2538] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
            <MapPin size={18} className="text-neon-purple" />
          </div>
          <div>
            <h4 className="font-medium text-white">{regionName}</h4>
            <p className="text-xs text-gray-400">{hotels.length} 家门店 · {activeHotels} 家活跃</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-neon-cyan">¥{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">今日营收</p>
          </div>
          <div className="text-right w-16">
            <p className="text-sm font-medium text-neon-green">{avgOccupancy.toFixed(0)}%</p>
            <p className="text-xs text-gray-500">入住率</p>
          </div>
          {isOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-[#151B2B]">
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                      <Hotel size={14} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{hotel.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <HotelStatusBadge hotel={hotel} />
                        <span className="text-xs text-gray-500">
                          上次登录: {new Date(hotel.lastLoginAt || 0).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">¥{(hotel.todayRevenue || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">今日</p>
                    </div>
                    <div className="text-right w-14">
                      <p className="text-sm font-medium">{hotel.occupancyRate || 0}%</p>
                      <p className="text-xs text-gray-500">入住率</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GroupDetailDrawer({ customer, isOpen, onClose }: GroupDetailDrawerProps) {
  const [showAIReport, setShowAIReport] = useState(false);
  const { syncGroup } = useGroupBroadcast();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  
  // 手动同步到集团端
  const handleSyncToGroup = () => {
    setSyncStatus('syncing');
    syncGroup(customer, 'focus');
    setTimeout(() => {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }, 500);
  };
  
  if (!isOpen || customer.type !== 'group') return null;
  
  const groupProfile = customer.groupProfile;
  const regions = groupHotelsByRegion(customer.hotels, groupProfile?.regionCount || 1);
  
  // 计算集团总体统计
  const totalRevenue = customer.hotels.reduce((sum, h) => sum + (h.todayRevenue || 0), 0);
  const avgOccupancy = customer.hotels.reduce((sum, h) => sum + (h.occupancyRate || 0), 0) / customer.hotels.length;
  const activeHotels = customer.hotels.filter(h => {
    const daysSince = Math.floor((Date.now() - new Date(h.lastLoginAt || 0).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 7;
  }).length;
  
  // 决策链联系人
  const decisionChain = groupProfile?.decisionChain || [];
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BroadcastChannel 桥接 - 自动同步到集团端 */}
          <GroupBroadcastBridge 
            customer={customer} 
            enabled={isOpen} 
            mode="auto"
          />
          
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* 抽屉 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0B0F19] border-l border-gray-800 z-50 overflow-hidden flex flex-col"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#151B2B]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-purple/10 flex items-center justify-center">
                  <Building size={24} className="text-neon-purple" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{customer.companyName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-neon-purple/10 text-neon-purple text-xs rounded border border-neon-purple/30">
                      集团客户
                    </span>
                    <span className="text-sm text-gray-400">
                      {customer.hotels.length} 家门店 · {regions.size} 个区域
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncToGroup}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
                    syncStatus === 'synced' 
                      ? 'bg-neon-green/20 text-neon-green' 
                      : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30'
                  }`}
                  title="同步到集团端"
                >
                  <Radio size={16} className={syncStatus === 'syncing' ? 'animate-pulse' : ''} />
                  {syncStatus === 'synced' ? '已同步' : '同步到集团'}
                </button>
                <button
                  onClick={() => setShowAIReport(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-neon-cyan/20 text-neon-cyan text-sm rounded-lg hover:bg-neon-cyan/30 transition-colors"
                >
                  <FileText size={16} />
                  AI价值报告
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 关键指标卡片 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <CreditCard size={14} />
                    合同金额
                  </div>
                  <p className="text-xl font-bold text-neon-amber">
                    ¥{((groupProfile?.contractValue || 0) / 10000).toFixed(0)}万
                  </p>
                </div>
                <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Calendar size={14} />
                    续约日期
                  </div>
                  <p className="text-xl font-bold text-white">
                    {groupProfile?.renewalDate ? new Date(groupProfile.renewalDate).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <TrendingUp size={14} />
                    今日总营收
                  </div>
                  <p className="text-xl font-bold text-neon-cyan">
                    ¥{(totalRevenue / 10000).toFixed(1)}万
                  </p>
                </div>
                <div className="p-4 bg-[#151B2B] rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                    <Target size={14} />
                    平均入住率
                  </div>
                  <p className="text-xl font-bold text-neon-green">
                    {avgOccupancy.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              {/* 决策链 */}
              {decisionChain.length > 0 && (
                <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                    <Network size={16} />
                    决策链
                  </h3>
                  <div className="flex items-center gap-3">
                    {decisionChain.map((person, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#0B0F19] rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
                            <Users size={14} className="text-neon-purple" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{person.name}</p>
                            <p className="text-xs text-gray-500">{person.role}</p>
                          </div>
                        </div>
                        {index < decisionChain.length - 1 && (
                          <ChevronRight size={16} className="text-gray-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 组织架构 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Network size={18} className="text-neon-purple" />
                    组织架构
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">
                      活跃门店: <span className="text-neon-green font-medium">{activeHotels}</span>/{customer.hotels.length}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {Array.from(regions.entries()).map(([regionName, hotels]) => (
                    <RegionAccordion
                      key={regionName}
                      regionName={regionName}
                      hotels={hotels}
                      defaultOpen={regions.size === 1}
                    />
                  ))}
                </div>
              </div>
              
              {/* 联系信息 */}
              <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-4">联系信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <Users size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">联系人</p>
                      <p className="text-sm font-medium">{customer.contactName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <Phone size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">联系电话</p>
                      <p className="text-sm font-medium">{customer.contactPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <Mail size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">邮箱</p>
                      <p className="text-sm font-medium">{customer.contactEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                      <MapPin size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">地址</p>
                      <p className="text-sm font-medium">{(customer as any).address || '未填写'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* AI价值报告弹窗 */}
          <AIValueReport
            customer={customer}
            isOpen={showAIReport}
            onClose={() => setShowAIReport(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
