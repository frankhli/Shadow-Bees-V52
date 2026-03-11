/**
 * 批量操作提示条
 * 
 * 显示当前选中的酒店，提示数据筛选范围
 */

import { useEnterpriseStore } from '../stores/enterpriseStore';
import { Layers, X, Building2 } from 'lucide-react';

export function BatchOperationBar() {
  const { selectedHotelIds, hotels, clearSelection } = useEnterpriseStore();
  
  // 只选中1家或没有选中时不显示
  if (selectedHotelIds.length <= 1) return null;
  
  const selectedHotelNames = hotels
    .filter(h => selectedHotelIds.includes(h.id))
    .slice(0, 3)
    .map(h => h.name);
  
  const moreCount = selectedHotelIds.length - selectedHotelNames.length;
  
  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              已选择 {selectedHotelIds.length} 家酒店 · 数据已按选中酒店筛选
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />
              {selectedHotelNames.join('、')}
              {moreCount > 0 && ` 等${moreCount}家`}
            </div>
          </div>
        </div>
        
        <button
          onClick={clearSelection}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          清空选择
        </button>
      </div>
    </div>
  );
}
