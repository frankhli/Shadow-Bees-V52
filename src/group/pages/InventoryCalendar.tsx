/**
 * 集团端 - 库存日历
 * 功能：集团房态总览、库存预警、房型供需分析
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Percent,
  AlertOctagon,
  BarChart3,
  Filter,
  Download,
  Eye,
  Clock,
} from 'lucide-react';
import { useGroupStore } from '../stores/groupStore';

// ==================== 类型定义 ====================

interface DailyInventory {
  date: string;
  totalRooms: number;
  occupied: number;
  available: number;
  maintenance: number;
  occupancyRate: number;
  status: 'soldout' | 'tight' | 'normal' | 'abundant';
  byHotel: {
    hotelId: string;
    hotelName: string;
    total: number;
    occupied: number;
    available: number;
  }[];
}

interface InventoryAlert {
  id: string;
  type: 'soldout' | 'low' | 'maintenance';
  hotelName: string;
  date: string;
  roomType?: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

// ==================== 组件 ====================

function StatCard({ title, value, subtext, change, icon: Icon, color }: {
  title: string;
  value: string;
  subtext: string;
  change?: number;
  icon: any;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-5 rounded-xl bg-surface border border-border-color"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-text-muted mt-1">{subtext}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
              {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(change)}% 环比</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: DailyInventory['status'] }) {
  const config = {
    soldout: { label: '满房', color: 'text-neon-red', bg: 'bg-neon-red/10' },
    tight: { label: '紧张', color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
    normal: { label: '正常', color: 'text-neon-blue', bg: 'bg-neon-blue/10' },
    abundant: { label: '充足', color: 'text-neon-green', bg: 'bg-neon-green/10' },
  };

  const { label, color, bg } = config[status];

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${bg} ${color}`}>
      {label}
    </span>
  );
}

function CalendarCell({ data, isSelected, onClick }: {
  data: DailyInventory;
  isSelected: boolean;
  onClick: () => void;
}) {
  const day = new Date(data.date).getDate();
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][new Date(data.date).getDay()];
  const isWeekend = weekDay === '六' || weekDay === '日';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-all ${
        isSelected
          ? 'border-neon-purple bg-neon-purple/5'
          : 'border-border-color bg-surface hover:border-neon-purple/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-bold ${isWeekend ? 'text-neon-red' : ''}`}>{day}</span>
        <span className="text-xs text-text-muted">{weekDay}</span>
      </div>
      <StatusBadge status={data.status} />
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">入住</span>
          <span className="font-medium">{data.occupied}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">剩余</span>
          <span className={`font-medium ${data.available < 10 ? 'text-neon-red' : ''}`}>
            {data.available}
          </span>
        </div>
        <div className="h-1 bg-surface-hover rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full bg-neon-purple"
            style={{ width: `${data.occupancyRate}%` }}
          />
        </div>
      </div>
    </motion.button>
  );
}

function AlertCard({ alert }: { alert: InventoryAlert }) {
  const iconConfig = {
    soldout: { icon: AlertOctagon, color: 'text-neon-red', bg: 'bg-neon-red/10' },
    low: { icon: AlertTriangle, color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
    maintenance: { icon: Clock, color: 'text-neon-blue', bg: 'bg-neon-blue/10' },
  };

  const config = iconConfig[alert.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-lg bg-surface border border-border-color hover:border-neon-purple/30 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{alert.hotelName}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              alert.severity === 'high' ? 'bg-neon-red/10 text-neon-red' :
              alert.severity === 'medium' ? 'bg-neon-amber/10 text-neon-amber' :
              'bg-neon-blue/10 text-neon-blue'
            }`}>
              {alert.severity === 'high' ? '高' : alert.severity === 'medium' ? '中' : '低'}
            </span>
          </div>
          <p className="text-sm text-text-secondary">{alert.message}</p>
          <p className="text-xs text-text-muted mt-1">{alert.date}</p>
        </div>
      </div>
    </motion.div>
  );
}

function RoomTypeChart({ data }: { data: DailyInventory['byHotel'] }) {
  return (
    <div className="space-y-3">
      {data.map((hotel) => {
        const occupancyRate = Math.round((hotel.occupied / hotel.total) * 100);
        return (
          <div key={hotel.hotelId}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{hotel.hotelName}</span>
              <span className="text-xs text-text-muted">
                {hotel.occupied}/{hotel.total} ({occupancyRate}%)
              </span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${occupancyRate}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${
                  occupancyRate > 90 ? 'bg-neon-red' :
                  occupancyRate > 70 ? 'bg-neon-amber' :
                  'bg-neon-green'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== 主页面 ====================

export default function InventoryCalendar() {
  const { hotels, inventoryCalendar } = useGroupStore();
  const [selectedHotelId, setSelectedHotelId] = useState<string>(hotels[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(inventoryCalendar.dailyInventory[0]?.date || '');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showAlerts, setShowAlerts] = useState(true);

  // 使用 store 中的真实库存数据
  const dailyInventory = inventoryCalendar.dailyInventory;
  const inventoryAlerts = inventoryCalendar.inventoryAlerts;
  
  // 获取选中酒店的数据
  const selectedHotelData = hotels.find(h => h.id === selectedHotelId);
  const currentDayData = dailyInventory.find(d => d.date === selectedDate);

  // 统计计算
  const stats = useMemo(() => {
    if (!selectedHotelData) return null;
    const today = new Date().toISOString().split('T')[0];
    const todayData = dailyInventory.find((d) => d.date === today);
    
    const avgOccupancy = Math.round(
      dailyInventory.reduce((sum, d) => sum + d.occupancyRate, 0) / dailyInventory.length
    );

    const soldOutDays = dailyInventory.filter((d) => d.status === 'soldout').length;
    const tightDays = dailyInventory.filter((d) => d.status === 'tight').length;

    return {
      todayOccupancy: todayData?.occupancyRate || 0,
      todayAvailable: todayData?.available || 0,
      avgOccupancy,
      soldOutDays,
      tightDays,
    };
  }, [selectedHotelData, dailyInventory]);

  // 获取未来7天数据用于趋势图
  const trendData = dailyInventory.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-neon-purple" />
            库存日历
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            集团房态总览 · 库存预警 · 房型供需分析
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('筛选库存数据\n\n筛选条件：\n- 门店\n- 日期范围\n- 库存状态（满房/紧张/正常/充足）\n- 房型')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-color text-sm hover:bg-surface-hover"
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
          <button 
            onClick={() => alert('导出库存日历\n\n导出内容：\n- 30天房态数据\n- 各门店库存情况\n- 预警记录\n\n格式：Excel/PDF')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border-color text-sm hover:bg-surface-hover"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </motion.div>

      {/* 门店选择器 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {hotels.map((hotel) => (
          <button
            key={hotel.id}
            onClick={() => setSelectedHotelId(hotel.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedHotelId === hotel.id
                ? 'bg-neon-purple text-white'
                : 'bg-surface border border-border-color text-text-secondary hover:text-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">{hotel.name}</span>
          </button>
        ))}
      </div>

      {/* 核心统计 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="今日入住率"
            value={`${stats.todayOccupancy}%`}
            subtext="当前实时数据"
            icon={Percent}
            color="#A855F7"
          />
          <StatCard
            title="今日剩余房"
            value={`${stats.todayAvailable}间`}
            subtext="可售库存"
            icon={BedDouble}
            color="#00E396"
          />
          <StatCard
            title="30天满房天数"
            value={`${stats.soldOutDays}天`}
            subtext={`紧张${stats.tightDays}天`}
            icon={AlertOctagon}
            color="#FF4444"
          />
          <StatCard
            title="30天平均入住率"
            value={`${stats.avgOccupancy}%`}
            subtext="预测趋势"
            change={5.2}
            icon={BarChart3}
            color="#FFB800"
          />
        </div>
      )}

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：日历 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 视图切换 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-surface rounded-lg border border-border-color">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'calendar' ? 'bg-neon-purple text-white' : 'text-text-secondary'
                }`}
              >
                日历视图
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-neon-purple text-white' : 'text-text-secondary'
                }`}
              >
                列表视图
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <button 
                onClick={() => alert('切换到上月\n\n当前显示：2026年2月\n点击后显示：2026年1月')}
                className="p-1 rounded hover:bg-surface-hover"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium">2026年2月</span>
              <button 
                onClick={() => alert('切换到下月\n\n当前显示：2026年2月\n点击后显示：2026年3月')}
                className="p-1 rounded hover:bg-surface-hover"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 日历网格 */}
          {viewMode === 'calendar' && dailyInventory.length > 0 && (
            <div className="grid grid-cols-7 gap-2">
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <div key={day} className="text-center text-xs text-text-muted py-2">
                  {day}
                </div>
              ))}
              {dailyInventory.map((day) => (
                <CalendarCell
                  key={day.date}
                  data={day}
                  isSelected={selectedDate === day.date}
                  onClick={() => setSelectedDate(day.date)}
                />
              ))}
            </div>
          )}

          {/* 列表视图 */}
          {viewMode === 'list' && dailyInventory.length > 0 && (
            <div className="rounded-xl bg-surface border border-border-color overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-hover">
                  <tr>
                    <th className="px-4 py-3 text-left text-text-secondary font-medium">日期</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">状态</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">总房</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">入住</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">剩余</th>
                    <th className="px-4 py-3 text-center text-text-secondary font-medium">入住率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {dailyInventory.map((day) => (
                    <tr
                      key={day.date}
                      className={`hover:bg-surface-hover/50 cursor-pointer ${
                        selectedDate === day.date ? 'bg-neon-purple/5' : ''
                      }`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <td className="px-4 py-3">{day.date}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={day.status} />
                      </td>
                      <td className="px-4 py-3 text-center">{day.totalRooms}</td>
                      <td className="px-4 py-3 text-center">{day.occupied}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={day.available < 10 ? 'text-neon-red font-medium' : ''}>
                          {day.available}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{day.occupancyRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 右侧：详情面板 */}
        <div className="space-y-4">
          {/* 选中日期详情 */}
          {currentDayData && (
            <div className="p-5 rounded-xl bg-surface border border-border-color">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-neon-purple" />
                {currentDayData.date} 详情
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface-hover text-center">
                    <p className="text-2xl font-bold">{currentDayData.occupancyRate}%</p>
                    <p className="text-xs text-text-muted">入住率</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-hover text-center">
                    <p className="text-2xl font-bold">{currentDayData.available}</p>
                    <p className="text-xs text-text-muted">剩余房</p>
                  </div>
                </div>
                <RoomTypeChart data={currentDayData.byHotel} />
              </div>
            </div>
          )}

          {/* 库存预警 */}
          <div className={`p-5 rounded-xl bg-surface border border-border-color ${showAlerts ? '' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-neon-amber" />
                库存预警
                <span className="px-2 py-0.5 text-xs bg-neon-amber/10 text-neon-amber rounded-full">
                  {inventoryAlerts.length}
                </span>
              </h3>
              <button
                onClick={() => setShowAlerts(false)}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                收起
              </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {inventoryAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>

          {/* 7天趋势图 */}
          <div className="p-5 rounded-xl bg-surface border border-border-color">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neon-purple" />
              未来7天趋势
            </h3>
            <div className="space-y-2">
              {trendData.map((day, idx) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-16">{day.date.slice(5)}</span>
                  <div className="flex-1 h-6 bg-surface-hover rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${day.occupancyRate}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                      className={`h-full rounded-full ${
                        day.occupancyRate > 90 ? 'bg-neon-red' :
                        day.occupancyRate > 70 ? 'bg-neon-amber' :
                        'bg-neon-green'
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{day.occupancyRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
