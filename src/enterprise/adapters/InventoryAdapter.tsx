/**
 * 库存日历适配器
 * 将酒店端的库存管理适配到企业版的酒店操作台
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft,
  ChevronRight,
  Bed,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  Lock,
  Unlock,
} from 'lucide-react';
import { useEnterpriseStore, type EnterpriseHotel } from '../stores/enterpriseStore';

interface InventoryAdapterProps {
  hotelId: string;
  readOnly?: boolean;
  onInventoryUpdate?: (roomTypeId: string, date: string, count: number) => void;
}

export function InventoryAdapter({ hotelId, readOnly = false, onInventoryUpdate }: InventoryAdapterProps) {
  const { getHotelById } = useEnterpriseStore();
  const [hotel, setHotel] = useState<EnterpriseHotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('standard');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingCell, setEditingCell] = useState<{date: string, value: number} | null>(null);

  useEffect(() => {
    const hotelData = getHotelById(hotelId);
    if (hotelData) {
      setHotel(hotelData);
    }
    setLoading(false);
  }, [hotelId, getHotelById]);

  // 生成日历数据
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days = [];
    // 填充月初空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  // 模拟库存数据
  const getInventoryForDate = (day: number) => {
    const date = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const baseInventory = selectedRoomType === 'standard' ? 20 : selectedRoomType === 'deluxe' ? 15 : 5;
    const randomBooked = Math.floor(Math.random() * baseInventory * 0.6);
    const randomMaintenance = Math.random() > 0.8 ? 1 : 0;
    
    return {
      date,
      total: baseInventory,
      available: baseInventory - randomBooked - randomMaintenance,
      booked: randomBooked,
      maintenance: randomMaintenance,
      price: selectedRoomType === 'standard' ? 380 : selectedRoomType === 'deluxe' ? 520 : 880,
      isClosed: false,
    };
  };

  const roomTypes = [
    { id: 'standard', name: '标准大床房', total: 20 },
    { id: 'deluxe', name: '豪华双床房', total: 15 },
    { id: 'suite', name: '行政套房', total: 5 },
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const calendarDays = generateCalendarDays();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        未找到酒店数据
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 房型选择 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">选择房型:</span>
          <div className="flex gap-2">
            {roomTypes.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomType(room.id)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedRoomType === room.id
                    ? 'border-violet-600 bg-violet-50 text-violet-700'
                    : 'border-gray-200 hover:border-violet-300'
                }`}
              >
                <div className="text-sm font-medium">{room.name}</div>
                <div className="text-xs text-gray-500">共{room.total}间</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 日历控件 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 日历头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              今天
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 星期标题 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div key={day} className="px-2 py-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* 日历格子 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-[100px] border-b border-r border-gray-100" />;
            }

            const inventory = getInventoryForDate(day);
            const isLow = inventory.available <= 3;
            const isFull = inventory.available === 0;

            return (
              <div
                key={day}
                className={`min-h-[100px] p-2 border-b border-r border-gray-200 ${
                  isFull ? 'bg-red-50' : isLow ? 'bg-amber-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                  {inventory.maintenance > 0 && (
                    <span className="text-xs text-orange-600">维{inventory.maintenance}</span>
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className={`text-lg font-semibold ${
                    isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'
                  }`}>
                    {inventory.available}
                    <span className="text-xs font-normal text-gray-400 ml-1">可售</span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    已订: {inventory.booked}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-violet-600">
                      ¥{inventory.price}
                    </span>
                    
                    {!readOnly && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingCell({ date: inventory.date, value: inventory.available })}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Bed className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
          <span className="text-gray-600">满房</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-50 border border-amber-200 rounded" />
          <span className="text-gray-600">紧张(≤3间)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-200 rounded" />
          <span className="text-gray-600">充足</span>
        </div>
      </div>

      {/* 快捷操作 */}
      {!readOnly && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-medium text-gray-900 mb-4">批量操作</h4>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
              <Lock className="w-4 h-4 inline mr-1" />
              批量关房
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
              <Unlock className="w-4 h-4 inline mr-1" />
              批量开房
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
              <Plus className="w-4 h-4 inline mr-1" />
              增加配额
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
              <Minus className="w-4 h-4 inline mr-1" />
              减少配额
            </button>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingCell && !readOnly && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditingCell(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-xl p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-semibold text-gray-900 mb-4">调整库存</h4>
            <p className="text-sm text-gray-500 mb-4">
              日期: {editingCell.date}
            </p>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setEditingCell({ ...editingCell, value: Math.max(0, editingCell.value - 1) })}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={editingCell.value}
                onChange={(e) => setEditingCell({ ...editingCell, value: Number(e.target.value) })}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-center"
              />
              <button
                onClick={() => setEditingCell({ ...editingCell, value: editingCell.value + 1 })}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingCell(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onInventoryUpdate?.(selectedRoomType, editingCell.date, editingCell.value);
                  setEditingCell(null);
                }}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                确认
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default InventoryAdapter;
