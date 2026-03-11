/**
 * Shadow-Bees V2 API 抽象层
 * 适配新的微服务后端
 * 
 * 使用方式：
 *   import { api } from '@/api';
 *   const hotels = await api.getHotels();
 * 
 * 后端架构：
 *   - Gateway (Port: 3000) - BFF层
 *   - Hotel Service (Port: 3001)
 *   - Order Service (Port: 3002)
 *   - Inventory Service (Port: 3003)
 *   - Pricing Service (Port: 3004)
 *   - Content Service (Port: 3005)
 *   - AI Service (Port: 5000)
 */

import type { Hotel, RoomType, Transaction, ContentItem, Alert } from '@/types';
import { mockAPI } from './mock';

// ===== 配置 =====
const DEFAULT_MODE = (import.meta as any).env?.VITE_USE_BACKEND === 'true' ? 'backend' : 'mock';

// 新后端地址 (Gateway BFF)
const GATEWAY_URL = (import.meta as any).env?.VITE_GATEWAY_URL || 'http://localhost:3000/api';

// 直接访问服务地址（备用）- 保留供将来使用
// @ts-ignore
const _SERVICE_URLS = {
  hotel: (import.meta as any).env?.VITE_HOTEL_SERVICE_URL || 'http://localhost:3001/api',
  order: (import.meta as any).env?.VITE_ORDER_SERVICE_URL || 'http://localhost:3002/api',
  inventory: (import.meta as any).env?.VITE_INVENTORY_SERVICE_URL || 'http://localhost:3003/api',
  pricing: (import.meta as any).env?.VITE_PRICING_SERVICE_URL || 'http://localhost:3004/api',
  content: (import.meta as any).env?.VITE_CONTENT_SERVICE_URL || 'http://localhost:3005/api',
  ai: (import.meta as any).env?.VITE_AI_SERVICE_URL || 'http://localhost:5000',
};

// ===== 类型定义 =====
export type APIMode = 'mock' | 'backend';

export interface PricingData {
  basePrice: number;
  competitorAvg: number;
  platformPrices: Record<string, { price: number; coefficient: number; riskDeposit: number }>;
  mode: 'clearance' | 'scalper' | 'dynamic';
}

export interface DashboardStats {
  totalRevenue: number;
  confirmedRevenue: number;
  totalOrders: number;
  confirmedOrders: number;
  avgPrice: number;
  occupancyRate: number;
}

// 快捷下单数据
export interface QuickOrderData {
  hotelId: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  customerName: string;
  customerPhone: string;
  platform: string;
  price: number;
  source: 'ota' | 'shadow';
}

export interface APIInterface {
  // 模式控制
  setMode: (mode: APIMode) => void;
  getMode: () => APIMode;
  
  // ===== 酒店端 BFF =====
  getTodayOverview: (hotelId: string) => Promise<any>;
  getRoomStatus: (hotelId: string, date?: string) => Promise<any>;
  getInventoryBoard: (hotelId: string, days?: number) => Promise<any>;
  getPricingPanel: (hotelId: string, roomTypeId: string) => Promise<any>;
  createQuickOrder: (data: QuickOrderData) => Promise<any>;
  getPendingOrders: (hotelId: string, limit?: number) => Promise<any>;
  
  // ===== 集团端 BFF =====
  getDailyBriefing: (groupId: string, date?: string) => Promise<any>;
  getHotelPanorama: (groupId: string, sortBy?: string) => Promise<any>;
  getHotelComparison: (groupId: string, metric?: string, period?: string) => Promise<any>;
  getChannelAnalysis: (groupId: string, period?: string) => Promise<any>;
  
  // ===== 管理端 BFF =====
  getAdminDashboard: () => Promise<any>;
  getCustomers: (page?: number, limit?: number) => Promise<any>;
  getAuditQueue: (status?: string) => Promise<any>;
  
  // ===== 基础 CRUD =====
  getHotels: () => Promise<Hotel[]>;
  getHotel: (id: string) => Promise<Hotel | null>;
  getRoomTypes: (hotelId: string) => Promise<RoomType[]>;
  getOrders: (params?: { hotelId?: string; status?: string; limit?: number }) => Promise<Transaction[]>;
  createOrder: (data: Partial<Transaction>) => Promise<Transaction>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  getPricing: (hotelId: string, roomTypeId: string) => Promise<PricingData>;
  updatePrice: (hotelId: string, roomTypeId: string, price: number, reason: string) => Promise<void>;
  getContents: (hotelId: string) => Promise<ContentItem[]>;
  publishContent: (contentId: string) => Promise<void>;
  getDashboardStats: (hotelId: string, range: string) => Promise<DashboardStats>;
  getAlerts: (hotelId: string) => Promise<Alert[]>;
  
