/**
 * 华美会PMS API对接层
 * 读取酒店数据、库存、订单，写入AI建议
 * 
 * 对接文档参考: /docs/PMS_INTEGRATION.md
 */

import type { OrderStatus } from '@/types';

// PMS API 基础配置
const PMS_BASE_URL = import.meta.env.VITE_PMS_API_URL || 'https://rmsebk.huameihuihotel.com/api';
const PMS_API_KEY = import.meta.env.VITE_PMS_API_KEY;

// 请求拦截器
async function pmsFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${PMS_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': PMS_API_KEY || '',
      'Authorization': `Bearer ${localStorage.getItem('pms_token') || ''}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `PMS API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// 酒店数据
// ============================================

export interface PMSHotel {
  hotelId: string;
  hotelName: string;
  hotelCode: string;
  city: string;
  address: string;
  starRating: number;
  roomCount: number;
  contactPhone: string;
  status: 'active' | 'inactive';
  brand?: string;
  region?: string;
  // 房型信息
  roomTypes?: PMSRoomType[];
}

export interface PMSRoomType {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  basePrice: number;
  totalRooms: number;
  maxOccupancy: number;
  amenities: string[];
}

/**
 * 获取华美会旗下所有酒店列表
 * GET /api/v1/hotels
 */
export async function fetchPMSHotels(): Promise<PMSHotel[]> {
  // TODO: 实际对接华美会API
  // return pmsFetch<PMSHotel[]>('/v1/hotels');
  
  // Mock数据：模拟1000家酒店
  return new Promise((resolve) => {
    setTimeout(() => {
      const cities = ['北京', '上海', '广州', '深圳', '成都', '杭州', '武汉', '西安', '南京', '重庆'];
      const brands = ['华美会', '华美达', '假日', '万怡'];
      
      const hotels: PMSHotel[] = Array.from({ length: 50 }, (_, i) => {
        const city = cities[Math.floor(Math.random() * cities.length)];
        const brand = brands[Math.floor(Math.random() * brands.length)];
        return {
          hotelId: `HM${String(i + 1).padStart(4, '0')}`,
          hotelName: `${city}${brand}${['旗舰店', '商务店', '机场店', '市中心店'][i % 4]}`,
          hotelCode: `HM${String(i + 1).padStart(4, '0')}`,
          city,
          address: `${city}市${['朝阳区', '海淀区', '天河区', '福田区'][i % 4]}路${i + 1}号`,
          starRating: [3, 4, 5][i % 3],
          roomCount: 80 + Math.floor(Math.random() * 120),
          contactPhone: `400-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          status: Math.random() > 0.1 ? 'active' : 'inactive',
          brand,
          region: ['华北', '华东', '华南', '西南'][i % 4],
          roomTypes: [
            { roomTypeId: `RT${i}_1`, roomTypeName: '大床房', roomTypeCode: 'KING', basePrice: 399, totalRooms: 50, maxOccupancy: 2, amenities: ['wifi', 'tv', 'ac'] },
            { roomTypeId: `RT${i}_2`, roomTypeName: '双床房', roomTypeCode: 'TWIN', basePrice: 429, totalRooms: 40, maxOccupancy: 2, amenities: ['wifi', 'tv', 'ac'] },
            { roomTypeId: `RT${i}_3`, roomTypeName: '套房', roomTypeCode: 'SUITE', basePrice: 899, totalRooms: 10, maxOccupancy: 4, amenities: ['wifi', 'tv', 'ac', 'living_room'] },
          ],
        };
      });
      resolve(hotels);
    }, 500);
  });
}

/**
 * 获取单个酒店详情
 * GET /api/v1/hotels/:hotelId
 */
export async function fetchPMSHotelDetail(hotelId: string): Promise<PMSHotel> {
  return pmsFetch<PMSHotel>(`/v1/hotels/${hotelId}`);
}

// ============================================
// 库存数据
// ============================================

export interface PMSInventory {
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  totalRooms: number;
  soldRooms: number;
  availableRooms: number;
  maintenanceRooms: number;  // 维修房数
  price: number;
  floorPrice?: number;       // 底价
  ceilingPrice?: number;     // 天花板价
}

export interface BatchInventoryRequest {
  hotelIds: string[];
  startDate: string;
  endDate: string;
  roomTypeIds?: string[];
}

/**
 * 批量获取酒店库存
 * POST /api/v1/inventory/batch
 */
export async function fetchPMSInventoryBatch(
  hotelIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, PMSInventory[]>> {
  // TODO: 实际对接
  // return pmsFetch<Record<string, PMSInventory[]>>('/v1/inventory/batch', {
  //   method: 'POST',
  //   body: JSON.stringify({ hotelIds, startDate, endDate }),
  // });
  
  // Mock数据
  return new Promise((resolve) => {
    setTimeout(() => {
      const result: Record<string, PMSInventory[]> = {};
      
      hotelIds.forEach(hotelId => {
        const roomTypes = ['大床房', '双床房', '套房', '家庭房'];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        result[hotelId] = [];
        
        for (let d = 0; d < days; d++) {
          const date = new Date(start);
          date.setDate(date.getDate() + d);
          
          roomTypes.forEach((roomTypeName, rtIdx) => {
            const total = 20 + Math.floor(Math.random() * 30);
            const maintenance = Math.random() > 0.9 ? Math.floor(Math.random() * 3) : 0;
            const sold = Math.floor(Math.random() * (total - maintenance) * 0.8);
            
            result[hotelId].push({
              hotelId,
              roomTypeId: `RT${rtIdx + 1}`,
              roomTypeName,
              date: date.toISOString().split('T')[0],
              totalRooms: total,
              soldRooms: sold,
              availableRooms: total - sold - maintenance,
              maintenanceRooms: maintenance,
              price: 300 + Math.floor(Math.random() * 500),
              floorPrice: 200 + Math.floor(Math.random() * 200),
              ceilingPrice: 800 + Math.floor(Math.random() * 1000),
            });
          });
        }
      });
      
      resolve(result);
    }, 800);
  });
}

/**
 * 更新库存（关房/开房/维修）
 * POST /api/v1/hotels/:hotelId/inventory/update
 */
export async function updatePMSInventory(
  hotelId: string,
  updates: {
    date: string;
    roomTypeId: string;
    availableRooms?: number;
    maintenanceRooms?: number;
    reason?: string;
  }[]
): Promise<void> {
  return pmsFetch<void>(`/v1/hotels/${hotelId}/inventory/update`, {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}

/**
 * 批量更新库存
 * POST /api/v1/inventory/batch-update
 */
export async function batchUpdatePMSInventory(
  hotelIds: string[],
  updates: {
    date: string;
    roomTypeId: string;
    availableRooms?: number;
    maintenanceRooms?: number;
  }[]
): Promise<{
  success: string[];
  failed: { hotelId: string; error: string }[];
}> {
  return pmsFetch('/v1/inventory/batch-update', {
    method: 'POST',
    body: JSON.stringify({ hotelIds, updates }),
  });
}

// ============================================
// 价格数据
// ============================================

export interface PMSPrice {
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  currentPrice: number;
  floorPrice: number;
  ceilingPrice: number;
  suggestedPrice?: number;  // AI建议价格
  lastModifiedAt: string;
  lastModifiedBy: string;
}

/**
 * 获取酒店价格日历
 * GET /api/v1/hotels/:hotelId/prices
 */
export async function fetchPMSPrices(
  hotelId: string,
  params?: { startDate?: string; endDate?: string; roomTypeId?: string }
): Promise<PMSPrice[]> {
  return pmsFetch<PMSPrice[]>(`/v1/hotels/${hotelId}/prices?${new URLSearchParams(params)}`);
}

/**
 * 批量获取价格
 * POST /api/v1/prices/batch
 */
export async function fetchPMSPricesBatch(
  hotelIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, PMSPrice[]>> {
  return pmsFetch('/v1/prices/batch', {
    method: 'POST',
    body: JSON.stringify({ hotelIds, startDate, endDate }),
  });
}

/**
 * 更新价格
 * POST /api/v1/hotels/:hotelId/prices/update
 */
export async function updatePMSPrice(
  hotelId: string,
  updates: {
    date: string;
    roomTypeId: string;
    newPrice: number;
    source: 'shadow-bees';
    operatorId: string;
  }[]
): Promise<void> {
  return pmsFetch<void>(`/v1/hotels/${hotelId}/prices/update`, {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}

/**
 * 批量调价
 * POST /api/v1/prices/batch-update
 */
export async function batchUpdatePMSPrices(
  hotelIds: string[],
  adjustment: {
    type: 'fixed' | 'percentage';
    value: number;  // 固定值或百分比
    roomTypeIds?: string[];
    dateRange: { start: string; end: string };
  }
): Promise<{
  success: string[];
  failed: { hotelId: string; error: string }[];
  details: { hotelId: string; oldPrice: number; newPrice: number }[];
}> {
  return pmsFetch('/v1/prices/batch-update', {
    method: 'POST',
    body: JSON.stringify({ hotelIds, adjustment }),
  });
}

// ============================================
// 订单数据
// ============================================

export interface PMSOrder {
  orderId: string;
  hotelId: string;
  hotelName: string;
  platform: 'xianyu' | 'xiaohongshu' | 'wechat' | 'ota' | 'direct';
  platformOrderId: string;
  guestName: string;
  guestPhone: string;
  roomType: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomCount: number;
  totalAmount: number;
  paidAmount: number;
  unitPrice: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partial_refunded';
  createdAt: string;
  verificationCode?: string;
  channelAccount?: string;
  // 入住信息
  checkInTime?: string;
  checkOutTime?: string;
  roomNumbers?: string[];
  // 退款信息
  refundAmount?: number;
  refundReason?: string;
}

export interface OrderFilters {
  startDate?: string;
  endDate?: string;
  platforms?: string[];
  statuses?: OrderStatus[];
  hotelIds?: string[];
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 获取订单列表
 * GET /api/v1/orders
 */
export async function fetchPMSOrders(
  filters: OrderFilters = {}
): Promise<{
  orders: PMSOrder[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      query.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
  });
  
  return pmsFetch(`/v1/orders?${query}`);
}

/**
 * 批量获取订单
 * POST /api/v1/orders/batch
 */
export async function fetchPMSOrdersBatch(
  hotelIds: string[],
  _filters?: {
    startDate?: string;
    endDate?: string;
    platforms?: string[];
    status?: OrderStatus[];
    page?: number;
    pageSize?: number;
  }
): Promise<{
  orders: PMSOrder[];
  total: number;
  byHotel: Record<string, { orders: PMSOrder[]; total: number }>;
}> {
  // Mock数据
  return new Promise((resolve) => {
    setTimeout(() => {
      const platforms: ('xianyu' | 'xiaohongshu' | 'wechat' | 'ota' | 'direct')[] = ['xianyu', 'xiaohongshu', 'wechat', 'ota', 'direct'];
      const statuses: OrderStatus[] = ['pending', 'paid', 'checked_in', 'checked_out', 'cancelled'];
      const roomTypes = ['大床房', '双床房', '套房'];
      
      const orders: PMSOrder[] = [];
      const byHotel: Record<string, { orders: PMSOrder[]; total: number }> = {};
      
      hotelIds.forEach(hotelId => {
        byHotel[hotelId] = { orders: [], total: 0 };
      });
      
      Array.from({ length: 50 }, (_, i) => {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const hotelId = hotelIds[Math.floor(Math.random() * hotelIds.length)];
        const nights = 1 + Math.floor(Math.random() * 3);
        const unitPrice = 300 + Math.floor(Math.random() * 500);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const order: PMSOrder = {
          orderId: `SB${Date.now()}${i}`,
          hotelId,
          hotelName: `华美会${hotelId}酒店`,
          platform,
          platformOrderId: `${platform.toUpperCase()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          guestName: `客人${i + 1}`,
          guestPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
          roomType: roomTypes[Math.floor(Math.random() * roomTypes.length)],
          roomTypeId: `RT${Math.floor(Math.random() * 3) + 1}`,
          checkInDate: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          checkOutDate: new Date(Date.now() + (Math.floor(Math.random() * 30) + nights) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          nights,
          roomCount: 1,
          totalAmount: unitPrice * nights,
          paidAmount: unitPrice * nights,
          unitPrice,
          status,
          paymentStatus: status === 'cancelled' ? 'refunded' : Math.random() > 0.2 ? 'paid' : 'pending',
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
          verificationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        };
        
        orders.push(order);
        byHotel[hotelId].orders.push(order);
        byHotel[hotelId].total++;
      });
      
      resolve({ orders, total: 1000, byHotel });
    }, 600);
  });
}

/**
 * 获取订单详情
 * GET /api/v1/orders/:orderId
 */
export async function fetchPMSOrderDetail(orderId: string): Promise<PMSOrder> {
  return pmsFetch<PMSOrder>(`/v1/orders/${orderId}`);
}

/**
 * 确认订单
 * POST /api/v1/orders/:orderId/confirm
 */
export async function confirmPMSOrder(
  orderId: string,
  operatorId: string
): Promise<void> {
  return pmsFetch<void>(`/v1/orders/${orderId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ operatorId }),
  });
}

/**
 * 取消订单
 * POST /api/v1/orders/:orderId/cancel
 */
export async function cancelPMSOrder(
  orderId: string,
  reason: string,
  operatorId: string
): Promise<void> {
  return pmsFetch<void>(`/v1/orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, operatorId }),
  });
}

