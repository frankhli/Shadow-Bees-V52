/**
 * 图片库管理 API
 * 
 * 功能：
 * 1. 获取酒店图片库列表
 * 2. 上传图片
 * 3. 删除图片
 * 4. 批量删除图片
 * 5. 更新图片信息
 */

import type { ApiResponse } from './types';
import type { HotelImage } from '../data/imageLibrary';
import { 
  getHotelImageLibrary as getMockHotelImageLibrary,
} from '../data/imageLibrary';

// 模拟网络延迟
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟服务器端图片存储（实际项目中会存储在服务器上）
let mockImageLibrary: Record<string, HotelImage[]> = {};

/**
 * 获取酒店图片库列表
 */
export async function getHotelImages(
  hotelId: string
): Promise<ApiResponse<HotelImage[]>> {
  await delay();
  
  // 使用现有的 mock 数据作为基础
  const images = getMockHotelImageLibrary(hotelId);
  
  // 合并服务器端存储的新上传图片
  if (mockImageLibrary[hotelId]) {
    const existingIds = new Set(images.map(img => img.id));
    const newImages = mockImageLibrary[hotelId].filter(img => !existingIds.has(img.id));
    images.push(...newImages);
  }
  
  return {
    success: true,
    data: images,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取酒店图片统计
 */
export async function getHotelImageStats(hotelId: string): Promise<ApiResponse<{
  total: number;
  featured: number;
  byType: Record<string, number>;
}>> {
  await delay();
  
  const images = await getHotelImages(hotelId);
  const library = images.data || [];
  
  return {
    success: true,
    data: {
      total: library.length,
      featured: library.filter(img => img.isFeatured).length,
      byType: library.reduce((acc, img) => {
        acc[img.type] = (acc[img.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 上传单张图片
 * @param hotelId 酒店ID
 * @param file 图片文件
 * @param metadata 图片元数据（名称、类型、标签等）
 */
export async function uploadImage(
  hotelId: string,
  file: File,
  metadata: {
    name?: string;
    type?: HotelImage['type'];
    tags?: string[];
    isFeatured?: boolean;
  } = {}
): Promise<ApiResponse<HotelImage>> {
  await delay(800); // 上传需要更多时间
  
  // 模拟文件上传，生成图片URL
  // 实际项目中这里会上传到对象存储（如OSS/S3）并返回真实URL
  const objectUrl = URL.createObjectURL(file);
  
  // 生成唯一ID
  const id = `img-${hotelId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 确定图片类型
  const type = metadata.type || detectImageType(file.name, metadata.tags || []);
  
  const newImage: HotelImage = {
    id,
    hotelId,
    url: objectUrl,
    name: metadata.name || file.name.replace(/\.[^/.]+$/, ''), // 移除扩展名
    type,
    tags: metadata.tags || generateDefaultTags(type, file.name),
    uploadAt: new Date().toISOString().split('T')[0],
    size: formatFileSize(file.size),
    isFeatured: metadata.isFeatured || false,
  };
  
  // 保存到模拟存储
  if (!mockImageLibrary[hotelId]) {
    mockImageLibrary[hotelId] = [];
  }
  mockImageLibrary[hotelId].push(newImage);
  
  return {
    success: true,
    data: newImage,
    message: '图片上传成功',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量上传图片
 * @param hotelId 酒店ID
 * @param files 图片文件列表
 * @param defaultMetadata 默认元数据
 */
export async function batchUploadImages(
  hotelId: string,
  files: FileList,
  defaultMetadata: {
    type?: HotelImage['type'];
    tags?: string[];
  } = {}
): Promise<ApiResponse<{
  success: HotelImage[];
  failed: { file: string; reason: string }[];
}>> {
  await delay(1000 + files.length * 200); // 根据文件数量调整延迟
  
  const success: HotelImage[] = [];
  const failed: { file: string; reason: string }[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      failed.push({ file: file.name, reason: '不是有效的图片文件' });
      continue;
    }
    
    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      failed.push({ file: file.name, reason: '文件大小超过10MB限制' });
      continue;
    }
    
    try {
      const result = await uploadImage(hotelId, file, {
        ...defaultMetadata,
        name: file.name.replace(/\.[^/.]+$/, ''),
      });
      
      if (result.success && result.data) {
        success.push(result.data);
      } else {
        failed.push({ file: file.name, reason: result.message || '上传失败' });
      }
    } catch (error) {
      failed.push({ file: file.name, reason: error instanceof Error ? error.message : '未知错误' });
    }
  }
  
  return {
    success: true,
    data: { success, failed },
    message: `成功上传 ${success.length} 张图片${failed.length > 0 ? `，${failed.length} 张失败` : ''}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 删除单张图片
 * @param hotelId 酒店ID
 * @param imageId 图片ID
 */
export async function deleteImage(
  hotelId: string,
  imageId: string
): Promise<ApiResponse<void>> {
  await delay(400);
  
  // 从模拟存储中删除
  if (mockImageLibrary[hotelId]) {
    const index = mockImageLibrary[hotelId].findIndex(img => img.id === imageId);
    if (index > -1) {
      mockImageLibrary[hotelId].splice(index, 1);
    }
  }
  
  // 实际项目中这里还会删除对象存储中的文件
  
  return {
    success: true,
    data: undefined,
    message: '图片删除成功',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量删除图片
 * @param hotelId 酒店ID
 * @param imageIds 图片ID列表
 */
export async function batchDeleteImages(
  hotelId: string,
  imageIds: string[]
): Promise<ApiResponse<{
  success: string[];
  failed: { id: string; reason: string }[];
}>> {
  await delay(500 + imageIds.length * 50);
  
  const success: string[] = [];
  const failed: { id: string; reason: string }[] = [];
  
  for (const imageId of imageIds) {
    try {
      const result = await deleteImage(hotelId, imageId);
      if (result.success) {
        success.push(imageId);
      } else {
        failed.push({ id: imageId, reason: result.message || '删除失败' });
      }
    } catch (error) {
      failed.push({ id: imageId, reason: error instanceof Error ? error.message : '未知错误' });
    }
  }
  
  return {
    success: true,
    data: { success, failed },
    message: `成功删除 ${success.length} 张图片${failed.length > 0 ? `，${failed.length} 张失败` : ''}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新图片信息
 * @param hotelId 酒店ID
 * @param imageId 图片ID
 * @param updates 更新的字段
 */
export async function updateImage(
  hotelId: string,
  imageId: string,
  updates: Partial<Omit<HotelImage, 'id' | 'hotelId' | 'url' | 'uploadAt'>>
): Promise<ApiResponse<HotelImage>> {
  await delay(300);
  
  // 查找并更新图片
  let updatedImage: HotelImage | null = null;
  
  if (mockImageLibrary[hotelId]) {
    const index = mockImageLibrary[hotelId].findIndex(img => img.id === imageId);
    if (index > -1) {
      mockImageLibrary[hotelId][index] = {
        ...mockImageLibrary[hotelId][index],
        ...updates,
      };
      updatedImage = mockImageLibrary[hotelId][index];
    }
  }
  
  if (!updatedImage) {
    return {
      success: false,
      data: null as any,
      message: '图片不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: updatedImage,
    message: '图片信息更新成功',
    timestamp: new Date().toISOString(),
  };
}

/**
 * 设置图片为特色图片
 * @param hotelId 酒店ID
 * @param imageId 图片ID
 * @param isFeatured 是否设为特色
 */
export async function setImageFeatured(
  hotelId: string,
  imageId: string,
  isFeatured: boolean
): Promise<ApiResponse<HotelImage>> {
  return updateImage(hotelId, imageId, { isFeatured });
}

/**
 * 同步图片到内容工厂
 * @param hotelId 酒店ID
 * @param imageIds 可选，指定要同步的图片ID列表，不传则同步所有图片
 */
export async function syncImagesToContentFactory(
  hotelId: string,
  imageIds?: string[]
): Promise<ApiResponse<{
  syncedCount: number;
  syncedIds: string[];
}>> {
  await delay(1500); // 模拟同步耗时
  
  // 获取需要同步的图片
  const imagesToSync = imageIds 
    ? imageIds 
    : (mockImageLibrary[hotelId] || []).map(img => img.id);
  
  // 模拟同步结果（90%成功率）
  const syncedIds: string[] = [];
  const failedIds: string[] = [];
  
  for (const imageId of imagesToSync) {
    if (Math.random() > 0.1) {
      syncedIds.push(imageId);
    } else {
      failedIds.push(imageId);
    }
  }
  
  // 模拟部分失败的情况
  const success = failedIds.length === 0 || syncedIds.length > 0;
  
  return {
    success,
    data: {
      syncedCount: syncedIds.length,
      syncedIds,
    },
    message: success 
      ? `成功同步 ${syncedIds.length} 张图片到内容工厂${failedIds.length > 0 ? `，${failedIds.length} 张失败` : ''}`
      : '同步失败，请稍后重试',
    timestamp: new Date().toISOString(),
  };
}

// ==================== 辅助函数 ====================

/**
 * 根据文件名和标签自动检测图片类型
 */
function detectImageType(fileName: string, tags: string[]): HotelImage['type'] {
  const lowerName = fileName.toLowerCase();
  const lowerTags = tags.map(t => t.toLowerCase());
  
  // 根据文件名关键词判断
  if (/room|bed|客房|房间|大床|双床|suite|套房/.test(lowerName)) return 'room';
  if (/view|night|景观|夜景|外景|风景/.test(lowerName)) return 'view';
  if (/lobby|hall|大堂|前台|facility|gym|健身|泳池|swimming|会议/.test(lowerName)) return 'facility';
  if (/bath|shower|toilet|卫浴|浴室|卫生间/.test(lowerName)) return 'bathroom';
  if (/dining|restaurant|food|breakfast|餐饮|餐厅|早餐|美食/.test(lowerName)) return 'dining';
  
  // 根据标签判断
  if (lowerTags.some(t => /room|客房|房间|bed/.test(t))) return 'room';
  if (lowerTags.some(t => /view|景观|风景/.test(t))) return 'view';
  if (lowerTags.some(t => /facility|设施|gym|健身/.test(t))) return 'facility';
  if (lowerTags.some(t => /bath|卫浴|浴室/.test(t))) return 'bathroom';
  if (lowerTags.some(t => /dining|餐饮|餐厅|food/.test(t))) return 'dining';
  
  return 'other';
}

/**
 * 生成默认标签
 */
function generateDefaultTags(type: HotelImage['type'], fileName: string): string[] {
  const typeLabels: Record<HotelImage['type'], string> = {
    room: '客房',
    view: '景观',
    facility: '设施',
    bathroom: '卫浴',
    dining: '餐饮',
    other: '其他',
  };
  
  const tags = [typeLabels[type], type];
  
  // 从文件名提取可能的关键词
  if (/lobby|大堂/.test(fileName)) tags.push('大堂');
  if (/gym|健身/.test(fileName)) tags.push('健身');
  if (/night|夜景/.test(fileName)) tags.push('夜景');
  
  return [...new Set(tags)];
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
