/**
 * Shadow-Bees V52 - 库存与房态中心
 * 数据联动版本：与 store 中的 inventory 和 transactions 实时关联
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Bed, LayoutDashboard, Package, TrendingUp, Unlock,
  Store, Settings, AlertTriangle,
  Calendar, ArrowRightLeft,
  Lock, Zap
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { modeDetails } from '@/utils/helpers';
import { MonthlyInventoryCalendar } from '@/components/inventory';
import { PlatformLogo } from '@/components/PlatformLogo';
import { 
  getTodayOccupancyFromCalendar,
  calculateTodayPlatformSales,
  calculateTodayRoomTypeSales
} from '@/utils/inventoryHelpers';
import type { Platform } from '@/types';

// 平台配置
const platforms: { id: Platform; name: string; color: string }[] = [
  { id: 'xianyu', name: '闲鱼', color: '#FFDA44' },
  { id: 'xiaohongshu', name: '小红书', color: '#FF2442' },
  { id: 'wechat', name: '微信', color: '#07C160' },
];

// 房号状态
type RoomStatus = 'clean' | 'dirty' | 'maintenance';
type SaleStatus = 'available' | 'reserved' | 'sold';

interface RoomUnit {
  id: string;
  status: RoomStatus;
  saleStatus: SaleStatus;
  platform?: Platform;
  guestName?: string;
}

export default function InventoryAndRoomStatus() {
  const { 
    currentHotel, 
    currentRoomType,
    currentMode,
    inventory,
    transactions,
    alerts,
    switchRoomType,
    updateFlexibleAllocation,
    removeAlert,
    transferInventory
  } = useUnifiedStore();
  
  const [activeView, setActiveView] = useState<'overview' | 'detail' | 'calendar'>('overview');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  // 按房型存储投放量设置
  const [allocationInputs, setAllocationInputs] = useState<Record<string, number>>(() => {
    const inputs: Record<string, number> = {};
    currentHotel.roomTypes.forEach(room => {
      inputs[room.id] = inventory.byRoomType[room.id]?.maxAllocation || room.flexibleAllocation;
    });
    return inputs;
  });

  // 计算当前投放状态和调拨可行性（基于库存日历）
  const allocationStatus = useMemo(() => {
    const totalMaxAllocation = currentHotel.roomTypes.reduce(
      (sum, room) => sum + (inventory.byRoomType[room.id]?.maxAllocation || room.flexibleAllocation),
      0
    );
    const totalFlexibleAllocation = currentHotel.roomTypes.reduce(
      (sum, room) => sum + room.flexibleAllocation,
      0
    );
    
    // 从日历获取今日实际可用库存
    const today = new Date().toISOString().split('T')[0];
    const todayInv = inventory.calendar?.[today];
    
    // 计算今日灵活池和OTA池的实际可用
    let flexibleAvailable = 0;
    let otaAvailable = 0;
    let flexibleTotal = 0;
    let otaTotal = 0;
    
    if (todayInv) {
      Object.entries(todayInv.byRoomType).forEach(([roomTypeId, roomInv]) => {
        const room = currentHotel.roomTypes.find(r => r.id === roomTypeId);
        if (room) {
          flexibleAvailable += Math.min(roomInv.channelAllocation.flexible, roomInv.available);
          otaAvailable += Math.min(roomInv.channelAllocation.ota, roomInv.available);
          flexibleTotal += roomInv.channelAllocation.flexible;
          otaTotal += roomInv.channelAllocation.ota;
        }
      });
    } else {
      // 回退到库存池数据
      flexibleAvailable = inventory.flexiblePool.available;
      otaAvailable = inventory.otaPool.available;
      flexibleTotal = inventory.flexiblePool.total;
      otaTotal = inventory.otaPool.total;
    }
    
    const flexibleSoldRate = flexibleTotal > 0 ? ((flexibleTotal - flexibleAvailable) / flexibleTotal) * 100 : 0;
    
    // 调拨条件：灵活池紧张(<=1间可用) 且 OTA有可售(>0)
    const flexibleIsTight = flexibleAvailable <= 1;
    const hasOTAInventory = otaAvailable > 0;
    const canTransferFromOTA = flexibleIsTight && hasOTAInventory;
    
    return {
      current: totalMaxAllocation,
      max: totalFlexibleAllocation,
      isFull: totalMaxAllocation >= totalFlexibleAllocation,
      canIncrease: totalFlexibleAllocation - totalMaxAllocation,
      flexibleSoldRate,
      canTransferFromOTA,
      otaAvailable,
      flexibleAvailable,
    };
  }, [currentHotel.roomTypes, inventory]);

  // ===== 计算真实统计数据（从库存日历 + 交易记录） =====
  
  // 从库存日历获取今日实际占用（包含跨天订单）
  const todayOccupancy = useMemo(() => {
    return getTodayOccupancyFromCalendar(inventory.calendar || null);
  }, [inventory.calendar]);
  
  // 计算各平台今日销量（从交易记录，统计今日入住的订单）
  const { platformSales, platformReserved } = useMemo(() => {
    // 平台销量仍从交易记录统计（日历不记录平台来源）
    const sales = calculateTodayPlatformSales(transactions, inventory.calendar || null);
    
    const reserved: Record<Platform, number> = {
      xianyu: 0,
      xiaohongshu: 0,
      wechat: 0,
    };
    
    // 统计预留（未来入住的已付款订单）
    const today = new Date().toISOString().split('T')[0];
    transactions.forEach(t => {
      const checkInDate = t.checkInDate || '';
      if (['paid', 'pending'].includes(t.status) && checkInDate > today) {
        const platform = t.platform as Platform;
        reserved[platform] = (reserved[platform] || 0) + 1;
      }
    });
    
    return { platformSales: sales, platformReserved: reserved };
  }, [transactions, inventory.calendar]);

  // 计算各房型今日占用（从库存日历，包含跨天订单）
  const { roomTypeSales, roomTypeReserved } = useMemo(() => {
    // 从日历获取今日实际占用
    const calendarSales = calculateTodayRoomTypeSales(
      inventory.calendar || null,
      currentHotel.roomTypes
    );
    
    // 转换为按房型名称的映射（保持与原逻辑兼容）
    const sales: Record<string, number> = {};
    const reserved: Record<string, number> = {};
    
    currentHotel.roomTypes.forEach(room => {
      const calendarData = calendarSales[room.id];
      if (calendarData) {
        sales[room.name] = calendarData.occupied;
      }
    });
    
    // 统计预留（未来入住的已付款订单）
    const today = new Date().toISOString().split('T')[0];
    transactions.forEach(t => {
      const checkInDate = t.checkInDate || '';
      if (['paid', 'pending'].includes(t.status) && checkInDate > today) {
        reserved[t.roomType] = (reserved[t.roomType] || 0) + 1;
      }
    });
    
    return { roomTypeSales: sales, roomTypeReserved: reserved };
  }, [transactions, inventory.calendar, currentHotel.roomTypes]);

  // ===== 全酒店总览数据（从库存日历实时计算） =====
  const totalOverview = useMemo(() => {
    // 从日历获取今日实际占用（包含跨天订单）
    const today = new Date().toISOString().split('T')[0];
    const todayInv = inventory.calendar?.[today];
    
    // 今日实际占用（从日历）
    const totalSold = todayOccupancy.totalOccupied;  // 今日实际被占用的房间数
    const totalReserved = Object.values(platformReserved).reduce((a, b) => a + b, 0); // 未来预留
    
    const totalRooms = inventory.total;
    const totalAvailable = todayInv?.summary.totalAvailable || inventory.total - totalSold;
    
    // 分配 OTA 和灵活库存（基于日历数据）
    const otaTotal = inventory.otaPool.total;
    const flexibleTotal = inventory.flexiblePool.total;
    const maxAllocation = inventory.flexiblePool.maxAllocation;
    
    // 从日历计算 OTA 和灵活池的占用
    let otaSold = 0;
    let flexibleSold = 0;
    
    if (todayInv) {
      Object.entries(todayInv.byRoomType).forEach(([roomTypeId, roomInv]) => {
        const room = currentHotel.roomTypes.find(r => r.id === roomTypeId);
        if (room) {
          const occupied = roomInv.occupied.checkedIn + roomInv.occupied.arriving;
          // 按比例分配：OTAAllocation / totalInventory
          const otaRatio = room.otaAllocation / room.totalInventory;
          otaSold += Math.round(occupied * otaRatio);
          flexibleSold += occupied - Math.round(occupied * otaRatio);
        }
      });
    }
    
    // 预留按比例分配
    const otaRatio = otaTotal / totalRooms;
    const otaReserved = Math.min(Math.round(totalReserved * otaRatio), otaTotal);
    const otaAvailable = otaTotal - otaSold - otaReserved;
    
    const flexibleReserved = Math.min(totalReserved - otaReserved, maxAllocation);
    const flexibleAvailable = Math.min(maxAllocation - flexibleSold - flexibleReserved, flexibleTotal - flexibleSold - flexibleReserved);
    
    return {
      totalRooms,
      totalSold,
      totalReserved,
      totalAvailable,
      otaTotal,
      otaSold,
      otaReserved,
      otaAvailable,
      flexibleTotal,
      maxAllocation,
      flexibleSold,
      flexibleReserved,
      flexibleAvailable,
    };
  }, [inventory, todayOccupancy, platformReserved, currentHotel.roomTypes]);

  // ===== 各房型统计（关联真实销量和预留） =====
  const roomTypeStats = useMemo(() => {
    return currentHotel.roomTypes.map(room => {
      const roomInv = inventory.byRoomType[room.id];
      // 从交易数据获取已售和预留
      const actualSold = roomTypeSales[room.name] || 0;
      const actualReserved = roomTypeReserved[room.name] || 0;
      const totalOccupied = actualSold + actualReserved;
      
      // 从库存数据获取非标渠道投放和已售
      const maxAllocation = roomInv?.maxAllocation || room.flexibleAllocation;
      const flexibleSold = roomInv?.flexibleSold || 0;
      
      const soldRate = room.totalInventory > 0 ? (actualSold / room.totalInventory) * 100 : 0;
      
      return {
        ...room,
        total: room.totalInventory,
        sold: actualSold,
        reserved: actualReserved,
        available: room.totalInventory - totalOccupied,
        maxAllocation,
        flexibleSold,
        flexibleAvailable: maxAllocation - flexibleSold,
        soldRate,
      };
    });
  }, [currentHotel.roomTypes, inventory.byRoomType, roomTypeSales, roomTypeReserved]);

  // ===== 当前房型详细数据 =====
  const currentRoomStats = useMemo(() => {
    if (!currentRoomType) return null;
    
    const roomInv = inventory.byRoomType[currentRoomType.id];
    
    // 从交易数据获取真实已售和预留
    const actualSold = roomTypeSales[currentRoomType.name] || 0;
    const actualReserved = roomTypeReserved[currentRoomType.name] || 0;
    const totalOccupied = actualSold + actualReserved;
    
    const roomTotal = currentRoomType.totalInventory;
    const roomAvailable = roomTotal - totalOccupied;
    
    // OTA和灵活库存分配
    const otaTotal = currentRoomType.otaAllocation;
    const flexibleTotal = currentRoomType.flexibleAllocation;
    
    // 获取该房型的非标渠道投放上限
    const maxAllocation = roomInv?.maxAllocation || flexibleTotal;
    const flexibleSold = roomInv?.flexibleSold || 0;
    const flexibleReserved = Math.min(actualReserved, maxAllocation - flexibleSold);
    const flexibleAvailable = maxAllocation - flexibleSold - flexibleReserved;
    
    // OTA部分正常计算
    const totalPool = otaTotal + flexibleTotal;
    const otaRatio = otaTotal / totalPool;
    
    const otaSold = Math.min(Math.round(actualSold * otaRatio), otaTotal);
    const otaReserved = Math.min(Math.round(actualReserved * otaRatio), otaTotal - otaSold);
    const otaAvailable = otaTotal - otaSold - otaReserved;
    
    return {
      roomTotal,
      roomSold: actualSold,
      roomReserved: actualReserved,
      roomAvailable,
      otaTotal,
      otaSold,
      otaReserved,
      otaAvailable,
      flexibleTotal,
      maxAllocation,
      flexibleSold,
      flexibleReserved,
      flexibleAvailable,
    };
  }, [currentRoomType, inventory.byRoomType, roomTypeSales, roomTypeReserved]);

  // ===== 生成房号数据（基于真实库存状态） =====
  const roomData: RoomUnit[] = useMemo(() => {
    if (!currentRoomType || !currentRoomStats) return [];
    
    const rooms: RoomUnit[] = [];
    const { roomTotal, roomSold, roomReserved } = currentRoomStats;
    
    // 获取该房型的交易记录（用于确定房间状态）
    const roomTransactions = transactions.filter(t => t.roomType === currentRoomType.name);
    
    // 按平台分组交易
    const platformTxnCount: Record<Platform, number> = { xianyu: 0, xiaohongshu: 0, wechat: 0 };
    roomTransactions.forEach(t => {
      if (platformTxnCount[t.platform] !== undefined) {
        platformTxnCount[t.platform]++;
      }
    });
    
    let soldCount = 0;
    let reservedCount = 0;
    
    for (let i = 1; i <= roomTotal; i++) {
      const floor = Math.floor((i - 1) / 10) + 1;
      const roomNum = ((i - 1) % 10) + 1;
      
      // 确定房间销售状态
      let saleStatus: SaleStatus = 'available';
      let platform: Platform | undefined;
      
      // 前 N 间标记为已售
      if (soldCount < roomSold) {
        saleStatus = 'sold';
        soldCount++;
        
        // 从交易记录找平台（按平台顺序分配）
        for (const p of platforms) {
          if (platformTxnCount[p.id] > 0) {
            platform = p.id;
            platformTxnCount[p.id]--;
            break;
          }
        }
        // 如果交易记录用完了，按比例分配
        if (!platform) {
          platform = platforms[soldCount % 3].id;
        }
      } 
      // 接下来 N 间标记为预留
      else if (reservedCount < roomReserved) {
        saleStatus = 'reserved';
        reservedCount++;
        // 预留房间也分配平台
        platform = platforms[reservedCount % 3].id;
      }
      
      // 从库存日历获取房间状态（维修/清洁）
      const today = new Date().toISOString().split('T')[0];
      const todayInv = inventory.calendar?.[today];
      const roomTypeInv = todayInv?.byRoomType[currentRoomType.id];
      // 如果该房型有维修房间，按比例分配维修状态（简化处理）
      const maintenanceCount = roomTypeInv?.occupied?.maintenance || 0;
      const isMaintenance = maintenanceCount > 0 && i <= maintenanceCount;
      
      rooms.push({
        id: `${floor * 100 + roomNum}`,
        status: isMaintenance ? 'maintenance' : 'clean',
        saleStatus,
        platform,
      });
    }
    
    return rooms;
  }, [currentRoomType, currentRoomStats, transactions]);

  // ===== 平台统计（关联真实交易和库存） =====
  const platformStats = useMemo(() => {
    const flexibleAvailable = currentRoomStats?.flexibleAvailable || 0;
    const totalPlatformSold = platforms.reduce((sum, p) => sum + platformSales[p.id].sold, 0);
    
    return platforms.map(p => {
      const sales = platformSales[p.id];
      const reserved = platformReserved[p.id];
      
      // 可分配 = 灵活库存按销量比例分配
      const allocationRatio = totalPlatformSold > 0 ? sales.sold / totalPlatformSold : 1/3;
      const available = Math.max(0, Math.floor(flexibleAvailable * allocationRatio));
      
      return {
        ...p,
        sold: sales.sold,
        reserved,
        available,
        revenue: sales.revenue,
      };
    });
  }, [platformSales, platformReserved, currentRoomStats]);

  // 计算入住率
  const occupancyRate = totalOverview.totalRooms > 0 
    ? Math.round((totalOverview.totalSold / totalOverview.totalRooms) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">库存与房态中心</h1>
          <p className="text-sm text-text-secondary mt-1">
            当前模式：{modeDetails[currentMode].label} · {modeDetails[currentMode].description}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 从OTA调拨按钮 */}
          <button
            onClick={() => {
              if (!allocationStatus.canTransferFromOTA) return;
              currentHotel.roomTypes.forEach(room => {
                const roomInv = inventory.byRoomType[room.id];
                if (roomInv && roomInv.otaAvailable >= 3 && roomInv.flexibleAvailable <= 1) {
                  transferInventory('ota', 'flexible', 3, room.id);
                }
              });
            }}
            disabled={!allocationStatus.canTransferFromOTA}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
              allocationStatus.canTransferFromOTA
                ? 'bg-neon-amber/10 border-neon-amber/30 text-neon-amber hover:bg-neon-amber/20 animate-pulse'
                : 'bg-bg-tertiary border-border-color text-text-secondary cursor-not-allowed'
            }`}
          >
            <TrendingUp size={14} />
            从OTA调拨
            {allocationStatus.canTransferFromOTA && <span className="font-bold">+3</span>}
          </button>
          
          {/* 调整投放按钮 */}
          <button
            onClick={() => setShowAllocationModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30 text-xs text-neon-cyan hover:bg-neon-cyan/20 transition-all"
          >
            <Settings size={14} />
            调整投放
          </button>
          
          {/* 实时数据指示 */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-green/10 rounded-lg border border-neon-green/30">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
            <span className="text-xs text-neon-green">实时</span>
          </div>
        </div>
      </div>

      {/* 视图切换 - 移到标题下方 */}
      <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-1 border border-border-color w-fit">
        <button
          onClick={() => setActiveView('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
            activeView === 'overview'
              ? 'bg-neon-cyan/20 text-neon-cyan'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <LayoutDashboard size={16} />
          总览
        </button>
        <button
          onClick={() => setActiveView('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
            activeView === 'calendar'
              ? 'bg-neon-purple/20 text-neon-purple'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar size={16} />
          库存日历
        </button>
        <button
          onClick={() => setActiveView('detail')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
            activeView === 'detail'
              ? 'bg-neon-cyan/20 text-neon-cyan'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Bed size={16} />
          房态明细
        </button>
      </div>

      {/* 库存提示 */}
      {alerts.filter(a => a.type === 'inventory' && a.requiresAction).map(alert => (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neon-amber/10 border border-neon-amber rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-neon-amber" size={24} />
            <div>
              <div className="font-medium text-neon-amber">库存调整建议</div>
              <div className="text-sm text-text-secondary">{alert.message}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // 从OTA调拨：解析提示中的房型名称，为每个房型调拨3间
                const roomNames = alert.message.split('的非标渠道')[0].split('、');
                roomNames.forEach(name => {
                  const room = currentHotel.roomTypes.find(r => r.name === name.trim());
                  if (room) {
                    transferInventory('ota', 'flexible', 3, room.id);
                  }
                });
                removeAlert(alert.id);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/20 transition-all"
            >
              <ArrowRightLeft size={16} />
              从OTA调拨
            </button>
            <button
              onClick={() => {
                // 打开投放设置弹窗
                setShowAllocationModal(true);
                removeAlert(alert.id);
              }}
              className="px-4 py-2 bg-neon-amber text-bg-primary rounded-lg text-sm font-medium hover:opacity-90 transition-all"
            >
              调整投放
            </button>
            <button
              onClick={() => removeAlert(alert.id)}
              className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              忽略
            </button>
          </div>
        </motion.div>
      ))}

      {/* ===== 总览视图 ===== */}
      {activeView === 'overview' && (
        <>
          {/* 实时大盘 - 4指标 */}
          <div className="grid grid-cols-4 gap-4">
            {/* 总库存 */}
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">全店总库存</span>
                <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                  <Package size={16} className="text-neon-cyan" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono">{totalOverview.totalRooms}<span className="text-sm font-normal text-text-secondary">间</span></div>
              <div className="text-xs text-text-secondary mt-1">
                OTA {totalOverview.otaTotal} + 灵活 {totalOverview.flexibleTotal}
              </div>
            </div>

            {/* 今日已售 */}
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">今日已售</span>
                <div className="w-8 h-8 rounded-lg bg-neon-green/20 flex items-center justify-center">
                  <TrendingUp size={16} className="text-neon-green" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-neon-green">{totalOverview.totalSold}<span className="text-sm font-normal text-text-secondary">间</span></div>
              <div className="text-xs text-text-secondary mt-1">
                入住率 {occupancyRate}%
              </div>
            </div>

            {/* 预留中 */}
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">预留中</span>
                <div className="w-8 h-8 rounded-lg bg-neon-amber/20 flex items-center justify-center">
                  <Unlock size={16} className="text-neon-amber" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-neon-amber">{totalOverview.totalReserved}<span className="text-sm font-normal text-text-secondary">间</span></div>
              <div className="text-xs text-text-secondary mt-1">
                未来已付款订单
              </div>
            </div>

            {/* 可售余量 - 带健康度指示 */}
            <div className={`bg-bg-secondary rounded-xl border p-4 ${
              totalOverview.totalAvailable < 10 ? 'border-neon-red/50 bg-neon-red/5' : 
              totalOverview.totalAvailable < 30 ? 'border-neon-amber/50 bg-neon-amber/5' : 
              'border-border-color'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">可售余量</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  totalOverview.totalAvailable < 10 ? 'bg-neon-red/20' : 
                  totalOverview.totalAvailable < 30 ? 'bg-neon-amber/20' : 
                  'bg-neon-green/20'
                }`}>
                  <Store size={16} className={
                    totalOverview.totalAvailable < 10 ? 'text-neon-red' : 
                    totalOverview.totalAvailable < 30 ? 'text-neon-amber' : 
                    'text-neon-green'
                  } />
                </div>
              </div>
              <div className={`text-2xl font-bold font-mono ${
                totalOverview.totalAvailable < 10 ? 'text-neon-red' : 
                totalOverview.totalAvailable < 30 ? 'text-neon-amber' : 
                'text-neon-green'
              }`}>
                {totalOverview.totalAvailable}<span className="text-sm font-normal text-text-secondary">间</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-text-secondary">
                  OTA {totalOverview.otaAvailable} + 灵活 {totalOverview.flexibleAvailable}
                </span>
                {totalOverview.totalAvailable < 10 && (
                  <span className="text-xs text-neon-red font-medium">紧张⚠️</span>
                )}
              </div>
            </div>
          </div>

          {/* 非标渠道投放概览 - 简化版 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Store size={20} className="text-blue-400" />
                </div>
                <div>
                  <div className="font-medium">非标渠道投放</div>
                  <div className="text-xs text-text-secondary">
                    总计 {currentHotel.roomTypes.reduce((sum, room) => sum + (inventory.byRoomType[room.id]?.maxAllocation || 0), 0)} 间 / 
                    灵活库存 {totalOverview.flexibleTotal} 间
                  </div>
                </div>
              </div>
              {/* 整体投放进度条 */}
              <div className="w-48">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-secondary">投放率</span>
                  <span className="text-blue-400 font-mono">
                    {Math.round((currentHotel.roomTypes.reduce((sum, room) => sum + (inventory.byRoomType[room.id]?.maxAllocation || 0), 0) / totalOverview.flexibleTotal) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: `${Math.min((currentHotel.roomTypes.reduce((sum, room) => sum + (inventory.byRoomType[room.id]?.maxAllocation || 0), 0) / totalOverview.flexibleTotal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* 按房型横向展示 */}
            <div className="grid grid-cols-3 gap-3">
              {currentHotel.roomTypes.map(room => {
                const roomInv = inventory.byRoomType[room.id];
                const maxAlloc = roomInv?.maxAllocation || room.flexibleAllocation;
                const sold = roomInv?.flexibleSold || 0;
                const remaining = maxAlloc - sold;
                const rate = maxAlloc > 0 ? (sold / maxAlloc) * 100 : 0;
                
                return (
                  <div key={room.id} className="p-3 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{room.name}</span>
                      <span className={`text-xs ${rate > 80 ? 'text-neon-red' : rate > 50 ? 'text-neon-amber' : 'text-neon-green'}`}>
                        {rate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          rate > 80 ? 'bg-neon-red' : rate > 50 ? 'bg-neon-amber' : 'bg-neon-green'
                        }`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">投 {maxAlloc}间</span>
                      <span className="text-neon-red">售 {sold}间</span>
                      <span className="text-neon-green">剩 {remaining}间</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 各房型库存分布 - 优化版 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">各房型库存分布</h3>
              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-neon-green" />可售</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-neon-amber" />预留</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-neon-red" />已售</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {roomTypeStats.map((room) => {
                const roomInv = inventory.byRoomType[room.id];
                const canTransferFromOTA = roomInv && roomInv.otaAvailable >= 3 && roomInv.flexibleAvailable <= 1;
                const soldPercent = (room.sold / room.total) * 100;
                const reservedPercent = (room.reserved / room.total) * 100;
                
                return (
                  <div key={room.id} className="p-3 bg-bg-tertiary rounded-lg hover:bg-bg-tertiary/80 transition-all">
                    {/* 第一行：房型名 + 调拨按钮 + 查看 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{room.name}</span>
                        <span className="text-xs text-text-secondary">
                          ¥{room.floorPrice}-{room.ceilingPrice}
                        </span>
                        {/* OTA/非标分配 */}
                        <span className="text-xs text-text-secondary">
                          OTA {roomInv?.otaAllocation || room.otaAllocation} / 非标 {roomInv?.maxAllocation || room.flexibleAllocation}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {canTransferFromOTA && (
                          <button
                            onClick={() => transferInventory('ota', 'flexible', 3, room.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-neon-amber/10 border border-neon-amber/30 rounded text-xs text-neon-amber hover:bg-neon-amber/20 transition-all animate-pulse"
                            title="从OTA调3间"
                          >
                            <TrendingUp size={12} />
                            OTA→非标
                          </button>
                        )}
                        <button
                          onClick={() => {
                            switchRoomType(room.id);
                            setActiveView('detail');
                          }}
                          className="px-2 py-1 text-xs bg-bg-secondary border border-border-color rounded hover:border-neon-cyan hover:text-neon-cyan transition-all"
                        >
                          明细 →
                        </button>
                      </div>
                    </div>
                    
                    {/* 第二行：分段进度条 + 数字 */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-bg-primary rounded-full overflow-hidden flex">
                        <div className="h-full bg-neon-red" style={{ width: `${soldPercent}%` }} />
                        <div className="h-full bg-neon-amber" style={{ width: `${reservedPercent}%` }} />
                        <div className="h-full bg-neon-green" style={{ width: `${100 - soldPercent - reservedPercent}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-xs min-w-fit">
                        <span className="text-neon-red font-mono">{room.sold}</span>
                        <span className="text-neon-amber font-mono">{room.reserved}</span>
                        <span className="text-neon-green font-mono">{room.available}</span>
                        <span className="text-text-secondary font-mono">/ {room.total}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 非标渠道销售分布 */}
          <div className="grid grid-cols-3 gap-4">
            {platformStats.map((platform) => (
              <div key={platform.id} className="bg-bg-secondary rounded-xl border border-border-color p-5">
                <div className="flex items-center gap-3 mb-4">
                  <PlatformLogo platform={platform.id} size={48} />
                  <div>
                    <div className="font-semibold">{platform.name}</div>
                    <div className="text-xs text-text-secondary">累计成交 ¥{platform.revenue.toLocaleString()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-bg-tertiary rounded p-2">
                    <div className="text-lg font-mono" style={{ color: platform.color }}>{platform.sold}</div>
                    <div className="text-xs text-text-secondary">已成交</div>
                  </div>
                  <div className="bg-bg-tertiary rounded p-2">
                    <div className="text-lg font-mono text-neon-amber">{platform.reserved}</div>
                    <div className="text-xs text-text-secondary">预留中</div>
                  </div>
                  <div className="bg-bg-tertiary rounded p-2">
                    <div className="text-lg font-mono text-neon-green">{platform.available}</div>
                    <div className="text-xs text-text-secondary">可分配</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </>
      )}

      {/* ===== 库存日历视图 ===== */}
      {activeView === 'calendar' && (
        <MonthlyInventoryCalendar />
      )}

      {/* ===== 明细视图 ===== */}
      {activeView === 'detail' && currentRoomStats && (
        <>
          {/* 房型切换 */}
          <div className="flex items-center gap-2 bg-bg-secondary rounded-lg p-1 border border-border-color w-fit">
            <Bed size={16} className="text-text-secondary ml-2" />
            {currentHotel.roomTypes.map((room) => (
              <button
                key={room.id}
                onClick={() => switchRoomType(room.id)}
                className={`px-4 py-2 rounded-md text-sm transition-all ${
                  room.id === currentRoomType?.id
                    ? 'bg-neon-cyan/20 text-neon-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>

          {/* 当前房型库存概览 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="text-sm text-text-secondary mb-2">{currentRoomType?.name} 总库存</div>
              <div className="text-3xl font-bold font-mono">{currentRoomStats.roomTotal}间</div>
              <div className="text-xs text-text-secondary mt-1">
                OTA {currentRoomStats.otaTotal}间 + 灵活 {currentRoomStats.flexibleTotal}间
              </div>
            </div>
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="text-sm text-text-secondary mb-2">已售</div>
              <div className="text-3xl font-bold font-mono text-neon-red">{currentRoomStats.roomSold}间</div>
              <div className="text-xs text-text-secondary mt-1">
                已入住/完成
              </div>
            </div>
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="text-sm text-text-secondary mb-2">预留</div>
              <div className="text-3xl font-bold font-mono text-neon-amber">{currentRoomStats.roomReserved}间</div>
              <div className="text-xs text-text-secondary mt-1">
                已付款待入住
              </div>
            </div>
            <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
              <div className="text-sm text-text-secondary mb-2">可售</div>
              <div className="text-3xl font-bold font-mono text-neon-green">{currentRoomStats.roomAvailable}间</div>
              <div className="text-xs text-text-secondary mt-1">
                灵活剩{currentRoomStats.flexibleAvailable}间
              </div>
            </div>
          </div>

          {/* 渠道池可视化 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <h2 className="text-lg font-semibold mb-2">{currentRoomType?.name} 渠道池分布</h2>
            <p className="text-xs text-text-secondary mb-4">
              灵活库存可在闲鱼/小红书/微信间动态调配
            </p>
            
            <div className="grid grid-cols-2 gap-8">
              {/* OTA渠道池 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-neon-cyan" />
                    <span className="font-medium">OTA渠道池（携程/美团等）</span>
                  </div>
                  <span className="text-text-secondary">{currentRoomStats.otaTotal}间</span>
                </div>
                <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentRoomStats.otaSold / currentRoomStats.otaTotal) * 100}%` }}
                    className="h-full bg-neon-red transition-all duration-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentRoomStats.otaReserved / currentRoomStats.otaTotal) * 100}%` }}
                    className="h-full bg-neon-amber transition-all duration-500"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">已售: {currentRoomStats.otaSold}</span>
                  <span className="text-neon-amber">预留: {currentRoomStats.otaReserved}</span>
                  <span className="text-neon-green">可售: {currentRoomStats.otaAvailable}</span>
                </div>
                <div className="text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs ${
                    currentRoomStats.otaSold >= currentRoomStats.otaTotal 
                      ? 'bg-neon-red/20 text-neon-red' 
                      : 'bg-neon-green/20 text-neon-green'
                  }`}>
                    {currentRoomStats.otaSold >= currentRoomStats.otaTotal ? (
                      <span className="flex items-center gap-1">
                        <Lock size={12} />
                        已关房
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Zap size={12} />
                        热销中
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* 灵活库存池 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-neon-red" />
                    <span className="font-medium">非标渠道投放</span>
                  </div>
                  <div className="text-right">
                    <span className="text-neon-cyan font-mono">{currentRoomStats.maxAllocation}间</span>
                    <span className="text-text-secondary text-xs ml-1">/ 灵活总量{currentRoomStats.flexibleTotal}间</span>
                  </div>
                </div>
                <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentRoomStats.flexibleSold / currentRoomStats.maxAllocation) * 100}%` }}
                    className="h-full bg-neon-red transition-all duration-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentRoomStats.flexibleReserved / currentRoomStats.maxAllocation) * 100}%` }}
                    className="h-full bg-neon-amber transition-all duration-500"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">已售: {currentRoomStats.flexibleSold}</span>
                  <span className="text-neon-amber">预留: {currentRoomStats.flexibleReserved}</span>
                  <span className="text-neon-green font-medium">
                    可售: {currentRoomStats.flexibleAvailable}间
                  </span>
                </div>
                
                {/* 各平台分配（基于真实销量和预留） */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {platforms.map(p => {
                    const sold = platformSales[p.id]?.sold || 0;
                    const reserved = platformReserved[p.id] || 0;
                    return (
                      <div key={p.id} className="p-2 bg-bg-tertiary rounded-lg text-center">
                        <div className="mx-auto mb-1.5 flex justify-center">
                          <PlatformLogo platform={p.id} size={20} />
                        </div>
                        <div className="text-xs text-text-secondary mb-0.5">{p.name}</div>
                        <div className="text-sm font-mono">
                          <span className="text-neon-red">{sold}</span>
                          <span className="text-text-secondary">/</span>
                          <span className="text-neon-amber">{reserved}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 房态明细 */}
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">房态明细</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">筛选平台:</span>
                <select 
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value as any)}
                  className="px-3 py-1 bg-bg-tertiary rounded text-sm"
                >
                  <option value="all">全部</option>
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 房态图例 */}
            <div className="flex gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-neon-green" />可售</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-neon-amber" />预留</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-neon-red" />已售</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-text-muted" />维修</span>
            </div>

            {/* 房号网格 */}
            <div className="grid grid-cols-10 gap-2">
              {roomData
                .filter(r => selectedPlatform === 'all' || r.platform === selectedPlatform)
                .map((room) => {
                  const getStatusColor = () => {
                    if (room.status === 'maintenance') return 'bg-text-muted';
                    if (room.saleStatus === 'sold') return 'bg-neon-red';
                    if (room.saleStatus === 'reserved') return 'bg-neon-amber';
                    return 'bg-neon-green';
                  };
                  
                  const getChannelIcon = () => {
                    if (!room.platform) return null;
                    const p = platforms.find(x => x.id === room.platform);
                    if (!p) return null;
                    return <PlatformLogo platform={p.id} size={14} className="rounded-sm mt-1" />;
                  };

                  return (
                    <div
                      key={room.id}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${getStatusColor()} ${
                        room.saleStatus === 'available' ? 'cursor-pointer hover:opacity-80' : ''
                      } transition-all`}
                      title={`房号${room.id} - ${room.saleStatus}${room.platform ? ` - ${room.platform}` : ''}`}
                    >
                      <span className="font-mono text-text-primary">{room.id}</span>
                      {getChannelIcon()}
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      {/* 渠道配额设置模态框 */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-secondary rounded-xl border border-border-color p-6 w-full max-w-lg"
          >
            <h3 className="text-lg font-semibold mb-4">非标渠道投放设置（按房型）</h3>
            
            <div className="space-y-4">
              {/* 按房型三行设置 */}
              {currentHotel.roomTypes.map(room => {
                const roomInv = inventory.byRoomType[room.id];
                const maxAllocation = roomInv?.maxAllocation || room.flexibleAllocation;
                const flexibleSold = roomInv?.flexibleSold || 0;
                const flexibleAllocation = room.flexibleAllocation;
                
                return (
                  <div key={room.id} className="p-4 bg-bg-tertiary rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{room.name}</span>
                      <span className="text-xs text-text-secondary">
                        已售 {flexibleSold} 间
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <input
                          type="range"
                          min={0}
                          max={flexibleAllocation}
                          value={allocationInputs[room.id] || maxAllocation}
                          onChange={(e) => {
                            setAllocationInputs(prev => ({
                              ...prev,
                              [room.id]: Number(e.target.value)
                            }));
                          }}
                          className="w-full mb-1"
                        />
                        <div className="flex justify-between text-xs text-text-secondary">
                          <span>0</span>
                          <span className="text-neon-cyan">{allocationInputs[room.id] || maxAllocation}间</span>
                          <span>{flexibleAllocation}间</span>
                        </div>
                      </div>
                      
                      <div className="w-20">
                        <input
                          type="number"
                          min={0}
                          max={flexibleAllocation}
                          value={allocationInputs[room.id] || maxAllocation}
                          onChange={(e) => {
                            const val = Math.min(Number(e.target.value), flexibleAllocation);
                            setAllocationInputs(prev => ({
                              ...prev,
                              [room.id]: val
                            }));
                          }}
                          className="w-full px-2 py-1.5 bg-bg-primary border border-border-color rounded text-center font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* 进度条显示 */}
                    <div className="mt-2 h-1.5 bg-bg-primary rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-neon-red"
                        style={{ width: `${(flexibleSold / flexibleAllocation) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-neon-cyan"
                        style={{ width: `${(((allocationInputs[room.id] || maxAllocation) - flexibleSold) / flexibleAllocation) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="text-xs text-text-secondary">
                <p>说明：</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>可按房型分别设置非标渠道（闲鱼/小红书/微信）的投放上限</li>
                  <li>红色=已售，青色=投放额度，灰色=未投放</li>
                  <li>若某房型销售达到上限但仍有库存，系统会提示补货</li>
                  <li>建议根据营销能力和库存压力动态调整</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  // 按房型分别保存投放量
                  currentHotel.roomTypes.forEach(room => {
                    const newAllocation = allocationInputs[room.id];
                    if (newAllocation !== undefined) {
                      updateFlexibleAllocation(room.id, newAllocation);
                    }
                  });
                  setShowAllocationModal(false);
                }}
                className="flex-1 py-2 bg-neon-cyan text-bg-primary rounded-lg font-medium hover:opacity-90 transition-all"
              >
                保存设置
              </button>
              <button
                onClick={() => {
                  // 重置为当前值
                  const resetInputs: Record<string, number> = {};
                  currentHotel.roomTypes.forEach(room => {
                    resetInputs[room.id] = inventory.byRoomType[room.id]?.maxAllocation || room.flexibleAllocation;
                  });
                  setAllocationInputs(resetInputs);
                  setShowAllocationModal(false);
                }}
                className="flex-1 py-2 bg-bg-tertiary border border-border-color rounded-lg hover:border-neon-cyan transition-all"
              >
                取消
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
