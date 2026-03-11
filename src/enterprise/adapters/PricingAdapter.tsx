/**
 * 定价决策适配器
 * 将酒店端的 PricingDecision 适配到企业版的酒店操作台
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  Sparkles,
  Target
} from 'lucide-react';
import { useEnterpriseStore, type EnterpriseHotel } from '../stores/enterpriseStore';

interface RoomTypePricing {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  floorPrice: number;
  ceilingPrice: number;
  aiSuggestion?: number;
  change?: number;
  changePercent?: number;
}

interface PricingAdapterProps {
  hotelId: string;
  readOnly?: boolean;
  onPriceUpdate?: (roomTypeId: string, newPrice: number) => void;
}

export function PricingAdapter({ hotelId, readOnly = false, onPriceUpdate }: PricingAdapterProps) {
  const { getHotelById } = useEnterpriseStore();
  const [hotel, setHotel] = useState<EnterpriseHotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [editingPrice, setEditingPrice] = useState<number | null>(null);

  useEffect(() => {
    const hotelData = getHotelById(hotelId);
    if (hotelData) {
      setHotel(hotelData);
    }
    setLoading(false);
  }, [hotelId, getHotelById]);

  const roomTypes: RoomTypePricing[] = [
    { id: 'standard', name: '标准大床房', basePrice: 380, currentPrice: 420, floorPrice: 320, ceilingPrice: 580, aiSuggestion: 450, change: 30, changePercent: 7.1 },
    { id: 'deluxe', name: '豪华双床房', basePrice: 480, currentPrice: 520, floorPrice: 420, ceilingPrice: 680, aiSuggestion: 550, change: 30, changePercent: 5.8 },
    { id: 'suite', name: '行政套房', basePrice: 880, currentPrice: 920, floorPrice: 780, ceilingPrice: 1280, aiSuggestion: 980, change: 60, changePercent: 6.5 },
  ];

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
      {/* AI定价建议卡片 */}
      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl p-6 border border-violet-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI定价建议</h3>
            <p className="text-gray-600 mb-4">
              基于竞品分析、历史数据和当前市场情况，AI建议对以下房型进行价格调整：
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="px-3 py-1.5 bg-white rounded-lg border border-violet-200 text-sm">
                <span className="text-gray-500">标准大床房:</span>
                <span className="ml-2 font-medium text-violet-700">¥380 → ¥450 (+18%)</span>
              </div>
              <div className="px-3 py-1.5 bg-white rounded-lg border border-violet-200 text-sm">
                <span className="text-gray-500">豪华双床房:</span>
                <span className="ml-2 font-medium text-violet-700">¥480 → ¥550 (+15%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 房型定价表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">房型定价管理</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">房型</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">底价</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">当前价格</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">AI建议</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">天花价</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {roomTypes.map((room) => (
              <tr key={room.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{room.name}</div>
                </td>
                <td className="px-6 py-4 text-right text-gray-500">¥{room.floorPrice}</td>
                <td className="px-6 py-4 text-right">
                  <div className="font-medium text-gray-900">¥{room.currentPrice}</div>
                  {room.change !== 0 && (
                    <div className={`text-xs ${room.change! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {room.change! > 0 ? '+' : ''}{room.changePercent}%
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-medium text-violet-700">¥{room.aiSuggestion}</span>
                    <button
                      onClick={() => onPriceUpdate?.(room.id, room.aiSuggestion!)}
                      disabled={readOnly}
                      className="px-2 py-1 text-xs bg-violet-100 text-violet-700 rounded hover:bg-violet-200 disabled:opacity-50"
                    >
                      应用
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-gray-500">¥{room.ceilingPrice}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => setSelectedRoomType(selectedRoomType === room.id ? '' : room.id)}
                    disabled={readOnly}
                    className="text-violet-600 hover:text-violet-700 text-sm disabled:opacity-50"
                  >
                    编辑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 快捷调价 */}
      {selectedRoomType && !readOnly && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h4 className="font-medium text-gray-900 mb-4">快捷调价</h4>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEditingPrice((roomTypes.find(r => r.id === selectedRoomType)?.currentPrice || 0) * 0.9)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <TrendingDown className="w-4 h-4 inline mr-1" />
              -10%
            </button>
            <button
              onClick={() => setEditingPrice((roomTypes.find(r => r.id === selectedRoomType)?.currentPrice || 0) * 1.1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              +10%
            </button>
            <input
              type="number"
              value={editingPrice || ''}
              onChange={(e) => setEditingPrice(Number(e.target.value))}
              placeholder="输入新价格"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
            />
            <button
              onClick={() => {
                if (editingPrice) {
                  onPriceUpdate?.(selectedRoomType, editingPrice);
                  setSelectedRoomType('');
                  setEditingPrice(null);
                }
              }}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              <CheckCircle className="w-4 h-4 inline mr-1" />
              确认
            </button>
          </div>
        </motion.div>
      )}

      {/* 定价策略 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-600" />
          定价策略
        </h4>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: '动态定价', desc: '根据市场需求自动调整', active: true },
            { name: '尾货清仓', desc: '临近日期低价出售', active: false },
            { name: '溢价策略', desc: '高需求时期提价', active: false },
          ].map((strategy) => (
            <div
              key={strategy.name}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                strategy.active 
                  ? 'border-violet-600 bg-violet-50' 
                  : 'border-gray-200 hover:border-violet-300'
              }`}
            >
              <div className="font-medium text-gray-900">{strategy.name}</div>
              <div className="text-sm text-gray-500 mt-1">{strategy.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PricingAdapter;
