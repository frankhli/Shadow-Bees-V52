/**
 * 数据仓库对齐服务 - Phase 4 核心功能
 * 集团特征工程、跨门店学习、相似度计算
 * 注：这些功能主要为算法提供数据支持，不是直接给用户看的
 */

import type { Customer, HotelData } from '../stores/adminStore';

// ============================================
// 特征工程类型定义
// ============================================

// 集团特征标签
export interface GroupFeatures {
  groupId: string;
  groupName: string;
  // 规模特征
  scale: {
    hotelCount: number;           // 门店数量
    totalRooms: number;           // 总房间数
    regionCount: number;          // 区域数量
  };
  // 经营特征
  business: {
    avgRevenuePerHotel: number;   // 单店平均营收
    totalRevenue: number;         // 总营收
    revenueStdDev: number;        // 营收标准差（衡量门店差异）
    avgOccupancy: number;         // 平均入住率
  };
  // AI采用特征
  aiAdoption: {
    pricingAdoptionRate: number;  // 定价采用率
    contentAdoptionRate: number;  // 内容采用率
    serviceAdoptionRate: number;  // 客服采用率
    overallAdoptionRate: number;  // 总体采用率
  };
  // 策略特征
  strategy: {
    hasMinPriceRule: boolean;     // 是否有最低价格规则
    hasMaxDiscountRule: boolean;  // 是否有最大折扣规则
    hasInventoryReserve: boolean; // 是否有库存保留规则
  };
  // 标签（用于模型训练）
  tags: string[];
  // 向量表示（用于相似度计算）
  embedding: number[];
}

// 门店特征标签
export interface HotelFeatures {
  hotelId: string;
  hotelName: string;
  groupId?: string;
  isGroupMember: boolean;
  
  // 基础特征
  basic: {
    city: string;
    tier: string;
    roomCount: number;
    hasCompetitors: boolean;
  };
  
  // 经营特征（标准化）
  business: {
    revenuePercentile: number;    // 营收百分位
    occupancyPercentile: number;  // 入住率百分位
    priceIndex: number;           // 价格指数（相对竞品）
  };
  
  // AI采用特征
  aiAdoption: {
    pricing: boolean;
    content: boolean;
    service: boolean;
    score: number;                // 0-3
  };
  
  // 向量表示
  embedding: number[];
}

// ============================================
// 特征工程
// ============================================

/**
 * 生成集团特征向量
 */
export function generateGroupFeatures(customer: Customer): GroupFeatures {
  const hotels = customer.hotels;
  const totalRooms = hotels.reduce((sum, h) => 
    sum + h.roomTypes.reduce((rs, rt) => rs + rt.totalInventory, 0), 0);
  
  const revenues = hotels.map(h => h.todayRevenue);
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / hotels.length;
  const revenueStdDev = Math.sqrt(
    revenues.reduce((sq, n) => sq + Math.pow(n - avgRevenue, 2), 0) / hotels.length
  );
  
  const occupancies = hotels.map(h => h.occupancyRate);
  const avgOccupancy = occupancies.reduce((a, b) => a + b, 0) / hotels.length;
  
  // AI采用统计
  const aiPricing = hotels.filter(h => h.aiAdoption?.pricing).length;
  const aiContent = hotels.filter(h => h.aiAdoption?.content).length;
  const aiService = hotels.filter(h => h.aiAdoption?.service).length;
  
  const features: GroupFeatures = {
    groupId: customer.id,
    groupName: customer.companyName,
    scale: {
      hotelCount: hotels.length,
      totalRooms,
      regionCount: customer.groupProfile?.regionCount || 1,
    },
    business: {
      avgRevenuePerHotel: Math.round(avgRevenue),
      totalRevenue: revenues.reduce((a, b) => a + b, 0),
      revenueStdDev: Math.round(revenueStdDev),
      avgOccupancy: Math.round(avgOccupancy),
    },
    aiAdoption: {
      pricingAdoptionRate: Math.round((aiPricing / hotels.length) * 100),
      contentAdoptionRate: Math.round((aiContent / hotels.length) * 100),
      serviceAdoptionRate: Math.round((aiService / hotels.length) * 100),
      overallAdoptionRate: Math.round(((aiPricing + aiContent + aiService) / (hotels.length * 3)) * 100),
    },
    strategy: {
      hasMinPriceRule: !!customer.groupProfile,
      hasMaxDiscountRule: !!customer.groupProfile,
      hasInventoryReserve: !!customer.groupProfile,
    },
    tags: generateGroupTags(customer, hotels.length),
    embedding: [], // 由模型生成
  };
  
  // 生成特征向量（简化版，实际应由模型生成）
  features.embedding = generateGroupEmbedding(features);
  
  return features;
}

