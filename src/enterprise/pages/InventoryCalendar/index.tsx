/**
 * 库存日历页面
 * 
 * 功能：
 * 1. 日历视图查看各房型库存
 * 2. 直接修改库存数量
 * 3. 关房/开房操作
 * 4. 库存预警提示
 */

import { useState, useEffect, useMemo } from 'react';

import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Lock,
  Unlock,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { inventoryApi, hotelApi } from '../../api';
import type { Hotel, RoomType, InventoryData } from '../../api/types';

// 添加这个类型定义


export default function InventoryCalendar() {
  const { hotels, selectedHotelIds, selectHotel } = useEnterpriseStore();
  
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingCell, setEditingCell] = useState<{ roomTypeId: string; date: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterRoomType, setFilterRoomType] = useState<string>('all');
  
  // 获取当前月份的天数
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentDate]);
  
  // 生成日期数组
  const dates = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        date: date.toISOString().split('T')[0],
        day: i + 1,
        weekday: date.getDay(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      };
    });
  }, [currentDate, daysInMonth]);
  
  // 初始化加载
  useEffect(() => {
    if (hotels.length === 0) {
      useEnterpriseStore.getState().loadHotels();
    }
  }, [hotels.length]);
  
  // 加载酒店详情和库存
  useEffect(() => {
    const loadData = async () => {
      const hotelId = selectedHotelIds[0] || hotels[0]?.id;
      if (!hotelId) return;
      
      setLoading(true);
      try {
        // 加载酒店详情（包含房型）
        const hotelRes = await hotelApi.getHotelDetail(hotelId);
        if (hotelRes.success) {
          setSelectedHotel(hotelRes.data);
          setRoomTypes(hotelRes.data.roomTypes);
        }
        
        // 加载库存数据
        const startDate = dates[0]?.date;
        if (startDate) {
          const invRes = await inventoryApi.getHotelInventory(hotelId, startDate, daysInMonth);
          if (invRes.success) {
            setInventory(invRes.data);
          }
        }
      } catch (error) {
        console.error('加载库存数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [selectedHotelIds, hotels, dates[0]?.date, daysInMonth]);
  
  // 切换月份
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };
  
  // 获取库存单元格数据
  const getInventoryCell = (roomTypeId: string, date: string): InventoryData | undefined => {
    return inventory.find(i => i.roomTypeId === roomTypeId && i.date === date);
  };
  
  // 开始编辑
  const startEdit = (roomTypeId: string, date: string, currentValue: number) => {
    setEditingCell({ roomTypeId, date });
    setEditValue(String(currentValue));
  };
  
  // 保存编辑
  const saveEdit = async () => {
    if (!editingCell || !selectedHotel) return;
    
    const value = parseInt(editValue, 10);
    if (isNaN(value) || value < 0) {
      alert('请输入有效的库存数量');
      return;
    }
    
    setSaving(true);
    try {
      const res = await inventoryApi.updateInventory({
        hotelId: selectedHotel.id,
        roomTypeId: editingCell.roomTypeId,
        date: editingCell.date,
        availableRooms: value,
      });
      
      if (res.success) {
        // 更新本地数据
        setInventory(prev => prev.map(i => 
          i.roomTypeId === editingCell.roomTypeId && i.date === editingCell.date
            ? { ...i, available: value, blocked: i.total - i.sold - value }
            : i
        ));
        setEditingCell(null);
      } else {
        alert(res.message || '更新失败');
      }
    } catch (error) {
      console.error('保存库存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };
  
  // 关房/开房
  const toggleRoomStatus = async (roomTypeId: string, date: string, currentStatus: string) => {
    if (!selectedHotel) return;
    
    setSaving(true);
    try {
      if (currentStatus === 'close') {
        // 开房
        await inventoryApi.openRoom(selectedHotel.id, roomTypeId, date);
      } else {
        // 关房
        await inventoryApi.closeRoom(selectedHotel.id, roomTypeId, date, '手动关房');
      }
      
      // 刷新数据
      const startDate = dates[0]?.date;
      const invRes = await inventoryApi.getHotelInventory(selectedHotel.id, startDate, daysInMonth);
      if (invRes.success) {
        setInventory(invRes.data);
      }
    } catch (error) {
      console.error('切换房态失败:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // 快速调整
  const quickAdjust = async (roomTypeId: string, date: string, delta: number) => {
    if (!selectedHotel) return;
    
    const cell = getInventoryCell(roomTypeId, date);
    if (!cell) return;
    
    const newValue = Math.max(0, cell.available + delta);
    
    setSaving(true);
    try {
      const res = await inventoryApi.updateInventory({
        hotelId: selectedHotel.id,
        roomTypeId,
        date,
        availableRooms: newValue,
      });
      
      if (res.success) {
        setInventory(prev => prev.map(i => 
          i.roomTypeId === roomTypeId && i.date === date
            ? { ...i, available: newValue, blocked: i.total - i.sold - newValue }
            : i
        ));
      }
    } catch (error) {
      console.error('调整库存失败:', error);
    } finally {
      setSaving(false);
    }
  };
  
  // 筛选房型
  const filteredRoomTypes = (() => {
    if (filterRoomType === 'all') return roomTypes;
    return roomTypes.filter((rt: RoomType) => rt.id === filterRoomType);
  })();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">库存日历</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotel?.name || '请选择酒店'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* 酒店选择 */}
          <select
            value={selectedHotel?.id || ''}
            onChange={(e) => selectHotel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            {hotels.map(hotel => (
              <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
            ))}
          </select>
          
          {/* 房型筛选 */}
          <select
            value={filterRoomType}
            onChange={(e) => setFilterRoomType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="all">全部房型</option>
            {roomTypes.map(rt => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>
          
          {/* 月份导航 */}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-sm font-medium min-w-[120px] text-center">
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* 日历表格 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-48 sticky left-0 bg-gray-50 z-10">
                  房型 / 日期
                </th>
                {dates.map(d => (
                  <th
                    key={d.date}
                    className={`px-2 py-3 text-center text-xs font-medium min-w-[60px] ${
                      d.isWeekend ? 'bg-orange-50 text-orange-700' : 'text-gray-600'
                    }`}
                  >
                    <div>{d.day}</div>
                    <div className="text-[10px] opacity-70">
                      {['日', '一', '二', '三', '四', '五', '六'][d.weekday]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRoomTypes.map((roomType: RoomType) => (
                <tr key={roomType.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-200">
                    <div className="font-medium text-sm text-gray-900">{roomType.name}</div>
                    <div className="text-xs text-gray-500">
                      共{roomType.roomCount}间 | ¥{roomType.basePrice}起
                    </div>
                  </td>
                  {dates.map(d => {
                    const cell = getInventoryCell(roomType.id, d.date);
                    const isEditing = editingCell?.roomTypeId === roomType.id && editingCell?.date === d.date;
                    const isLowInventory = cell && cell.available <= 5 && cell.available > 0;
                    const isSoldOut = cell?.status === 'close' || cell?.available === 0;
                    
                    return (
                      <td
                        key={`${roomType.id}-${d.date}`}
                        className={`px-1 py-2 text-center ${
                          d.isWeekend ? 'bg-orange-50/30' : ''
                        } ${isSoldOut ? 'bg-red-50' : ''} ${isLowInventory ? 'bg-yellow-50' : ''}`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              className="w-12 px-1 py-1 text-center text-xs border border-violet-500 rounded focus:outline-none focus:ring-2 focus:ring-violet-200"
                              autoFocus
                              disabled={saving}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => cell && startEdit(roomType.id, d.date, cell.available)}
                            className="cursor-pointer group relative"
                          >
                            <div className={`text-sm font-medium ${
                              isSoldOut ? 'text-red-600' : isLowInventory ? 'text-yellow-700' : 'text-gray-700'
                            }`}>
                              {cell?.available ?? '-'}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              售{cell?.sold ?? 0}
                            </div>
                            
                            {/* 悬浮操作按钮 */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:flex items-center gap-1 bg-white shadow-lg rounded-lg p-1 z-20">
                              <button
                                onClick={(e) => { e.stopPropagation(); quickAdjust(roomType.id, d.date, -1); }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); quickAdjust(roomType.id, d.date, 1); }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleRoomStatus(roomType.id, d.date, cell?.status || 'open'); }}
                                className={`p-1 rounded ${cell?.status === 'close' ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
                              >
                                {cell?.status === 'close' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 图例说明 */}
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
          <span>周末</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            库存紧张 (≤5间)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-red-600" />
            已关房/满房
          </span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-gray-400" />
          <span>点击数字直接编辑</span>
        </div>
      </div>
      
      {/* 数据汇总 */}
      <div className="grid grid-cols-4 gap-4">
        {filteredRoomTypes.map((rt: RoomType) => {
          const rtInventory = inventory.filter(i => i.roomTypeId === rt.id);
          const totalAvailable = rtInventory.reduce((sum, i) => sum + i.available, 0);
          const totalSold = rtInventory.reduce((sum, i) => sum + i.sold, 0);
          const lowStockDays = rtInventory.filter(i => i.available <= 5 && i.available > 0).length;
          const closedDays = rtInventory.filter(i => i.status === 'close').length;
          
          return (
            <div key={rt.id} className="bg-white p-4 rounded-xl border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">{rt.name}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">剩余库存</div>
                  <div className="text-lg font-semibold text-violet-600">{totalAvailable}</div>
                </div>
                <div>
                  <div className="text-gray-500">已售房间</div>
                  <div className="text-lg font-semibold text-green-600">{totalSold}</div>
                </div>
                <div>
                  <div className="text-gray-500">紧张天数</div>
                  <div className={`text-lg font-semibold ${lowStockDays > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {lowStockDays}天
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">关房天数</div>
                  <div className={`text-lg font-semibold ${closedDays > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {closedDays}天
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
