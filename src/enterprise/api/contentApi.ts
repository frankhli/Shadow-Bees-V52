/**
 * 内容中心相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  ContentItem,
  PrivateContent,
  OperationTask,
  FollowUpRecord,
  PaginationParams,
} from './types';
import { 
  MOCK_CONTENTS, 
  MOCK_PRIVATE_CONTENTS, 
  MOCK_TASKS, 
  MOCK_FOLLOW_UPS,
  MOCK_CONTENT_TRANSACTIONS,
  type ContentTransaction,
} from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== AI内容生成 ====================

export interface GenerateContentRequest {
  hotelId: string;
  platform: 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';
  template: string;
  contentType: 'image' | 'video' | 'text';
  subtype?: 'moments' | 'group' | 'private' | 'channels';
  images: string[];
  pricingMode: 'clearance' | 'dynamic' | 'scalper';
  hotelName: string;
  city: string;
  price: number;
  competitorAvg: number;
  batchMode?: 'single' | 'batch' | 'template';
  templateVars?: Record<string, string>;
}

export interface GenerateContentResponse {
  id: string;
  title: string;
  content: string;
  images: string[];
  platform: string;
  contentType: string;
  videoScript?: {
    totalDuration: number;
    scenes: Array<{
      id: number;
      startTime: number;
      endTime: number;
      duration: number;
      shot: string;
      subtitle: string;
      bgm?: string;
      tips?: string;
    }>;
    materials: Array<{
      type: 'photo' | 'video' | 'screenshot';
      description: string;
      count: number;
      tips: string;
    }>;
    bgmRecommendation: string;
    shootingTips: string[];
    editingTips: string[];
  };
  groupScript?: {
    title: string;
    content: string;
    atAll: boolean;
    type: 'welcome' | 'announcement' | 'flashsale' | 'interaction' | 'daily';
  };
  privateScript?: {
    title: string;
    content: string;
    type: 'welcome' | 'booking' | 'reminder' | 'followup' | 'rebooking';
  };
  generatedAt: string;
}

/**
 * AI生成内容
 * 实际项目中调用后端AI服务，目前模拟生成过程
 */