/**
 * 办理入住
 * POST /api/v1/orders/:orderId/checkin
 */
export async function checkinPMSOrder(
  orderId: string,
  roomNumbers: string[],
  operatorId: string
): Promise<void> {
  return pmsFetch<void>(`/v1/orders/${orderId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ roomNumbers, operatorId }),
  });
}

/**
 * 办理退房
 * POST /api/v1/orders/:orderId/checkout
 */
export async function checkoutPMSOrder(
  orderId: string,
  operatorId: string
): Promise<void> {
  return pmsFetch<void>(`/v1/orders/${orderId}/checkout`, {
    method: 'POST',
    body: JSON.stringify({ operatorId }),
  });
}

// ============================================
// 经营数据
// ============================================

export interface HotelMetrics {
  hotelId: string;
  hotelName: string;
  date: string;
  // 营收指标
  revenue: number;
  roomRevenue: number;
  otherRevenue: number;
  // 订单指标
  totalOrders: number;
  roomNights: number;
  // 入住指标
  occupancyRate: number;  // 入住率
  adr: number;            // 平均房价
  revPAR: number;         // 每间可售房收入
  // 渠道分布
  channelDistribution: {
    ota: number;
    direct: number;
    xianyu: number;
    xiaohongshu: number;
    wechat: number;
  };
}

/**
 * 获取经营数据
 * POST /api/v1/metrics/batch
 */
export async function fetchPMSMetricsBatch(
  hotelIds: string[],
  dateRange: { start: string; end: string }
): Promise<Record<string, HotelMetrics[]>> {
  return pmsFetch('/v1/metrics/batch', {
    method: 'POST',
    body: JSON.stringify({ hotelIds, dateRange }),
  });
}

// ============================================
// Webhook 事件处理
// ============================================

export type PMSEventType = 
  | 'order.created'
  | 'order.confirmed'
  | 'order.cancelled'
  | 'order.checkin'
  | 'order.checkout'
  | 'inventory.changed'
  | 'price.changed'
  | 'hotel.updated';

export interface PMSEvent {
  eventType: PMSEventType;
  hotelId: string;
  timestamp: string;
  data: unknown;
  signature: string;  // 签名验证
}

/**
 * Webhook处理器注册表
 */
class WebhookHandlerRegistry {
  private handlers: Map<PMSEventType, ((event: PMSEvent) => void)[]> = new Map();

  on(eventType: PMSEventType, handler: (event: PMSEvent) => void): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    
    // 返回取消订阅函数
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  emit(event: PMSEvent): void {
    const handlers = this.handlers.get(event.eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Webhook handler error for ${event.eventType}:`, error);
        }
      });
    }
  }
}