  // ===== AI 服务 =====
  generateContent: (data: any) => Promise<any>;
  calculatePricing: (data: any) => Promise<any>;
}

// ===== 新后端 API 实现 =====
class NewBackendAPI implements APIInterface {
  private gatewayURL: string;
  private token: string | null = null;

  constructor(gatewayURL: string) {
    this.gatewayURL = gatewayURL;
  }

  private async request(endpoint: string, options: RequestInit = {}, useGateway: boolean = true) {
    const baseURL = useGateway ? this.gatewayURL : '';
    const url = `${baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  setMode(): void {}
  getMode(): APIMode { return 'backend'; }

  // ===== 酒店端 BFF =====
  async getTodayOverview(hotelId: string): Promise<any> {
    return this.request(`/bff/hotel/today-overview?hotelId=${hotelId}`);
  }

  async getRoomStatus(hotelId: string, date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split('T')[0];
    return this.request(`/bff/hotel/room-status?hotelId=${hotelId}&date=${dateParam}`);
  }

  async getInventoryBoard(hotelId: string, days: number = 14): Promise<any> {
    return this.request(`/bff/hotel/inventory-board?hotelId=${hotelId}&days=${days}`);
  }

  async getPricingPanel(hotelId: string, roomTypeId: string): Promise<any> {
    return this.request(`/bff/hotel/pricing-panel?hotelId=${hotelId}&roomTypeId=${roomTypeId}`);
  }

  async createQuickOrder(data: QuickOrderData): Promise<any> {
    return this.request('/bff/hotel/quick-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPendingOrders(hotelId: string, limit: number = 20): Promise<any> {
    return this.request(`/bff/hotel/pending-orders?hotelId=${hotelId}&limit=${limit}`);
  }

  // ===== 集团端 BFF =====
  async getDailyBriefing(groupId: string, date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split('T')[0];
    return this.request(`/bff/group/daily-briefing?groupId=${groupId}&date=${dateParam}`);
  }

  async getHotelPanorama(groupId: string, sortBy: string = 'revenue'): Promise<any> {
    return this.request(`/bff/group/hotel-panorama?groupId=${groupId}&sortBy=${sortBy}`);
  }

  async getHotelComparison(groupId: string, metric: string = 'revenue', period: string = '7d'): Promise<any> {
    return this.request(`/bff/group/hotel-comparison?groupId=${groupId}&metric=${metric}&period=${period}`);
  }

  async getChannelAnalysis(groupId: string, period: string = '30d'): Promise<any> {
    return this.request(`/bff/group/channel-analysis?groupId=${groupId}&period=${period}`);
  }

  // ===== 管理端 BFF =====
  async getAdminDashboard(): Promise<any> {
    return this.request('/bff/admin/dashboard');
  }

  async getCustomers(page: number = 1, limit: number = 20): Promise<any> {
    return this.request(`/bff/admin/customers?page=${page}&limit=${limit}`);
  }

  async getAuditQueue(status: string = 'pending'): Promise<any> {
    return this.request(`/bff/admin/content/audit-queue?status=${status}`);
  }

  // ===== 基础 CRUD（直接调用领域服务）=====
  async getHotels(): Promise<Hotel[]> {
    // 使用 Gateway 路由或直接调用 Hotel Service
    const data = await this.request('/hotels');
    return data.map(this.transformHotel);
  }

  async getHotel(id: string): Promise<Hotel | null> {
    const data = await this.request(`/hotels/${id}`);
    return data ? this.transformHotel(data) : null;
  }

  async getRoomTypes(hotelId: string): Promise<RoomType[]> {
    const data = await this.request(`/hotels/${hotelId}/room-types`);
    return data.map(this.transformRoomType);
  }

  async getOrders(params?: { hotelId?: string; status?: string; limit?: number }): Promise<Transaction[]> {
    let query = '';
    if (params?.hotelId) query += `hotelId=${params.hotelId}&`;
    if (params?.status) query += `status=${params.status}&`;
    if (params?.limit) query += `limit=${params.limit}&`;
    
    const data = await this.request(`/orders?${query}`);
    return data.map(this.transformOrder);
  }

  async createOrder(data: Partial<Transaction>): Promise<Transaction> {
    const result = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return this.transformOrder(result);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getPricing(hotelId: string, roomTypeId: string): Promise<PricingData> {
    const data = await this.request(`/pricing/${hotelId}/${roomTypeId}`);
    
    return {
      basePrice: Number(data.currentPrice || data.floorPrice),
      competitorAvg: data.competitorAvg || 0,
      platformPrices: {
        xianyu: { price: Math.round(Number(data.currentPrice) * 1.03), coefficient: 1.08, riskDeposit: 0.15 },
        xiaohongshu: { price: Math.round(Number(data.currentPrice) * 0.95), coefficient: 1.0, riskDeposit: 0.20 },
        wechat: { price: Math.round(Number(data.currentPrice) * 0.90), coefficient: 0.95, riskDeposit: 0.08 },
      },
      mode: 'dynamic',
    };
  }

  async updatePrice(hotelId: string, roomTypeId: string, price: number, reason: string): Promise<void> {
    await this.request(`/pricing/${hotelId}/${roomTypeId}/update`, {
      method: 'POST',
      body: JSON.stringify({ price, reason }),
    });
  }

  async getContents(hotelId: string): Promise<ContentItem[]> {
    const data = await this.request(`/contents?hotelId=${hotelId}`);
    return data.map(this.transformContent);
  }

  async publishContent(contentId: string): Promise<void> {
    await this.request(`/contents/${contentId}/publish`, {
      method: 'POST',
    });
  }

  async getDashboardStats(hotelId: string, _range: string): Promise<DashboardStats> {
    // 使用 BFF 接口
    const overview = await this.getTodayOverview(hotelId);
    
    return {
      totalRevenue: overview.today?.revenue || 0,
      confirmedRevenue: overview.today?.revenue || 0,
      totalOrders: overview.today?.orderCount || 0,
      confirmedOrders: overview.today?.confirmedCount || 0,
      avgPrice: overview.today?.avgPrice || 0,
      occupancyRate: overview.inventory?.occupancyRate || 0,
    };
  }

  async getAlerts(hotelId: string): Promise<Alert[]> {
    const data = await this.request(`/pricing/alerts?hotelId=${hotelId}`);
    return data.map((alert: any) => ({
      id: `alert-${alert.hotelId}-${alert.roomTypeId}`,
      level: alert.level === 'high' ? 'warning' : 'info',
      type: alert.type === 'low_inventory' ? 'inventory' : 'pricing',
      message: alert.message,
      timestamp: new Date().toISOString(),
      requiresAction: alert.level === 'high',
    }));
  }

  // ===== AI 服务 =====
  async generateContent(data: any): Promise<any> {
    return this.request('/contents/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async calculatePricing(data: any): Promise<any> {
    // 直接调用 AI Service
    return this.request('/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false); // 不使用 Gateway，直接调用 AI Service
  }

  // ===== 数据转换方法 =====
  private transformHotel(item: any): Hotel {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      tier: item.tier,
      theme: item.theme,
      location: {
        city: item.city,
        address: item.address,
        coordinates: item.coordinates,
        distanceToEvent: 0,
        monitoringRadius: 5,
      },
      defaultMode: item.defaultMode || item.default_mode,
      scriptStrategy: item.scriptStrategy || item.script_strategy,
      flexibleInventoryRate: item.flexibleInventoryRate || item.flexible_inventory_rate,
      eventTypes: [],
      priceRange: { normal: [200, 400], peak: [400, 600] },
      roomTypes: [],
    } as unknown as Hotel;
  }

  private transformRoomType(item: any): RoomType {
    return {
      id: item.id,
      name: item.name,
      floorPrice: Number(item.floorPrice || item.floor_price),
      ceilingPrice: Number(item.ceilingPrice || item.ceiling_price),
      currentPrice: Number(item.currentPrice || item.current_price),
      totalInventory: item.totalInventory || item.total_inventory,
      otaAllocation: item.otaAllocation || item.ota_allocation,
      flexibleAllocation: item.flexibleAllocation || item.flexible_allocation,
    } as RoomType;
  }

  private transformOrder(item: any): Transaction {
    return {
      id: item.id,
      orderNo: item.orderNo || item.order_no,
      hotelId: item.hotelId || item.hotel_id,
      roomType: item.roomType?.name || item.room_type_id,
      platform: item.platform,
      sourceContentId: item.sourceContentId || item.source_content_id,
      guestName: item.customerName || item.customer_name,
      checkInDate: item.checkInDate || item.check_in_date,
      checkOutDate: item.checkOutDate || item.check_out_date,
      price: Number(item.price),
      stayNights: item.nights,
      status: item.status,
      timestamp: item.createdAt || item.created_at || item.timestamp,
      financials: {
        gross: Number(item.totalAmount || item.total_amount || item.price),
        serviceFee: Number(item.platformFee || item.platform_fee || 0),
        net: Number(item.netRevenue || item.net_revenue || item.price),
      },
    } as Transaction;
  }

  private transformContent(item: any): ContentItem {
    return {
      id: item.id,
      platform: item.platform,
      title: item.title,
      content: item.content,
      price: item.price,
      status: item.status,
      performance: item.performance || {},
      createdAt: item.createdAt || item.created_at,
      publishedAt: item.publishedAt || item.published_at,
    } as ContentItem;
  }
}

// ===== API 管理器 =====
class APIManager implements APIInterface {
  private mode: APIMode = DEFAULT_MODE;
  private newBackendAPI: NewBackendAPI;

  constructor() {
    this.newBackendAPI = new NewBackendAPI(GATEWAY_URL);
    
    // 默认使用新后端
    if (DEFAULT_MODE === 'backend') {
      console.log('[API] 使用新微服务后端:', GATEWAY_URL);
    }
  }

  setMode(mode: APIMode): void {
    this.mode = mode;
    console.log(`[API] 模式切换为: ${mode}`);
  }

  getMode(): APIMode {
    return this.mode;
  }

  private getAPI(): APIInterface {
    return this.mode === 'backend' ? this.newBackendAPI : mockAPI;
  }

  // ===== BFF 代理 =====
  getTodayOverview = (hotelId: string) => this.getAPI().getTodayOverview(hotelId);
  getRoomStatus = (hotelId: string, date?: string) => this.getAPI().getRoomStatus(hotelId, date);
  getInventoryBoard = (hotelId: string, days?: number) => this.getAPI().getInventoryBoard(hotelId, days);
  getPricingPanel = (hotelId: string, roomTypeId: string) => this.getAPI().getPricingPanel(hotelId, roomTypeId);
  createQuickOrder = (data: QuickOrderData) => this.getAPI().createQuickOrder(data);
  getPendingOrders = (hotelId: string, limit?: number) => this.getAPI().getPendingOrders(hotelId, limit);
  
  getDailyBriefing = (groupId: string, date?: string) => this.getAPI().getDailyBriefing(groupId, date);
  getHotelPanorama = (groupId: string, sortBy?: string) => this.getAPI().getHotelPanorama(groupId, sortBy);
  getHotelComparison = (groupId: string, metric?: string, period?: string) => this.getAPI().getHotelComparison(groupId, metric, period);
  getChannelAnalysis = (groupId: string, period?: string) => this.getAPI().getChannelAnalysis(groupId, period);
  
  getAdminDashboard = () => this.getAPI().getAdminDashboard();
  getCustomers = (page?: number, limit?: number) => this.getAPI().getCustomers(page, limit);
  getAuditQueue = (status?: string) => this.getAPI().getAuditQueue(status);
  
  // ===== 基础 CRUD 代理 =====
  getHotels = () => this.getAPI().getHotels();
  getHotel = (id: string) => this.getAPI().getHotel(id);
  getRoomTypes = (hotelId: string) => this.getAPI().getRoomTypes(hotelId);
  getOrders = (params?: any) => this.getAPI().getOrders(params);
  createOrder = (data: any) => this.getAPI().createOrder(data);
  updateOrderStatus = (orderId: string, status: string) => this.getAPI().updateOrderStatus(orderId, status);
  getPricing = (hotelId: string, roomTypeId: string) => this.getAPI().getPricing(hotelId, roomTypeId);
  updatePrice = (hotelId: string, roomTypeId: string, price: number, reason: string) => 
    this.getAPI().updatePrice(hotelId, roomTypeId, price, reason);
  getContents = (hotelId: string) => this.getAPI().getContents(hotelId);
  publishContent = (contentId: string) => this.getAPI().publishContent(contentId);
  getDashboardStats = (hotelId: string, range: string) => this.getAPI().getDashboardStats(hotelId, range);
  getAlerts = (hotelId: string) => this.getAPI().getAlerts(hotelId);
  
  // ===== AI 代理 =====
  generateContent = (data: any) => this.getAPI().generateContent(data);
  calculatePricing = (data: any) => this.getAPI().calculatePricing(data);
}

// ===== 导出单例 =====
export const api = new APIManager();

// 开发环境暴露到全局，方便调试
if ((import.meta as any).env?.DEV) {
  (window as any).api = api;
  console.log('[API] api 对象已挂载到 window.api，可在控制台调试');
}