export async function generateContentWithAI(
  request: GenerateContentRequest
): Promise<ApiResponse<GenerateContentResponse>> {
  await delay(2000); // 模拟AI生成耗时
  
  // 模拟AI生成结果
  const modeLabels: Record<string, { label: string; angle: string; cta: string }> = {
    clearance: { label: '清仓特惠', angle: '限时特惠', cta: '抢订从速，手慢无！' },
    dynamic: { label: '动态定价', angle: '品质之选', cta: '立即预订，锁定好价！' },
    scalper: { label: '黄牛策略', angle: '尊享限量', cta: '抢先预订，独享尊贵体验！' },
  };
  
  const mode = modeLabels[request.pricingMode] || modeLabels.dynamic;
  
  const response: GenerateContentResponse = {
    id: `content-${request.hotelId}-${Date.now()}`,
    title: `【${mode.angle}】${request.hotelName}｜核心地段｜${mode.label}`,
    content: `📍${request.hotelName}
🏙️位置优势：位于${request.city}核心地段
💰当前${mode.label}：¥${request.price}/晚（竞品均价¥${request.competitorAvg}）
✨房间整洁舒适
✨服务贴心周到
🔥限时优惠中
👉${mode.cta}

#${request.city}酒店 #住宿推荐`,
    images: request.images.slice(0, 3),
    platform: request.platform,
    contentType: request.contentType,
    generatedAt: new Date().toISOString(),
  };
  
  // 如果是视频类型，添加视频脚本
  if (request.contentType === 'video') {
    response.videoScript = {
      totalDuration: 30,
      scenes: [
        { id: 1, startTime: 0, endTime: 5, duration: 5, shot: '酒店外观+大堂', subtitle: '今天入住的是这家酒店', bgm: '轻音乐前奏', tips: '稳定器慢推' },
        { id: 2, startTime: 5, endTime: 15, duration: 10, shot: '刷卡进门→房间全景', subtitle: '房间很温馨', bgm: '音乐渐强', tips: 'Room Tour标准开头' },
        { id: 3, startTime: 15, endTime: 30, duration: 15, shot: '床品+浴室+窗外细节', subtitle: '床品很干净，浴室干湿分离', bgm: '继续', tips: '慢镜头展示' },
      ],
      materials: [
        { type: 'video', description: '酒店大堂', count: 1, tips: '稳定器慢推' },
        { type: 'video', description: 'Room Tour', count: 1, tips: '连贯拍摄房间' },
        { type: 'photo', description: '床品细节', count: 3, tips: '质感特写' },
      ],
      bgmRecommendation: '小红书热门BGM，轻音乐或治愈系',
      shootingTips: ['整体节奏慢，突出氛围感', '多用慢镜头和特写', '色调保持温暖治愈'],
      editingTips: ['使用小红书自带剪辑工具', '添加滤镜：奶杏、暖棕', '封面选最美的房间角度'],
    };
  }
  
  return {
    success: true,
    data: response,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量AI生成内容
 */
export async function batchGenerateContentWithAI(
  requests: GenerateContentRequest[]
): Promise<ApiResponse<GenerateContentResponse[]>> {
  await delay(3000); // 批量生成需要更长时间
  
  const results: GenerateContentResponse[] = [];
  
  for (const request of requests) {
    const result = await generateContentWithAI(request);
    if (result.success) {
      results.push(result.data);
    }
  }
  
  return {
    success: true,
    data: results,
    timestamp: new Date().toISOString(),
  };
}

// ==================== 图片上传 ====================

export interface UploadImageResponse {
  id: string;
  url: string;
  name: string;
  type: string;
  tags: string[];
}

/**
 * 上传图片到酒店图库
 * 实际项目中调用OSS/S3等对象存储服务
 */
export async function uploadImageToLibrary(
  hotelId: string,
  file: File,
  tags: string[] = []
): Promise<ApiResponse<UploadImageResponse>> {
  await delay(1500); // 模拟上传耗时
  
  // 实际项目中这里应该：
  // 1. 调用OSS上传接口获取图片URL
  // 2. 将图片信息保存到数据库
  
  // 模拟生成图片URL
  const imageUrl = URL.createObjectURL(file);
  
  const response: UploadImageResponse = {
    id: `img-${hotelId}-${Date.now()}`,
    url: imageUrl,
    name: file.name,
    type: file.type.split('/')[0] === 'image' ? 'room' : 'other',
    tags: [...tags, file.name.split('.')[0]],
  };
  
  return {
    success: true,
    data: response,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 替换图片
 * 用于内容编辑时替换已有图片
 */
export async function replaceImage(
  contentId: string,
  _oldImageId: string,
  newFile: File
): Promise<ApiResponse<{ contentId: string; newImage: UploadImageResponse }>> {
  await delay(1000);
  
  // 实际上传新图片
  const uploadResult = await uploadImageToLibrary('temp-hotel', newFile);
  
  if (!uploadResult.success) {
    return {
      success: false,
      data: null as any,
      message: '图片上传失败',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 实际项目中这里还应该：
  // 1. 更新内容中的图片引用
  // 2. 删除旧图片（可选）
  
  return {
    success: true,
    data: {
      contentId,
      newImage: uploadResult.data,
    },
    timestamp: new Date().toISOString(),
  };
}

// ==================== 内容工厂 ====================

/**
 * 获取内容列表
 */
export async function getContents(
  params?: PaginationParams & { hotelId?: string; status?: string; type?: string }
): Promise<ApiResponse<PaginatedResponse<ContentItem>>> {
  await delay();
  
  let list = [...MOCK_CONTENTS];
  
  if (params?.hotelId) {
    list = list.filter(c => c.hotelId === params.hotelId);
  }
  
  if (params?.status) {
    list = list.filter(c => c.status === params.status);
  }
  
  if (params?.type) {
    list = list.filter(c => c.type === params.type);
  }
  
  // 按时间倒序
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

// ==================== 内容转化交易数据 ====================

/**
 * 获取内容转化交易列表
 */
export async function getContentTransactions(
  params?: { hotelIds?: string[]; startDate?: string; endDate?: string; page?: number; pageSize?: number }
): Promise<ApiResponse<PaginatedResponse<ContentTransaction>>> {
  await delay();
  
  let list = [...MOCK_CONTENT_TRANSACTIONS];
  
  // 按酒店筛选
  if (params?.hotelIds && params.hotelIds.length > 0) {
    list = list.filter(t => params.hotelIds!.includes(t.hotelId));
  }
  
  // 按日期筛选
  if (params?.startDate) {
    const start = new Date(params.startDate);
    list = list.filter(t => new Date(t.timestamp) >= start);
  }
  
  if (params?.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    list = list.filter(t => new Date(t.timestamp) <= end);
  }
  
  // 按时间倒序
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 50;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取内容详情
 */
export async function getContentDetail(contentId: string): Promise<ApiResponse<ContentItem>> {
  await delay();
  
  const content = MOCK_CONTENTS.find(c => c.id === contentId);
  
  if (!content) {
    return {
      success: false,
      data: null as any,
      message: '内容不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    data: content,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建内容
 */
export async function createContent(
  data: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<ContentItem>> {
  await delay(500);
  
  const newContent: ContentItem = {
    ...data as any,
    id: `content-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  MOCK_CONTENTS.unshift(newContent);
  
  return {
    success: true,
    data: newContent,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 发布内容
 */
export async function publishContent(contentId: string): Promise<ApiResponse<ContentItem>> {
  await delay(500);
  
  const index = MOCK_CONTENTS.findIndex(c => c.id === contentId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '内容不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_CONTENTS[index] = {
    ...MOCK_CONTENTS[index],
    status: 'published',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_CONTENTS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 删除内容
 */
export async function deleteContent(contentId: string): Promise<ApiResponse<void>> {
  await delay(500);
  
  const index = MOCK_CONTENTS.findIndex(c => c.id === contentId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '内容不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  // 从数组中删除
  MOCK_CONTENTS.splice(index, 1);
  
  return {
    success: true,
    data: undefined,
    timestamp: new Date().toISOString(),
  };
}

// ==================== 私域运营 ====================

/**
 * 获取私域内容列表
 */
export async function getPrivateContents(
  params?: PaginationParams & { hotelId?: string; platform?: string }
): Promise<ApiResponse<PaginatedResponse<PrivateContent>>> {
  await delay();
  
  let list = [...MOCK_PRIVATE_CONTENTS];
  
  if (params?.hotelId) {
    list = list.filter(c => c.hotelId === params.hotelId);
  }
  
  if (params?.platform) {
    list = list.filter(c => c.platform === params.platform);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取运营任务列表
 */
export async function getOperationTasks(
  params?: PaginationParams & { hotelId?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<OperationTask>>> {
  await delay();
  
  let list = [...MOCK_TASKS];
  
  if (params?.hotelId) {
    list = list.filter(t => t.hotelId === params.hotelId);
  }
  
  if (params?.status) {
    list = list.filter(t => t.status === params.status);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取跟进记录列表
 */
export async function getFollowUpRecords(
  params?: PaginationParams & { hotelId?: string; customerId?: string }
): Promise<ApiResponse<PaginatedResponse<FollowUpRecord>>> {
  await delay();
  
  let list = [...MOCK_FOLLOW_UPS];
  
  if (params?.hotelId) {
    list = list.filter(r => r.hotelId === params.hotelId);
  }
  
  if (params?.customerId) {
    list = list.filter(r => r.customerId === params.customerId);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 添加跟进记录
 */
export async function addFollowUpRecord(
  data: Omit<FollowUpRecord, 'id' | 'createdAt'>
): Promise<ApiResponse<FollowUpRecord>> {
  await delay(300);
  
  const newRecord: FollowUpRecord = {
    ...data as any,
    id: `followup-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  
  MOCK_FOLLOW_UPS.unshift(newRecord);
  
  return {
    success: true,
    data: newRecord,
    timestamp: new Date().toISOString(),
  };
}

// ==================== 发布管理 ====================

/**
 * 获取发布计划列表
 */
export async function getPublishSchedules(
  params?: PaginationParams & { hotelId?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<ContentItem>>> {
  await delay();
  
  let list = MOCK_CONTENTS.filter(c => c.scheduledAt);
  
  if (params?.hotelId) {
    list = list.filter(c => c.hotelId === params.hotelId);
  }
  
  if (params?.status) {
    list = list.filter(c => c.status === params.status);
  }
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const total = list.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  
  return {
    success: true,
    data: {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}
