/**
 * 图片库管理 - 酒店专属图片资产管理
 * 
 * 功能：
 * 1. 按酒店查看和管理图片库（与顶部全局选择器联动）
 * 2. 上传新图片到指定酒店
 * 3. 删除/替换图片
 * 4. 图片分类标签管理
 * 5. 一键同步到内容工厂
 * 
 * 数据源：使用共享的 enterprise/data/imageLibrary.ts
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Upload, Trash2, Search, Grid, List,
  Check, X, Building2, Eye, Sparkles, Link2, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, Lightbulb
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { 
  getHotelImageLibrary, 
  getHotelImageStats,
  IMAGE_TYPE_CONFIG,
  type HotelImage 
} from '../../data/imageLibrary';
import { imageLibraryApi } from '../../api';
import { useToast } from '../../../components/ui/Toast';

// 上传进度类型
interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function ImageLibraryManager() {
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const toast = useToast();
  
  // 状态 - 当前查看的酒店（从已选酒店中切换）
  const [currentViewHotel, setCurrentViewHotel] = useState<string>(selectedHotelIds[0] || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<HotelImage | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [imagesVersion, setImagesVersion] = useState(0); // 用于触发重新加载
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 同步全局选择 - 如果全局选择变化，更新当前查看
  useEffect(() => {
    if (selectedHotelIds.length > 0) {
      // 如果当前查看的酒店不在已选列表中，切换到第一个已选酒店
      if (!selectedHotelIds.includes(currentViewHotel)) {
        setCurrentViewHotel(selectedHotelIds[0]);
      }
    } else {
      setCurrentViewHotel('');
    }
  }, [selectedHotelIds, currentViewHotel]);
  
  // 当前酒店的图片 - 从共享数据源获取
  const currentHotelImages = useMemo(() => {
    if (!currentViewHotel) return [];
    return getHotelImageLibrary(currentViewHotel);
  }, [currentViewHotel, imagesVersion]);
  
  // 筛选后的图片
  const filteredImages = useMemo(() => {
    return currentHotelImages.filter(img => {
      if (searchKeyword && !img.name.includes(searchKeyword) && !img.tags.some(t => t.includes(searchKeyword))) return false;
      if (filterType && img.type !== filterType) return false;
      return true;
    });
  }, [currentHotelImages, searchKeyword, filterType]);
  
  // 统计 - 从共享数据源获取
  const stats = useMemo(() => {
    if (!currentViewHotel) {
      return { total: 0, featured: 0, byType: {} as Record<string, number> };
    }
    return getHotelImageStats(currentViewHotel);
  }, [currentViewHotel, imagesVersion]);
  
  // 全部已选酒店的图片统计
  const allHotelsStats = useMemo(() => {
    const selectedHotels = hotels.filter(h => selectedHotelIds.includes(h.id));
    return {
      hotelCount: selectedHotels.length,
      totalImages: selectedHotels.reduce((sum, h) => sum + getHotelImageStats(h.id).total, 0),
      featuredImages: selectedHotels.reduce((sum, h) => sum + getHotelImageStats(h.id).featured, 0),
    };
  }, [hotels, selectedHotelIds, imagesVersion]);
  
  // 刷新图片列表
  const refreshImages = useCallback(() => {
    setImagesVersion(v => v + 1);
  }, []);
  
  // 处理图片选择
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };
  
  // 全选
  const selectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map(i => i.id)));
    }
  };
  
  // 删除选中
  const deleteSelected = async () => {
    if (!currentViewHotel || selectedImages.size === 0) return;
    
    if (confirm(`确定要删除选中的 ${selectedImages.size} 张图片吗？`)) {
      setDeleteLoading(true);
      try {
        const result = await imageLibraryApi.batchDeleteImages(
          currentViewHotel,
          Array.from(selectedImages)
        );
        
        if (result.success) {
          const { success, failed } = result.data || { success: [], failed: [] };
          setSelectedImages(new Set());
          
          if (failed.length > 0) {
            toast.warning(
              '部分删除失败',
              `成功 ${success.length} 张，失败 ${failed.length} 张`
            );
          } else {
            toast.success('删除成功', `共删除 ${success.length} 张图片`);
          }
          
          // 刷新图片列表
          refreshImages();
        } else {
          toast.error('删除失败', result.message || '请稍后重试');
        }
      } catch (error) {
        toast.error(
          '删除失败',
          error instanceof Error ? error.message : '未知错误'
        );
      } finally {
        setDeleteLoading(false);
      }
    }
  };
  
  // 同步到内容工厂
  const syncToContentFactory = async () => {
    if (!currentViewHotel) {
      toast.warning('请先选择酒店');
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      // 调用同步 API（使用图片库同步功能）
      const result = await imageLibraryApi.syncImagesToContentFactory(
        currentViewHotel,
        Array.from(selectedImages).length > 0 ? Array.from(selectedImages) : undefined
      );
      
      if (result.success) {
        setSyncStatus('success');
        toast.success(
          '同步成功',
          `已将 ${result.data?.syncedCount || 0} 张图片同步到内容工厂`
        );
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        setSyncStatus('error');
        toast.error('同步失败', result.message || '请稍后重试');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }
    } catch (error) {
      setSyncStatus('error');
      toast.error(
        '同步失败',
        error instanceof Error ? error.message : '未知错误'
      );
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };
  
  // 拖放上传
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  // 处理文件上传
  const processFileUpload = async (files: FileList) => {
    if (!currentViewHotel) {
      toast.warning('请先选择酒店');
      return;
    }
    
    if (files.length === 0) return;
    
    // 初始化上传进度
    const initialProgress: UploadProgress[] = Array.from(files).map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending',
    }));
    setUploadProgress(initialProgress);
    setUploadLoading(true);
    
    // 显示上传中提示
    toast.info('开始上传', `正在上传 ${files.length} 张图片...`);
    
    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => 
          prev.map(p => 
            p.status === 'pending' || p.status === 'uploading'
              ? { ...p, progress: Math.min(p.progress + 10, 90), status: 'uploading' }
              : p
          )
        );
      }, 200);
      
      const result = await imageLibraryApi.batchUploadImages(
        currentViewHotel,
        files
      );
      
      clearInterval(progressInterval);
      
      if (result.success) {
        const { success, failed } = result.data || { success: [], failed: [] };
        
        // 更新最终进度状态
        setUploadProgress(prev => 
          prev.map(p => {
            const isFailed = failed.find(f => f.file === p.fileName);
            if (isFailed) {
              return { ...p, progress: 0, status: 'error', error: isFailed.reason };
            }
            return { ...p, progress: 100, status: 'success' };
          })
        );
        
        if (failed.length > 0) {
          toast.warning(
            '部分上传失败',
            `成功 ${success.length} 张，失败 ${failed.length} 张`
          );
        } else {
          toast.success('上传成功', `成功上传 ${success.length} 张图片`);
        }
        
        setShowUploadModal(false);
        // 刷新图片列表
        refreshImages();
      } else {
        setUploadProgress(prev => 
          prev.map(p => ({ ...p, status: 'error', error: result.message }))
        );
        toast.error('上传失败', result.message || '请稍后重试');
      }
    } catch (error) {
      setUploadProgress(prev => 
        prev.map(p => ({ 
          ...p, 
          status: 'error', 
          error: error instanceof Error ? error.message : '未知错误' 
        }))
      );
      toast.error(
        '上传失败',
        error instanceof Error ? error.message : '未知错误'
      );
    } finally {
      setUploadLoading(false);
      // 清除进度显示（延迟3秒后）
      setTimeout(() => setUploadProgress([]), 3000);
    }
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      await processFileUpload(e.dataTransfer.files);
    }
  };
  
  // 获取当前酒店名称
  const currentHotelName = useMemo(() => {
    return hotels.find(h => h.id === currentViewHotel)?.name || '';
  }, [hotels, currentViewHotel]);

  return (
    <div className="p-6 space-y-6">
      
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-violet-600" />
            图片库管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            管理各酒店专属图片素材，与内容工厂联动使用
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 同步状态 */}
          {syncStatus === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 text-green-600 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              已同步到内容工厂
            </motion.div>
          )}
          
          {syncStatus === 'error' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              同步失败
            </motion.div>
          )}
          
          {/* 同步按钮 */}
          <button
            onClick={syncToContentFactory}
            disabled={syncStatus === 'syncing' || !currentViewHotel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {syncStatus === 'syncing' ? '同步中...' : '同步到内容工厂'}
          </button>
          
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={!currentViewHotel}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            上传图片
          </button>
        </div>
      </div>

      {/* 全局统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已选酒店</p>
              <p className="text-2xl font-bold text-violet-600">{allHotelsStats.hotelCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">当前酒店图片</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">特色图片</p>
              <p className="text-2xl font-bold text-amber-600">{stats.featured}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">内容工厂可用</p>
              <p className="text-2xl font-bold text-emerald-600">
                {selectedHotelIds.length > 0 ? '✓' : '-'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：已选酒店列表 */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              已选酒店 ({selectedHotelIds.length})
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedHotelIds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">请在顶部选择酒店</p>
                </div>
              ) : (
                hotels
                  .filter(hotel => selectedHotelIds.includes(hotel.id))
                  .map(hotel => {
                    const hotelStats = getHotelImageStats(hotel.id);
                    const isActive = currentViewHotel === hotel.id;
                    
                    return (
                      <button
                        key={hotel.id}
                        onClick={() => {
                          setCurrentViewHotel(hotel.id);
                          setSelectedImages(new Set());
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isActive
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-sm text-gray-900">{hotel.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{hotel.city}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${hotelStats.total > 0 ? 'text-violet-600' : 'text-gray-400'}`}>
                              {hotelStats.total}张
                            </span>
                            {hotelStats.featured > 0 && (
                              <span className="text-xs text-amber-600 flex items-center gap-0.5">
                                <Sparkles className="w-3 h-3" />
                                {hotelStats.featured}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
          
          {/* 使用提示 */}
          <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1"><Lightbulb className="w-4 h-4" /> 使用提示</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 顶部全局选择器可批量切换酒店</li>
              <li>• 特色图片会优先用于AI内容生成</li>
              <li>• 图片自动同步到内容工厂</li>
              <li>• 建议每个酒店上传6-9张高质量图片</li>
            </ul>
          </div>
          
          {/* 图片类型分布 */}
          {currentViewHotel && stats.total > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">图片类型分布</h4>
              <div className="space-y-2">
                {Object.entries(IMAGE_TYPE_CONFIG).map(([type, config]) => {
                  const count = stats.byType[type] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className={`text-xs ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-gray-500">{count}张</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：图片管理 */}
        <div className="col-span-9 space-y-4">
          {/* 工具栏 */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
            {/* 当前酒店标题 */}
            {currentHotelName && (
              <div className="flex items-center gap-2 mr-4 pr-4 border-r border-gray-200">
                <span className="text-sm font-medium text-gray-900">{currentHotelName}</span>
                <span className="text-xs text-gray-400">的图片库</span>
              </div>
            )}
            
            {/* 搜索 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索图片名称或标签..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            
            {/* 类型筛选 */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">全部类型</option>
              {Object.entries(IMAGE_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            
            {/* 视图切换 */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* 批量操作 */}
            {selectedImages.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">已选 {selectedImages.size} 张</span>
                <button
                  onClick={deleteSelected}
                  disabled={deleteLoading}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className={`w-4 h-4 ${deleteLoading ? 'animate-spin' : ''}`} />
                  {deleteLoading ? '删除中...' : '删除'}
                </button>
              </div>
            )}
          </div>
          
          {/* 图片列表 */}
          {selectedHotelIds.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">未选择酒店</h3>
              <p className="text-sm text-gray-500 mb-4">请先在顶部选择要管理的酒店</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无图片</h3>
              <p className="text-sm text-gray-500 mb-4">该酒店还没有上传图片</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                上传第一张图片
              </button>
            </div>
          ) : (
            <>
              {/* 全选栏 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedImages.size === filteredImages.length && filteredImages.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300"
                  />
                  全选
                </label>
                <span className="text-sm text-gray-500">
                  共 {filteredImages.length} 张图片
                </span>
              </div>
              
              {/* 网格视图 */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-4 gap-4">
                  {filteredImages.map((image) => (
                    <motion.div
                      key={image.id}
                      layout
                      className={`group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer ${
                        selectedImages.has(image.id)
                          ? 'border-violet-500'
                          : 'border-gray-200 hover:border-violet-300'
                      }`}
                      onClick={() => toggleImageSelection(image.id)}
                    >
                      <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                      
                      {/* 选中遮罩 */}
                      {selectedImages.has(image.id) && (
                        <div className="absolute inset-0 bg-violet-500/30 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                      
                      {/* 特色标记 */}
                      {image.isFeatured && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          特色
                        </div>
                      )}
                      
                      {/* 悬浮操作 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium truncate">{image.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${IMAGE_TYPE_CONFIG[image.type].bgColor} ${IMAGE_TYPE_CONFIG[image.type].color}`}>
                              {IMAGE_TYPE_CONFIG[image.type].label}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(image);
                              }}
                              className="p-1.5 bg-white/20 rounded text-white hover:bg-white/30"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* 列表视图 */}
              {viewMode === 'list' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-10"></th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">图片</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">名称</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">标签</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">上传时间</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredImages.map((image) => (
                        <tr
                          key={image.id}
                          className={`hover:bg-gray-50 cursor-pointer ${selectedImages.has(image.id) ? 'bg-violet-50' : ''}`}
                          onClick={() => toggleImageSelection(image.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedImages.has(image.id)}
                              onChange={() => {}}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <img src={image.url} alt={image.name} className="w-12 h-12 rounded-lg object-cover" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{image.name}</span>
                              {image.isFeatured && (
                                <Sparkles className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${IMAGE_TYPE_CONFIG[image.type].bgColor} ${IMAGE_TYPE_CONFIG[image.type].color}`}>
                              {IMAGE_TYPE_CONFIG[image.type].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {image.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                  {tag}
                                </span>
                              ))}
                              {image.tags.length > 3 && (
                                <span className="text-xs text-gray-400">+{image.tags.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{image.uploadAt}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(image);
                              }}
                              className="p-2 text-gray-400 hover:text-violet-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 上传弹窗 */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => !uploadLoading && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">上传图片</h3>
                <button 
                  onClick={() => !uploadLoading && setShowUploadModal(false)}
                  disabled={uploadLoading}
                  className="disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">上传到酒店</label>
                  <select
                    value={currentViewHotel}
                    onChange={(e) => setCurrentViewHotel(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                    disabled={uploadLoading}
                  >
                    {hotels
                      .filter(h => selectedHotelIds.includes(h.id))
                      .map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                  </select>
                </div>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragging ? 'border-violet-500 bg-violet-50' : 'border-gray-200'
                  } ${uploadLoading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploadLoading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-3" />
                      <p className="text-gray-600">正在上传...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">拖拽图片到这里，或</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-violet-600 hover:underline"
                      >
                        点击选择文件
                      </button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files?.length) {
                        await processFileUpload(e.target.files);
                        // 清空 input 以便可以再次选择相同文件
                        e.target.value = '';
                      }
                    }}
                    disabled={uploadLoading}
                  />
                  <p className="text-xs text-gray-400 mt-3">支持 JPG、PNG 格式，单张不超过 10MB</p>
                </div>
                
                {/* 上传进度显示 */}
                {uploadProgress.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">上传进度</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uploadProgress.map((progress, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700 truncate flex-1 mr-2">
                              {progress.fileName}
                            </span>
                            <span className="text-xs">
                              {progress.status === 'success' && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                              {progress.status === 'error' && (
                                <X className="w-4 h-4 text-red-500" />
                              )}
                              {progress.status === 'uploading' && (
                                <span className="text-violet-600">{progress.progress}%</span>
                              )}
                              {progress.status === 'pending' && (
                                <span className="text-gray-400">等待中</span>
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                progress.status === 'error' 
                                  ? 'bg-red-500' 
                                  : progress.status === 'success'
                                  ? 'bg-green-500'
                                  : 'bg-violet-500'
                              }`}
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                          {progress.error && (
                            <p className="text-xs text-red-500 mt-1">{progress.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图片预览弹窗 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
                <h4 className="text-white font-medium">{previewImage.name}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-1 rounded ${IMAGE_TYPE_CONFIG[previewImage.type].bgColor} ${IMAGE_TYPE_CONFIG[previewImage.type].color}`}>
                    {IMAGE_TYPE_CONFIG[previewImage.type].label}
                  </span>
                  <span className="text-xs text-gray-300">
                    {previewImage.tags.join(', ')}
                  </span>
                  {previewImage.isFeatured && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      特色图片
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
