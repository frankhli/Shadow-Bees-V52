/**
 * 酒店选择器 - 高级版（支持1000+酒店）
 * 
 * 核心特性：
 * 1. 虚拟滚动 - 流畅浏览海量数据
 * 2. 拼音搜索 - 支持拼音首字母搜索
 * 3. 快捷筛选标签 - 一键筛选常用条件
 * 4. 分组批量选择 - 按区域/城市/星级批量选择
 * 5. 搜索历史 - 保存常用搜索
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Search, Filter, X, CheckSquare, Square, Building2, MapPin, Star,
  History, Users, ChevronDown, Tag, Check, Trash2
} from 'lucide-react';
import { useEnterpriseStore, type EnterpriseHotel } from '../stores/enterpriseStore';

// ==================== 拼音转换工具 ====================

/**
 * 获取汉字首字母（简化版）
 * 实际项目中可以使用 pinyin 库
 */
function getFirstLetter(str: string): string {
  const char = str.charAt(0);
  // 简单匹配常见城市首字母
  const cityMap: Record<string, string> = {
    '北': 'b', '上': 's', '广': 'g', '深': 's', '成': 'c', '杭': 'h',
    '武': 'w', '西': 'x', '南': 'n', '重': 'c', '天': 't', '苏': 's',
    '郑': 'z', '长': 'c', '青': 'q', '昆': 'k', '大': 'd', '厦': 'x',
    '福': 'f', '合': 'h', '石': 's', '济': 'j', '哈': 'h', '沈': 's',
    '华': 'h', '珠': 'z', '东': 'd', '海': 'h', '宁': 'n'
  };
  return cityMap[char] || char.toLowerCase();
}

/**
 * 检查是否匹配拼音搜索
 */
function matchesPinyin(hotel: EnterpriseHotel, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // 直接匹配名称
  if (hotel.name?.toLowerCase().includes(lowerQuery)) return true;
  if (hotel.city?.toLowerCase().includes(lowerQuery)) return true;
  if (hotel.region?.toLowerCase().includes(lowerQuery)) return true;
  
  // 拼音首字母匹配（简化实现）
  const firstLetters = hotel.name?.split('').map(getFirstLetter).join('') || '';
  if (firstLetters.includes(lowerQuery)) return true;
  
  const cityFirstLetter = hotel.city ? getFirstLetter(hotel.city) : '';
  if (cityFirstLetter === lowerQuery.charAt(0)) return true;
  
  return false;
}

// ==================== 组件接口 ====================

interface HotelSelectorAdvancedProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  multiSelect?: boolean;
  maxSelection?: number;
  className?: string;
}

// 快捷筛选配置
interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter: (hotel: EnterpriseHotel) => boolean;
}

// 搜索历史项
interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

// ==================== 主组件 ====================

