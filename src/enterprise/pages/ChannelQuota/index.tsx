/**
 * 渠道库存配额中心
 * 
 * 核心定位：不管理总库存，只分配渠道配额
 * 
 * 数据流向：
 * 1. PMS总库存（只读）- 从华美会PMS获取
 * 2. 渠道配额（读写）- Shadow-Bees管理分配给各私域渠道的库存
 * 
 * 约束：渠道配额总和 ≤ PMS总库存
 */

import { useState, useMemo, useEffect } from 'react';

import {
  Building2, Package, TrendingUp, AlertCircle,
  ChevronLeft, ChevronRight, ExternalLink,
  RotateCcw, Eye, Store, Info
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';

// ============================================
// 类型定义
// ============================================
type ChannelType = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';

interface ChannelQuota {
  channelId: string;
  allocated: number;      // 已分配给该渠道的配额
  sold: number;           // 该渠道已售出
  remaining: number;      // 该渠道剩余可售
}

interface RoomTypeQuota {
  roomTypeId: string;
  roomTypeName: string;
  pmsTotal: number;       // PMS总库存（只读）
  pmsSold: number;        // PMS已售（包含所有渠道）
  pmsAvailable: number;   // PMS剩余可用
  channels: ChannelQuota[];
  reservedForPMS: number; // 保留给PMS直销的库存
}

// 导出供其他模块使用
export interface DailyQuota {
  date: string;
  roomTypes: RoomTypeQuota[];
}

// ============================================
// 渠道配置
// ============================================
const CHANNEL_CONFIG: Record<ChannelType, {
  name: string;
  logo: string;
  color: string;
  bgColor: string;
}> = {
  xianyu: {
    name: '闲鱼',
    logo: '/logos/xianyu.jpg',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  xiaohongshu: {
    name: '小红书',
    logo: '/logos/xiaohongshu.jpg',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  wechat: {
    name: '微信',
    logo: '/logos/wechat.jpg',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  douyin: {
    name: '抖音',
    logo: '/logos/douyin.jpg',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

// ============================================
// 工具函数
// ============================================
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getWeekday(dateStr: string): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return weekdays[new Date(dateStr).getDay()];
}

// ============================================
// 主组件
// ============================================
export default function ChannelQuota() {
  // 从全局状态获取选中的酒店
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  
  const selectedHotels = useMemo(() => {
    return hotels.filter(h => selectedHotelIds.includes(h.id));
  }, [hotels, selectedHotelIds]);

  // 当前选中的酒店（单酒店视图）
  const [currentHotelId, setCurrentHotelId] = useState<string | null>(null);
  
  // 月份切换
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 加载状态
  const [loading, setLoading] = useState(false);
  
  // 编辑状态
  const [editingCell, setEditingCell] = useState<{
    date: string;
    roomTypeId: string;
    channel: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  // 生成日期数组
  const dates = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return date.toISOString().split('T')[0];
    });
  }, [currentDate]);

  // 从 store 获取配额数据和操作
  const { 
    channelQuotas, 
    loadChannelQuotas,
    initializeHotelChannels,
    updateChannelQuota,
  } = useEnterpriseStore();

  // 加载配额数据 - 使用 store 中的方法
  useEffect(() => {
    if (selectedHotelIds.length === 0) return;
    
    const hotelId = currentHotelId || selectedHotelIds[0];
    if (!hotelId) return;

    // 初始化酒店渠道配置
    initializeHotelChannels(hotelId);

    setLoading(true);
    // 使用 store 中的方法加载90天配额
    loadChannelQuotas(hotelId, dates[0], 90).then(() => {
      setLoading(false);
    });
  }, [currentHotelId, selectedHotelIds, dates]);

  // 使用 store 中的配额数据
  const quotaData = useMemo(() => {
    const hotelId = currentHotelId || selectedHotelIds[0];
    if (!hotelId) return [];
    
    // 只返回当前月份的配额数据
    const hotelQuotas = channelQuotas[hotelId] || [];
    return hotelQuotas.filter(q => dates.includes(q.date));
  }, [channelQuotas, currentHotelId, selectedHotelIds, dates]);

  // 切换月份
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };

  // 获取指定日期的配额数据
  const getDailyQuota = (date: string) => {
    return quotaData.find(d => d.date === date)?.roomTypes || [];
  };

  // 处理配额修改 - 添加确认提示
  const handleQuotaChange = (date: string, roomTypeId: string, channel: string, newValue: number) => {
    const hotelId = currentHotelId || selectedHotelIds[0];
    if (!hotelId) return;
    
    // 获取渠道名称
    const channelConfig = CHANNEL_CONFIG[channel as ChannelType];
    const channelName = channelConfig?.name || channel;
    
    // 获取房型名称
    const dailyQuota = getDailyQuota(date);
    const roomType = dailyQuota.find(rt => rt.roomTypeId === roomTypeId);
    const roomTypeName = roomType?.roomTypeName || '未知房型';
    
    // 确认保存
    const confirmed = window.confirm(
      `确认修改配额？\n\n` +
      `日期：${date}\n` +
      `房型：${roomTypeName}\n` +
      `渠道：${channelName}\n` +
      `新配额：${newValue}\n\n` +
      `注：当前为演示模式，修改仅保存在本地。`
    );
    
    if (confirmed) {
      // 调用 store 的更新方法
      updateChannelQuota(hotelId, date, roomTypeId, channel, newValue);
    }
    setEditingCell(null);
  };

  // 统计信息（无条件执行，防止Hook顺序不一致）
  const stats = useMemo(() => {
    let totalPMSSlots = 0;
    let totalChannelAllocated = 0;
    let totalChannelSold = 0;
    
    quotaData.forEach(day => {
      day.roomTypes.forEach(rt => {
        totalPMSSlots += rt.pmsTotal;
        rt.channels.forEach(c => {
          totalChannelAllocated += c.allocated;
          totalChannelSold += c.sold;
        });
      });
    });
    
    return {
      totalPMSSlots,
      totalChannelAllocated,
      totalChannelSold,
      totalChannelRemaining: totalChannelAllocated - totalChannelSold,
      utilizationRate: totalChannelAllocated > 0 ? Math.round((totalChannelSold / totalChannelAllocated) * 100) : 0,
    };
  }, [quotaData]);

  // 空状态组件
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-gray-200">
      <Store className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择酒店</h3>
      <p className="text-sm text-gray-500 text-center max-w-md">
        请在顶部酒店选择器中至少选择一家酒店，查看和管理渠道库存配额
      </p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* 未选择酒店时只显示空状态 */}
      {selectedHotelIds.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* 批量操作提示 */}
          <BatchOperationBar />
      
      {/* 演示数据提示横幅 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-amber-900">演示数据模式</div>
            <p className="text-sm text-amber-800 mt-1">
              当前展示的是演示数据，尚未接入真实 PMS 系统。所有库存数据均为模拟生成，仅供功能演示使用。
              实际部署后将实时同步华美会 PMS 的真实库存数据。
            </p>
          </div>
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            DEMO
          </span>
        </div>
      </div>

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-violet-600" />
            渠道库存配额
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              演示数据
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotelIds.length === 1 
              ? `${selectedHotels[0]?.name} - 分配私域渠道可售库存`
              : `已选择 ${selectedHotelIds.length} 家酒店 - 批量管理渠道配额`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* PMS链接 */}
          <a
            href="https://pms.huamei.com/inventory"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            在PMS中管理库存
          </a>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          title="PMS总库存"
          value={stats.totalPMSSlots}
          subtitle="本月总房晚"
          icon={Building2}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="渠道配额"
          value={stats.totalChannelAllocated}
          subtitle="已分配给渠道"
          icon={Package}
          color="bg-violet-100 text-violet-600"
        />
        <StatCard
          title="已售出"
          value={stats.totalChannelSold}
          subtitle="私域渠道销量"
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="剩余可售"
          value={stats.totalChannelRemaining}
          subtitle="渠道剩余库存"
          icon={Eye}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="配额利用率"
          value={`${stats.utilizationRate}%`}
          subtitle="渠道售罄进度"
          icon={RotateCcw}
          color="bg-cyan-100 text-cyan-600"
        />
      </div>

      {/* 酒店切换（多酒店时显示） */}
      {selectedHotels.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">切换酒店</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedHotels.map(hotel => (
              <button
                key={hotel.id}
                onClick={() => setCurrentHotelId(hotel.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  (currentHotelId || selectedHotels[0].id) === hotel.id
                    ? 'bg-violet-100 text-violet-700 border border-violet-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {hotel.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 月份切换 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-lg font-semibold">
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* 渠道图例 */}
        <div className="flex items-center gap-4">
          {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-8 h-5 flex items-center justify-center bg-white rounded overflow-hidden border border-gray-100">
                <img 
                  src={config.logo} 
                  alt={config.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm text-gray-600">{config.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 配额日历 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-10 h-10 border-3 border-violet-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 font-medium">正在加载配额数据...</p>
            <p className="text-sm text-gray-400 mt-2">请稍候，正在从服务器获取演示数据</p>
          </div>
        ) : quotaData.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4" />
            暂无配额数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 w-24">日期</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-500 w-32">房型</th>
                  <th className="px-2 py-3 text-center text-sm font-medium text-gray-500 w-20">总库存</th>
                  <th className="px-2 py-3 text-center text-sm font-medium text-gray-500 w-20">剩余</th>
                  {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
                    <th key={key} className="px-1 py-3 text-center text-sm font-medium text-gray-500 w-20">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-10 h-6 flex items-center justify-center bg-white rounded overflow-hidden">
                          <img 
                            src={config.logo} 
                            alt={config.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className={`text-xs ${config.color}`}>{config.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center text-sm font-medium text-gray-500 w-20">保留</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dates.map((date) => {
                  const dailyQuota = getDailyQuota(date);
                  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                  
                  return dailyQuota.map((rt) => (
                    <tr
                      key={`${date}-${rt.roomTypeId}`}
                      className={`hover:bg-gray-50 ${isWeekend ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-3 py-3 border-r border-gray-100 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          周{getWeekday(date)}
                          {isWeekend && <span className="ml-1 text-blue-600">(周末)</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rt.roomTypeName}</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="text-sm text-gray-900">{rt.pmsTotal}</div>
                        <div className="text-xs text-gray-400">已售{rt.pmsSold}</div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className={`text-sm font-bold ${rt.pmsAvailable < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                          {rt.pmsAvailable}
                        </div>
                      </td>
                      {rt.channels.map(channel => {
                        const isEditing = editingCell?.date === date && 
                                         editingCell?.roomTypeId === rt.roomTypeId &&
                                         editingCell?.channel === channel.channelId;
                        const config = CHANNEL_CONFIG[channel.channelId as ChannelType];
                        
                        // 如果渠道配置不存在，跳过渲染
                        if (!config) return null;
                        
                        return (
                          <td key={channel.channelId} className="px-2 py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-14 px-1 py-1 text-sm border border-violet-300 rounded text-center"
                                  autoFocus
                                  onBlur={() => handleQuotaChange(date, rt.roomTypeId, channel.channelId, parseInt(editValue) || 0)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleQuotaChange(date, rt.roomTypeId, channel.channelId, parseInt(editValue) || 0);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingCell({ date, roomTypeId: rt.roomTypeId, channel: channel.channelId });
                                  setEditValue(String(channel.allocated));
                                }}
                                className={`cursor-pointer p-2 rounded-lg ${config.bgColor} hover:opacity-80 transition-opacity`}
                              >
                                <div className={`text-sm font-bold text-center ${config.color}`}>
                                  {channel.allocated}
                                </div>
                                <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                                  <span>售{channel.sold}</span>
                                  <span className={channel.remaining < 3 ? 'text-red-500' : 'text-green-600'}>
                                    余{channel.remaining}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-center">
                        <div className="text-sm text-gray-900">{rt.reservedForPMS}</div>
                        <div className="text-xs text-gray-400">保留</div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-blue-900">使用说明</div>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• PMS总库存：从华美会PMS实时获取，此处只读不可修改（演示模式为模拟数据）</li>
              <li>• 渠道配额：可点击修改分配给各私域渠道的库存数量</li>
              <li>• PMS保留：未分配给渠道的库存，留给PMS直销和其他OTA渠道</li>
              <li>• 如需修改总库存或关房，请点击右上角「在PMS中管理库存」</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-blue-700">
                <span className="font-medium">数据状态：</span>
                当前为演示数据模式，所有数据均为模拟生成。实际部署后将接入华美会 PMS 系统获取真实库存数据。
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

// ============================================
// 统计卡片组件
// ============================================
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Package;
  color: string;
}) {
  const [bgColor, textColor] = color.split(' ');
  
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
      </div>
    </div>
  );
}
