/**
 * 企业版 - 共享图片库数据源
 * 
 * 用于：
 * 1. 图片库管理页面 - 查看和管理酒店图片
 * 2. 内容工厂 - AI生成内容时选择图片
 * 3. 其他需要酒店图片的功能
 */

// 图片类型定义
export interface HotelImage {
  id: string;
  hotelId: string;
  url: string;
  name: string;
  type: 'room' | 'view' | 'facility' | 'bathroom' | 'dining' | 'other';
  tags: string[];
  uploadAt: string;
  size?: string;
  dimensions?: string;
  isFeatured?: boolean;
}

// 图片类型配置（用于UI显示）
export const IMAGE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  room: { label: '客房', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  view: { label: '景观', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  facility: { label: '设施', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  bathroom: { label: '卫浴', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  dining: { label: '餐饮', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  other: { label: '其他', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

// ============================================
// 基础图片池 - 所有酒店共享的基础素材
// ============================================
export const baseImagePool: Omit<HotelImage, 'hotelId' | 'uploadAt'>[] = [
  { id: 'base-001', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', name: '豪华大床房-夜景', type: 'room', tags: ['大床房', '夜景', '商务', 'room', 'luxury'], isFeatured: true },
  { id: 'base-002', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', name: '标准双床房-白天', type: 'room', tags: ['双床房', '标准', 'room', 'standard'], isFeatured: true },
  { id: 'base-003', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', name: '窗外城市景观', type: 'view', tags: ['城市', '夜景', '地标', 'view', 'city'], isFeatured: true },
  { id: 'base-004', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '酒店大堂', type: 'facility', tags: ['大堂', '豪华', 'lobby'], isFeatured: true },
  { id: 'base-005', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400', name: '房间细节-床头', type: 'room', tags: ['细节', '舒适', 'room', 'detail'] },
  { id: 'base-006', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400', name: '浴室-淋浴间', type: 'bathroom', tags: ['浴室', '干净', 'bathroom'] },
  { id: 'base-007', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400', name: '商务大床房', type: 'room', tags: ['商务', '大床', 'room', 'business'] },
  { id: 'base-008', url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400', name: '城市夜景', type: 'view', tags: ['夜景', '城市', 'view', 'night'] },
  { id: 'base-009', url: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400', name: '健身房', type: 'facility', tags: ['健身', '设施', 'gym'] },
  { id: 'base-010', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', name: '餐厅', type: 'dining', tags: ['早餐', '餐厅', 'restaurant'] },
  { id: 'base-011', url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400', name: '家庭房', type: 'room', tags: ['家庭', '亲子', 'room', 'family'] },
  { id: 'base-012', url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400', name: '豪华套房', type: 'room', tags: ['套房', '豪华', 'room', 'suite'] },
  { id: 'base-013', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400', name: '酒店外观', type: 'view', tags: ['外观', '建筑', 'view', 'exterior'] },
  { id: 'base-014', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400', name: '会议室', type: 'facility', tags: ['会议', '商务', 'facility'] },
  { id: 'base-015', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', name: '浴室-浴缸', type: 'bathroom', tags: ['浴缸', '浴室', 'bathroom'] },
];

// ============================================
// 酒店特色图片配置 - 每个酒店的专属图片
// ============================================
export interface HotelImageConfig {
  preferredTypes: string[];
  featuredName: string;
  customImages?: Omit<HotelImage, 'hotelId' | 'uploadAt'>[];
  description?: string;
}

export const hotelImageConfigs: Record<string, HotelImageConfig> = {
  // 成都春熙路亚朵酒店
  'hotel-001': {
    preferredTypes: ['room', 'view', 'lobby', 'luxury'],
    featuredName: '春熙路景观房',
    description: '位于成都春熙路商圈，步行可达太古里',
    customImages: [
      { id: 'h1-001', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', name: '春熙路景观房', type: 'room', tags: ['room', 'view', '春熙路'], isFeatured: true },
      { id: 'h1-002', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', name: '太古里夜景', type: 'view', tags: ['view', 'night', '太古里'], isFeatured: true },
      { id: 'h1-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '亚朵大堂', type: 'facility', tags: ['大堂', '亚朵', '温馨'], isFeatured: true },
      { id: 'h1-004', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', name: '城市全景', type: 'view', tags: ['view', '城市', '全景'], isFeatured: true },
      { id: 'h1-005', url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400', name: '行政大床房', type: 'room', tags: ['room', '行政', '商务'], isFeatured: true },
      { id: 'h1-006', url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400', name: '竹居书吧', type: 'facility', tags: ['书吧', '休闲', '亚朵'], isFeatured: true },
      { id: 'h1-007', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400', name: '浴室-普兰特', type: 'bathroom', tags: ['浴室', '普兰特', '亚朵'] },
      { id: 'h1-008', url: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400', name: '健身中心', type: 'facility', tags: ['健身', '运动'] },
    ]
  },
  // 成都北站亚朵酒店
  'hotel-002': {
    preferredTypes: ['room', 'lobby', 'business'],
    featuredName: '北站商务房',
    description: '紧邻成都北站，交通便利',
    customImages: [
      { id: 'h2-001', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400', name: '商务大床房', type: 'room', tags: ['room', 'business', '商务'], isFeatured: true },
      { id: 'h2-002', url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400', name: '北站候车厅景观', type: 'view', tags: ['view', '北站', '交通'], isFeatured: true },
      { id: 'h2-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '商务大堂', type: 'facility', tags: ['大堂', '商务', '快捷'], isFeatured: true },
      { id: 'h2-004', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400', name: '双床房', type: 'room', tags: ['room', '双床', '家庭'], isFeatured: true },
      { id: 'h2-005', url: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400', name: '自助健身房', type: 'facility', tags: ['健身', '24小时'] },
      { id: 'h2-006', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', name: '相招餐厅', type: 'dining', tags: ['早餐', '相招'] },
    ]
  },
  // 绵阳亚朵酒店
  'hotel-003': {
    preferredTypes: ['room', 'cozy', 'family'],
    featuredName: '绵阳温馨房',
    description: '绵阳核心商圈，温馨舒适',
    customImages: [
      { id: 'h3-001', url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400', name: '温馨家庭房', type: 'room', tags: ['room', 'family', '亲子'], isFeatured: true },
      { id: 'h3-002', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', name: '绵阳夜景', type: 'view', tags: ['view', '绵阳', '夜景'], isFeatured: true },
      { id: 'h3-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '竹居', type: 'facility', tags: ['大堂', '书吧', '竹居'], isFeatured: true },
      { id: 'h3-004', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', name: '江景房', type: 'room', tags: ['room', '江景', 'view'], isFeatured: true },
      { id: 'h3-005', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', name: '特色早餐', type: 'dining', tags: ['早餐', '特色', '绵阳'] },
      { id: 'h3-006', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400', name: '独立卫浴', type: 'bathroom', tags: ['浴室', '干净'] },
    ]
  },
  // 德阳亚朵酒店
  'hotel-004': {
    preferredTypes: ['room', 'lobby', 'culture'],
    featuredName: '德阳文化房',
    description: '融合德阳文化特色',
    customImages: [
      { id: 'h4-001', url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400', name: '文化主题房', type: 'room', tags: ['room', '文化', '主题'], isFeatured: true },
      { id: 'h4-002', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400', name: '德阳街景', type: 'view', tags: ['view', '德阳', '街景'], isFeatured: true },
      { id: 'h4-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '文化大堂', type: 'facility', tags: ['大堂', '文化', '艺术'], isFeatured: true },
      { id: 'h4-004', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400', name: '舒适双床', type: 'room', tags: ['room', '双床', '舒适'], isFeatured: true },
      { id: 'h4-005', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', name: '本地特色早餐', type: 'dining', tags: ['早餐', '本地', '特色'] },
      { id: 'h4-006', url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400', name: '商务会议室', type: 'facility', tags: ['会议', '商务'] },
    ]
  },
  // 南充亚朵酒店
  'hotel-005': {
    preferredTypes: ['room', 'standard', 'value'],
    featuredName: '南充经济房',
    description: '性价比高，出行便利',
    customImages: [
      { id: 'h5-001', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400', name: '标准大床房', type: 'room', tags: ['room', 'standard', '经济'], isFeatured: true },
      { id: 'h5-002', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', name: '南充夜景', type: 'view', tags: ['view', '南充', '夜景'], isFeatured: true },
      { id: 'h5-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '简约大堂', type: 'facility', tags: ['大堂', '简约', '现代'], isFeatured: true },
      { id: 'h5-004', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400', name: '双床房', type: 'room', tags: ['room', '双床', '家庭'], isFeatured: true },
      { id: 'h5-005', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400', name: '整洁浴室', type: 'bathroom', tags: ['浴室', '整洁'] },
      { id: 'h5-006', url: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400', name: '自助洗衣', type: 'facility', tags: ['洗衣', '自助'] },
    ]
  },
  // 泸州亚朵酒店
  'hotel-006': {
    preferredTypes: ['room', 'restaurant', 'food'],
    featuredName: '泸州美食房',
    description: '美食之都，品味泸州',
    customImages: [
      { id: 'h6-001', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', name: '江景大床房', type: 'room', tags: ['room', '江景', 'view'], isFeatured: true },
      { id: 'h6-002', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', name: '长江夜景', type: 'view', tags: ['view', '长江', '夜景'], isFeatured: true },
      { id: 'h6-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '酒文化大堂', type: 'facility', tags: ['大堂', '酒文化', '泸州'], isFeatured: true },
      { id: 'h6-004', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', name: '特色早餐厅', type: 'dining', tags: ['早餐', '特色', '泸州美食'], isFeatured: true },
      { id: 'h6-005', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400', name: '商务双床', type: 'room', tags: ['room', '商务', '双床'] },
      { id: 'h6-006', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', name: '舒适浴室', type: 'bathroom', tags: ['浴室', '舒适'] },
    ]
  },
  // 宜宾亚朵酒店
  'hotel-007': {
    preferredTypes: ['view', 'room', 'nature'],
    featuredName: '宜宾山景房',
    description: '依山傍水，景色宜人',
    customImages: [
      { id: 'h7-001', url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400', name: '山景大床房', type: 'room', tags: ['room', '山景', 'nature'], isFeatured: true },
      { id: 'h7-002', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', name: '翠屏山景', type: 'view', tags: ['view', '翠屏山', '自然'], isFeatured: true },
      { id: 'h7-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '竹文化大堂', type: 'facility', tags: ['大堂', '竹文化', '宜宾'], isFeatured: true },
      { id: 'h7-004', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', name: '江景双床房', type: 'room', tags: ['room', '江景', '双床'], isFeatured: true },
      { id: 'h7-005', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', name: '竹海主题餐厅', type: 'dining', tags: ['餐厅', '竹海', '主题'] },
      { id: 'h7-006', url: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400', name: '休闲健身房', type: 'facility', tags: ['健身', '休闲'] },
    ]
  },
  // 自贡亚朵酒店
  'hotel-008': {
    preferredTypes: ['room', 'gym', 'lobby', 'luxury'],
    featuredName: '自贡高端房',
    description: '高端配置，品质之选',
    customImages: [
      { id: 'h8-001', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', name: '豪华大床房', type: 'room', tags: ['room', '豪华', 'luxury'], isFeatured: true },
      { id: 'h8-002', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', name: '自贡夜景', type: 'view', tags: ['view', '自贡', '夜景'], isFeatured: true },
      { id: 'h8-003', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', name: '盐文化大堂', type: 'facility', tags: ['大堂', '盐文化', '自贡'], isFeatured: true },
      { id: 'h8-004', url: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400', name: '专业健身房', type: 'facility', tags: ['健身', '专业', 'gym'], isFeatured: true },
      { id: 'h8-005', url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=400', name: '行政套房', type: 'room', tags: ['room', '套房', '行政'] },
      { id: 'h8-006', url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400', name: '会议室', type: 'facility', tags: ['会议', '商务'] },
      { id: 'h8-007', url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', name: '高端餐厅', type: 'dining', tags: ['餐厅', '高端'] },
      { id: 'h8-008', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400', name: '豪华浴室', type: 'bathroom', tags: ['浴室', '豪华'] },
    ]
  },
};

// ============================================
// 工具函数
// ============================================

/**
 * 获取酒店完整图片库（专属图片 + 根据偏好筛选的基础图片）
 */
export function getHotelImageLibrary(hotelId: string): HotelImage[] {
  const config = hotelImageConfigs[hotelId];
  const now = new Date().toISOString().split('T')[0];
  
  // 如果没有配置，返回默认6张基础图片
  if (!config) {
    return baseImagePool.slice(0, 6).map(img => ({
      ...img,
      hotelId,
      uploadAt: now,
    }));
  }
  
  // 专属图片
  const customImages: HotelImage[] = (config.customImages || []).map(img => ({
    ...img,
    hotelId,
    uploadAt: now,
  }));
  
  // 根据preferredTypes筛选基础图片
  const preferredImages = baseImagePool
    .filter(img => img.tags.some(tag => config.preferredTypes.includes(tag)))
    .map(img => ({
      ...img,
      hotelId,
      uploadAt: now,
    }));
  
  // 合并并去重
  const combined: HotelImage[] = [...customImages];
  preferredImages.forEach(img => {
    if (!combined.find(c => c.id === img.id)) {
      combined.push(img);
    }
  });
  
  // 确保至少6张
  if (combined.length < 6) {
    baseImagePool.forEach(img => {
      if (!combined.find(c => c.id === img.id) && combined.length < 6) {
        combined.push({
          ...img,
          hotelId,
          uploadAt: now,
        });
      }
    });
  }
  
  return combined.slice(0, 9); // 最多9张
}

/**
 * 获取所有酒店的图片库
 */
export function getAllHotelImages(): Record<string, HotelImage[]> {
  const result: Record<string, HotelImage[]> = {};
  
  Object.keys(hotelImageConfigs).forEach(hotelId => {
    result[hotelId] = getHotelImageLibrary(hotelId);
  });
  
  return result;
}

/**
 * 根据图片ID查找图片
 */
export function findImageById(imageId: string): HotelImage | undefined {
  // 1. 先搜索所有酒店的图片库
  for (const hotelId of Object.keys(hotelImageConfigs)) {
    const library = getHotelImageLibrary(hotelId);
    const found = library.find(img => img.id === imageId);
    if (found) return found;
  }
  
  // 2. 搜索基础图片池
  const now = new Date().toISOString().split('T')[0];
  const baseImg = baseImagePool.find(img => img.id === imageId);
  if (baseImg) {
    return {
      ...baseImg,
      hotelId: 'unknown',
      uploadAt: now,
    };
  }
  
  return undefined;
}

/**
 * 获取酒店推荐图片（用于内容生成）
 */
export function getHotelRecommendedImages(hotelId: string): string[] {
  const library = getHotelImageLibrary(hotelId);
  return library
    .filter(img => img.isFeatured)
    .slice(0, 3)
    .map(img => img.id);
}

/**
 * 获取酒店图片统计
 */
export function getHotelImageStats(hotelId: string) {
  const library = getHotelImageLibrary(hotelId);
  
  return {
    total: library.length,
    featured: library.filter(img => img.isFeatured).length,
    byType: library.reduce((acc, img) => {
      acc[img.type] = (acc[img.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

// 导出默认数据（兼容旧代码）
export const MOCK_HOTEL_IMAGES = getAllHotelImages();