/**
 * 生成集团标签
 */
function generateGroupTags(customer: Customer, hotelCount: number): string[] {
  const tags: string[] = [];
  
  // 规模标签
  if (hotelCount >= 10) tags.push('大型集团');
  else if (hotelCount >= 5) tags.push('中型集团');
  else tags.push('小型集团');
  
  // 区域标签
  if (customer.groupProfile?.regionCount && customer.groupProfile.regionCount > 1) {
    tags.push('多区域');
  }
  
  // AI成熟度标签
  const aiScore = customer.hotels.reduce((sum, h) => 
    sum + (h.aiAdoption?.pricing ? 1 : 0) + (h.aiAdoption?.content ? 1 : 0) + (h.aiAdoption?.service ? 1 : 0), 0);
  const aiRate = aiScore / (customer.hotels.length * 3);
  
  if (aiRate >= 0.7) tags.push('AI成熟');
  else if (aiRate >= 0.4) tags.push('AI成长中');
  else tags.push('AI起步');
  
  return tags;
}

/**
 * 生成集团特征向量（简化版）
 */
function generateGroupEmbedding(features: GroupFeatures): number[] {
  // 将特征归一化到向量空间
  // 实际应用中，这应该由训练好的模型生成
  return [
    features.scale.hotelCount / 100,              // 门店数量（归一化）
    features.scale.totalRooms / 1000,             // 总房间数
    features.business.avgRevenuePerHotel / 10000, // 平均营收
    features.business.avgOccupancy / 100,         // 平均入住率
    features.aiAdoption.overallAdoptionRate / 100, // AI采用率
    features.strategy.hasMinPriceRule ? 1 : 0,    // 策略特征
    features.strategy.hasMaxDiscountRule ? 1 : 0,
    features.strategy.hasInventoryReserve ? 1 : 0,
  ];
}

/**
 * 生成门店特征向量
 */
export function generateHotelFeatures(hotel: HotelData, customer?: Customer): HotelFeatures {
  const roomCount = hotel.roomTypes.reduce((sum, rt) => sum + rt.totalInventory, 0);
  
  const features: HotelFeatures = {
    hotelId: hotel.id,
    hotelName: hotel.name,
    groupId: customer?.id,
    isGroupMember: !!customer,
    basic: {
      city: hotel.city,
      tier: hotel.tier,
      roomCount,
      hasCompetitors: hotel.competitorAvgPrice > 0,
    },
    business: {
      revenuePercentile: 0, // 需要全局数据计算
      occupancyPercentile: 0,
      priceIndex: hotel.competitorAvgPrice > 0 
        ? hotel.roomTypes[0]?.currentPrice / hotel.competitorAvgPrice 
        : 1,
    },
    aiAdoption: {
      pricing: hotel.aiAdoption?.pricing || false,
      content: hotel.aiAdoption?.content || false,
      service: hotel.aiAdoption?.service || false,
      score: (hotel.aiAdoption?.pricing ? 1 : 0) + 
             (hotel.aiAdoption?.content ? 1 : 0) + 
             (hotel.aiAdoption?.service ? 1 : 0),
    },
    embedding: [],
  };
  
  features.embedding = generateHotelEmbedding(features);
  return features;
}

/**
 * 生成门店特征向量
 */
function generateHotelEmbedding(features: HotelFeatures): number[] {
  const tierMap: Record<string, number> = { economy: 0.3, comfort: 0.6, premium: 1 };
  
  return [
    tierMap[features.basic.tier] || 0.5,
    features.basic.roomCount / 100,
    features.basic.hasCompetitors ? 1 : 0,
    features.business.priceIndex,
    features.aiAdoption.score / 3,
    features.isGroupMember ? 1 : 0,
  ];
}

// ============================================
// 相似度计算
// ============================================

/**
 * 计算两个向量的余弦相似度
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 计算集团相似度
 */
export function calculateGroupSimilarity(a: GroupFeatures, b: GroupFeatures): number {
  return cosineSimilarity(a.embedding, b.embedding);
}

/**
 * 计算门店相似度
 */
export function calculateHotelSimilarity(a: HotelFeatures, b: HotelFeatures): number {
  return cosineSimilarity(a.embedding, b.embedding);
}

/**
 * 在集团内寻找相似门店
 * 用于冷启动推荐
 */