export function HotelSelectorAdvanced({
  selectedIds = [],
  onChange,
  multiSelect = true,
  maxSelection,
  className = ''
}: HotelSelectorAdvancedProps) {
  const { hotels } = useEnterpriseStore();
  const listRef = useRef<List>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    regions: [] as string[],
    cities: [] as string[],
    starRatings: [] as number[],
    status: [] as string[]
  });
  
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
    const saved = localStorage.getItem('sb_hotel_search_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  // ==================== 快捷筛选配置 ====================
  
  const quickFilters: QuickFilter[] = useMemo(() => [
    {
      id: 'online',
      label: '在线酒店',
      icon: <div className="w-2 h-2 rounded-full bg-green-500" />,
      filter: (h) => h.realtimeStatus === 'online' || h.status === 'active'
    },
    {
      id: 'five_star',
      label: '五星级',
      icon: <Star className="w-3 h-3 text-amber-500 fill-current" />,
      filter: (h) => h.starRating === 5
    },
    {
      id: 'huabei',
      label: '华北区',
      icon: <MapPin className="w-3 h-3 text-blue-500" />,
      filter: (h) => h.region === '华北' || h.city?.includes('北京') || h.city?.includes('天津')
    },
    {
      id: 'huadong',
      label: '华东区',
      icon: <MapPin className="w-3 h-3 text-violet-500" />,
      filter: (h) => h.region === '华东' || ['上海', '杭州', '南京', '苏州'].includes(h.city || '')
    },
    {
      id: 'huanan',
      label: '华南区',
      icon: <MapPin className="w-3 h-3 text-orange-500" />,
      filter: (h) => h.region === '华南' || ['广州', '深圳', '厦门', '珠海'].includes(h.city || '')
    },
  ], []);
  
  // ==================== 分组数据 ====================
  
  const { regions, cities, starRatings } = useMemo(() => {
    const regionSet = new Set<string>();
    const citySet = new Set<string>();
    const starSet = new Set<number>();
    
    hotels.forEach(h => {
      if (h.region) regionSet.add(h.region);
      if (h.city) citySet.add(h.city);
      if (h.starRating) starSet.add(h.starRating);
    });
    
    return {
      regions: Array.from(regionSet).sort(),
      cities: Array.from(citySet).sort(),
      starRatings: Array.from(starSet).sort((a, b) => b - a)
    };
  }, [hotels]);
  
  // ==================== 筛选逻辑 ====================
  
  const filteredHotels = useMemo(() => {
    let result = hotels;
    
    // 快捷筛选
    if (activeQuickFilter) {
      const quickFilter = quickFilters.find(q => q.id === activeQuickFilter);
      if (quickFilter) {
        result = result.filter(quickFilter.filter);
      }
    }
    
    // 搜索词筛选（支持拼音）
    if (searchQuery.trim()) {
      result = result.filter(h => matchesPinyin(h, searchQuery));
    }
    
    // 区域筛选
    if (filters.regions.length > 0) {
      result = result.filter(h => h.region && filters.regions.includes(h.region));
    }
    
    // 城市筛选
    if (filters.cities.length > 0) {
      result = result.filter(h => h.city && filters.cities.includes(h.city));
    }
    
    // 星级筛选
    if (filters.starRatings.length > 0) {
      result = result.filter(h => h.starRating && filters.starRatings.includes(h.starRating));
    }
    
    // 状态筛选
    if (filters.status.length > 0) {
      result = result.filter(h => h.status && filters.status.includes(h.status));
    }
    
    return result;
  }, [hotels, activeQuickFilter, searchQuery, filters, quickFilters]);
  
  // ==================== 操作函数 ====================
  
  const toggleSelection = useCallback((hotelId: string) => {
    if (!multiSelect) {
      onChange([hotelId]);
      return;
    }
    
    if (selectedIds.includes(hotelId)) {
      onChange(selectedIds.filter(id => id !== hotelId));
    } else {
      if (maxSelection && selectedIds.length >= maxSelection) {
        alert(`最多只能选择 ${maxSelection} 家酒店`);
        return;
      }
      onChange([...selectedIds, hotelId]);
    }
  }, [multiSelect, selectedIds, onChange, maxSelection]);
  
  // 按条件批量选择
  const selectByCondition = useCallback((condition: (hotel: EnterpriseHotel) => boolean) => {
    const matchedIds = filteredHotels.filter(condition).map(h => h.id);
    const newSelection = [...new Set([...selectedIds, ...matchedIds])];
    
    if (maxSelection && newSelection.length > maxSelection) {
      onChange(newSelection.slice(0, maxSelection));
      alert(`已选择前 ${maxSelection} 家酒店`);
    } else {
      onChange(newSelection);
    }
  }, [filteredHotels, selectedIds, onChange, maxSelection]);
  
  // 选择当前筛选结果全部
  const selectAllFiltered = useCallback(() => {
    const allIds = filteredHotels.map(h => h.id);
    if (maxSelection && allIds.length > maxSelection) {
      onChange(allIds.slice(0, maxSelection));
      alert(`已选择前 ${maxSelection} 家酒店`);
    } else {
      onChange(allIds);
    }
  }, [filteredHotels, onChange, maxSelection]);
  
  // 清空选择
  const clearSelection = useCallback(() => {
    onChange([]);
  }, [onChange]);
  
  // 保存搜索历史
  const saveSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      const newItem: SearchHistoryItem = {
        id: Date.now().toString(),
        query: query.trim(),
        timestamp: Date.now()
      };
      // 去重并保留最近10条
      const filtered = prev.filter(item => item.query !== query.trim());
      const updated = [newItem, ...filtered].slice(0, 10);
      localStorage.setItem('sb_hotel_search_history', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  // 删除搜索历史
  const deleteSearchHistory = useCallback((id: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('sb_hotel_search_history', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  // 清空搜索历史
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('sb_hotel_search_history');
  }, []);
  
  // 搜索输入处理
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      saveSearchHistory(value);
    }
  };
  
  // ==================== 虚拟滚动行渲染 ====================
  
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const hotel = filteredHotels[index];
    const isSelected = selectedIds.includes(hotel.id);
    const canOperate = hotel.permissions?.includes('canOperate') ?? true;
    
    return (
      <div
        style={style}
        className={`
          flex items-center px-4 cursor-pointer border-b border-gray-100
          hover:bg-gray-50 transition-colors
          ${isSelected ? 'bg-violet-50 hover:bg-violet-100' : ''}
          ${!canOperate ? 'opacity-50' : ''}
        `}
        onClick={() => canOperate && toggleSelection(hotel.id)}
      >
        {/* 复选框 */}
        <div className="flex-shrink-0 mr-3">
          {multiSelect ? (
            isSelected ? (
              <CheckSquare className="w-5 h-5 text-violet-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-300" />
            )
          ) : (
            <div className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${isSelected ? 'border-violet-600 bg-violet-600' : 'border-gray-300'}
            `}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          )}
        </div>
        
        {/* 酒店信息 */}
        <div className="flex-1 min-w-0 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{hotel.name}</span>
            {hotel.starRating && (
              <div className="flex items-center text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-xs ml-0.5">{hotel.starRating}</span>
              </div>
            )}
            {!canOperate && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                无权限
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {hotel.city || '未知城市'}
            </span>
            <span>{hotel.region || ''}</span>
            {hotel.roomCount && (
              <span>{hotel.roomCount}间房</span>
            )}
          </div>
        </div>
        
        {/* 实时状态 */}
        {hotel.realtimeStatus && (
          <div className="flex-shrink-0 ml-2">
            {hotel.realtimeStatus === 'online' ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                在线
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                离线
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [filteredHotels, selectedIds, multiSelect, toggleSelection]);
  
  // ==================== 批量操作按钮 ====================
  
  const BatchActions = () => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={selectAllFiltered}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
      >
        <CheckSquare className="w-4 h-4" />
        全选当前 ({filteredHotels.length})
      </button>
      
      {regions.length > 0 && (
        <div className="relative group">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <MapPin className="w-4 h-4" />
            按区域选
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
            {regions.map(region => (
              <button
                key={region}
                onClick={() => selectByCondition(h => h.region === region)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {region}区
              </button>
            ))}
          </div>
        </div>
      )}
      
      {cities.length > 0 && (
        <div className="relative group">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Building2 className="w-4 h-4" />
            按城市选
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="absolute top-full left-0 mt-1 w-40 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
            {cities.slice(0, 20).map(city => (
              <button
                key={city}
                onClick={() => selectByCondition(h => h.city === city)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={clearSelection}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        清空
      </button>
    </div>
  );
  
  // ==================== 渲染 ====================
  
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* 头部：搜索和快捷筛选 */}
      <div className="p-4 border-b border-gray-200">
        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索酒店名称、城市，支持拼音（如：bj=北京）..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowHistory(true)}
            className="w-full pl-9 pr-20 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          {/* 搜索历史下拉 */}
          {showHistory && searchHistory.length > 0 && !searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <History className="w-3 h-3" />
                  搜索历史
                </span>
                <button
                  onClick={clearSearchHistory}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  清空
                </button>
              </div>
              {searchHistory.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSearchQuery(item.query);
                    setShowHistory(false);
                  }}
                >
                  <span className="text-sm text-gray-700">{item.query}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSearchHistory(item.id);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 快捷筛选标签 */}
        <div className="flex flex-wrap items-center gap-2">
          {quickFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveQuickFilter(activeQuickFilter === filter.id ? null : filter.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                ${activeQuickFilter === filter.id
                  ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500 ring-offset-1'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors
              ${showFilters
                ? 'bg-violet-100 text-violet-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <Filter className="w-3 h-3" />
            更多筛选
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {/* 统计 */}
          <div className="ml-auto text-sm text-gray-500">
            已选 <span className="font-bold text-violet-600">{selectedIds.length}</span> / {filteredHotels.length} 家
            {maxSelection && ` (最多 ${maxSelection})`}
          </div>
        </div>
        
        {/* 展开的高级筛选 */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            {/* 区域筛选 */}
            {regions.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  区域
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {regions.map(region => (
                    <button
                      key={region}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          regions: prev.regions.includes(region)
                            ? prev.regions.filter(r => r !== region)
                            : [...prev.regions, region]
                        }));
                      }}
                      className={`
                        px-2.5 py-1 text-xs rounded-lg transition-colors
                        ${filters.regions.includes(region)
                          ? 'bg-violet-100 text-violet-700 border border-violet-300'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      {filters.regions.includes(region) && <Check className="w-3 h-3 inline mr-1" />}
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 星级筛选 */}
            {starRatings.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  星级
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {starRatings.map(star => (
                    <button
                      key={star}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          starRatings: prev.starRatings.includes(star)
                            ? prev.starRatings.filter(s => s !== star)
                            : [...prev.starRatings, star]
                        }));
                      }}
                      className={`
                        px-2.5 py-1 text-xs rounded-lg transition-colors
                        ${filters.starRatings.includes(star)
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      {filters.starRatings.includes(star) && <Check className="w-3 h-3 inline mr-1" />}
                      {star}星级
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 城市筛选（折叠展示，城市可能很多） */}
            {cities.length > 0 && cities.length <= 20 && (
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  城市
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {cities.map(city => (
                    <button
                      key={city}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          cities: prev.cities.includes(city)
                            ? prev.cities.filter(c => c !== city)
                            : [...prev.cities, city]
                        }));
                      }}
                      className={`
                        px-2.5 py-1 text-xs rounded-lg transition-colors
                        ${filters.cities.includes(city)
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      {filters.cities.includes(city) && <Check className="w-3 h-3 inline mr-1" />}
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 批量操作 */}
        <div className="mt-3">
          <BatchActions />
        </div>
      </div>
      
      {/* 酒店列表 - 虚拟滚动 */}
      <div className="border-b border-gray-200">
        {filteredHotels.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">没有找到符合条件的酒店</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveQuickFilter(null);
                setFilters({ regions: [], cities: [], starRatings: [], status: [] });
              }}
              className="mt-2 text-sm text-violet-600 hover:text-violet-700"
            >
              清除所有筛选条件
            </button>
          </div>
        ) : (
          <List
            ref={listRef}
            height={400}
            itemCount={filteredHotels.length}
            itemSize={64}
            width="100%"
          >
            {Row}
          </List>
        )}
      </div>
      
      {/* 底部：已选酒店展示 */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Users className="w-4 h-4" />
              已选择的酒店 ({selectedIds.length})
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-red-600 hover:text-red-700"
            >
              清空全部
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {selectedIds.map(id => {
              const hotel = hotels.find(h => h.id === id);
              if (!hotel) return null;
              return (
                <span
                  key={hotel.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-violet-200 rounded-lg text-sm"
                >
                  <span className="text-gray-700 truncate max-w-[120px]">{hotel.name}</span>
                  <button
                    onClick={() => toggleSelection(hotel.id)}
                    className="ml-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default HotelSelectorAdvanced;