export const webhookRegistry = new WebhookHandlerRegistry();

/**
 * 验证Webhook签名
 */
export function verifyWebhookSignature(
  _payload: string,
  _signature: string,
  _secret: string
): boolean {
  // TODO: 实现HMAC-SHA256签名验证
  // const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  // return signature === expected;
  return true; // Mock实现
}

/**
 * 处理Webhook事件
 */
export function handleWebhookEvent(event: PMSEvent): void {
  console.log('[PMS Webhook]', event.eventType, event);
  webhookRegistry.emit(event);
}

// ============================================
// 连接状态管理
// ============================================

interface PMSConnectionState {
  isConnected: boolean;
  lastPingAt: number;
  reconnectAttempts: number;
}

let connectionState: PMSConnectionState = {
  isConnected: false,
  lastPingAt: 0,
  reconnectAttempts: 0,
};

/**
 * 检查PMS连接状态
 */
export async function checkPMSConnection(): Promise<boolean> {
  try {
    await pmsFetch('/v1/health');
    connectionState.isConnected = true;
    connectionState.lastPingAt = Date.now();
    connectionState.reconnectAttempts = 0;
    return true;
  } catch {
    connectionState.isConnected = false;
    connectionState.reconnectAttempts++;
    return false;
  }
}

/**
 * 获取连接状态
 */
export function getPMSConnectionState(): PMSConnectionState {
  return { ...connectionState };
}