export function findSimilarHotelsInGroup(
  targetHotel: HotelData,
  customer: Customer,
  topK: number = 3
): Array<{ hotel: HotelData; similarity: number }> {
  const targetFeatures = generateHotelFeatures(targetHotel, customer);
  
  const similarities = customer.hotels
    .filter(h => h.id !== targetHotel.id)
    .map(h => {
      const features = generateHotelFeatures(h, customer);
      return {
        hotel: h,
        similarity: calculateHotelSimilarity(targetFeatures, features),
      };
    });
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * 寻找相似集团
 * 用于模型训练和案例推荐
 */
export function findSimilarGroups(
  targetCustomer: Customer,
  allCustomers: Customer[],
  topK: number = 5
): Array<{ customer: Customer; similarity: number }> {
  const targetFeatures = generateGroupFeatures(targetCustomer);
  
  const similarities = allCustomers
    .filter(c => c.id !== targetCustomer.id && c.type === 'group')
    .map(c => {
      const features = generateGroupFeatures(c);
      return {
        customer: c,
        similarity: calculateGroupSimilarity(targetFeatures, features),
      };
    });
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ============================================
// 冷启动支持
// ============================================

/**
 * 为新门店生成冷启动推荐
 * 基于集团内相似门店的历史数据
 */
export function generateColdStartRecommendations(
  newHotel: HotelData,
  customer: Customer
): {
  pricing: { suggestedPrice: number; confidence: number };
  inventory: { suggestedAllocation: number; confidence: number };
  content: { suggestedPlatforms: string[]; confidence: number };
} {
  const similarHotels = findSimilarHotelsInGroup(newHotel, customer, 3);
  
  if (similarHotels.length === 0) {
    return {
      pricing: { suggestedPrice: newHotel.roomTypes[0]?.floorPrice || 100, confidence: 0.3 },
      inventory: { suggestedAllocation: 0.5, confidence: 0.3 },
      content: { suggestedPlatforms: ['xianyu', 'xiaohongshu'], confidence: 0.3 },
    };
  }
  
  // 加权平均相似门店的价格
  const totalWeight = similarHotels.reduce((sum, h) => sum + h.similarity, 0);
  const avgPrice = similarHotels.reduce((sum, h) => 
    sum + h.hotel.roomTypes[0]?.currentPrice * h.similarity, 0) / totalWeight;
  
  // 平均库存分配
  const avgInventory = similarHotels.reduce((sum, h) => {
    const inventory = h.hotel.inventory;
    const ratio = inventory.flexible.total / (inventory.ota.total + inventory.flexible.total);
    return sum + ratio * h.similarity;
  }, 0) / totalWeight;
  
  // 平均置信度
  const avgConfidence = similarHotels.reduce((sum, h) => sum + h.similarity, 0) / similarHotels.length;
  
  return {
    pricing: { suggestedPrice: Math.round(avgPrice), confidence: avgConfidence },
    inventory: { suggestedAllocation: avgInventory, confidence: avgConfidence },
    content: { suggestedPlatforms: ['xianyu', 'xiaohongshu'], confidence: avgConfidence },
  };
}

// ============================================
// 数据导出（供算法使用）
// ============================================

/**
 * 导出集团特征数据集
 * 用于模型训练
 */
export function exportGroupFeatures(customers: Customer[]): GroupFeatures[] {
  return customers
    .filter(c => c.type === 'group')
    .map(c => generateGroupFeatures(c));
}

/**
 * 导出门店特征数据集
 */
export function exportHotelFeatures(
  customers: Customer[]
): Array<HotelFeatures & { groupId?: string }> {
  const features: Array<HotelFeatures & { groupId?: string }> = [];
  
  for (const customer of customers) {
    for (const hotel of customer.hotels) {
      const hotelFeatures = generateHotelFeatures(hotel, customer);
      features.push({
        ...hotelFeatures,
        groupId: customer.type === 'group' ? customer.id : undefined,
      });
    }
  }
  
  return features;
}

/**
 * 导出相似度矩阵（集团间）
 */
export function exportGroupSimilarityMatrix(
  customers: Customer[]
): Array<{ groupA: string; groupB: string; similarity: number }> {
  const groups = customers.filter(c => c.type === 'group');
  const matrix: Array<{ groupA: string; groupB: string; similarity: number }> = [];
  
  for (let i = 0; i < groups.length; i++) {
    const featuresA = generateGroupFeatures(groups[i]);
    for (let j = i + 1; j < groups.length; j++) {
      const featuresB = generateGroupFeatures(groups[j]);
      matrix.push({
        groupA: groups[i].id,
        groupB: groups[j].id,
        similarity: calculateGroupSimilarity(featuresA, featuresB),
      });
    }
  }
  
  return matrix;
}
