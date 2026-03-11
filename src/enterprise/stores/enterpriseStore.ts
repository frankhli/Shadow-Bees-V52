/**
 * Enterprise Store - 使用API层
 * 
 * 架构变更：
 * 1. 所有数据操作通过API层
 * 2. API层目前是mock实现，后续替换为真实API即可
 * 3. 添加了数据联动机制（事件监听）
 * 4. 添加了数据勾稽验证
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { produce, enableMapSet } from 'immer';

// 启用Map和Set的支持
enableMapSet();
import type {
  Hotel,
  HotelMetrics,
  Order,
  NonStandardOrder,
  Channel,
  Account,
  AIInsight,
  ContentItem,
  Ticket,
  DashboardSummary,
  DashboardTrend,
} from '../api/types';
import { MOCK_NON_STANDARD_ORDERS } from '../api/mockData';
import { hotelApi, pricingApi, inventoryApi, orderApi, dashboardApi, contentApi, ticketApi } from '../api';
import { logger } from '../utils/logger';

// ==================== 类型定义 ====================

export interface EnterpriseHotel extends Hotel {
  isSelected?: boolean;
}

export interface EnterpriseAccount extends Account {
  assignedHotels?: string[];
}

// ==================== 渠道配置类型（按酒店）====================

export interface HotelChannelConfig {
  hotelId: string;
  enabledChannels: string[];  // 该酒店启用的渠道ID列表
  channelSettings: Record<string, ChannelSettings>;
}

export interface ChannelSettings {
  quota: number;                    // 渠道配额
  pricingStrategy: 'same' | 'premium' | 'discount';
  pricingAdjustment: number;        // 调价幅度（百分比或固定值）
  apiConnected: boolean;            // 是否已对接华美会API
  apiStatus?: 'connected' | 'disconnected' | 'error';
}

// ==================== 实时推演类型 ====================

export interface RealtimeSimulationState {
  isRunning: boolean;
  lastTransactionTime: number;
  todayStats: {
    totalOrders: number;
    totalGMV: number;
    roomNights: number;
  };
  generatedOrders: string[];  // 推演生成的订单ID列表
}

// ==================== 渠道配额类型（90天）====================

export interface ChannelQuota {
  channelId: string;
  allocated: number;      // 已分配给该渠道的配额
  sold: number;           // 该渠道已售出
  remaining: number;      // 该渠道剩余可售
}

export interface RoomTypeQuota {
  roomTypeId: string;
  roomTypeName: string;
  pmsTotal: number;       // PMS总库存（只读）
  pmsSold: number;        // PMS已售（包含所有渠道）
  pmsAvailable: number;   // PMS剩余可用
  channels: ChannelQuota[];
  reservedForPMS: number; // 保留给PMS直销的库存
}

export interface DailyQuota {
  date: string;
  roomTypes: RoomTypeQuota[];
}

export interface BatchOperation {
  id: string;
  type: 'pricing' | 'inventory' | 'content';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalHotels: number;
  completedHotels: number;
  results: { hotelId: string; success: boolean; message?: string }[];
  createdAt: string;
}

// ==================== 智能预警类型 ====================

export type AlertLevel = 'critical' | 'warning' | 'info';
export type AlertType = 'inventory' | 'sales' | 'pricing' | 'system';

export interface SmartAlert {
  id: string;
  hotelId: string;
  hotelName: string;
  level: AlertLevel;
  type: AlertType;
  message: string;
  detail?: string;
  timestamp: string;
  requiresAction: boolean;
  actionText?: string;
  actionLink?: string;
  dismissed?: boolean;
}

// 数据联动事件类型
export type DataChangeEvent = 
  | { type: 'PRICE_UPDATED'; hotelId: string; roomTypeId: string; price: number }
  | { type: 'INVENTORY_UPDATED'; hotelId: string; roomTypeId: string; date: string; available: number }
  | { type: 'ORDER_CREATED'; order: Order }
  | { type: 'ORDER_STATUS_CHANGED'; orderId: string; oldStatus: string; newStatus: string }
  | { type: 'HOTEL_SELECTED'; hotelIds: string[] }
  | { type: 'SYNC_COMPLETED'; hotelId: string; success: boolean };

// ==================== Store状态定义 ====================

interface EnterpriseState {
  // 数据
  hotels: EnterpriseHotel[];
  accounts: EnterpriseAccount[];
  channels: Channel[];
  orders: Order[];
  contents: ContentItem[];
  tickets: Ticket[];
  aiInsights: AIInsight[];
  dashboardSummary: DashboardSummary | null;
  dashboardTrends: DashboardTrend[];
  
  // 智能预警
  alerts: SmartAlert[];
  
  // 渠道配置（按酒店）
  hotelChannelConfigs: Record<string, HotelChannelConfig>;  // key: hotelId
  
  // 实时推演状态
  realtimeSimulation: RealtimeSimulationState;
  
  // 渠道配额数据（90天）
  channelQuotas: Record<string, DailyQuota[]>;  // key: hotelId
  
  // 选择状态
  selectedHotelIds: string[];
  currentHotel: EnterpriseHotel | null;
  
  // 筛选状态
  filter: {
    keyword: string;
    city: string;
    brand: string;
    status: string;
  };
  
  // 批量操作
  batchOperations: BatchOperation[];
  
  // UI状态
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface EnterpriseActions {
  // 数据加载
  loadHotels: (force?: boolean) => Promise<void>;
  loadHotelDetail: (hotelId: string) => Promise<Hotel | null>;
  loadHotelMetrics: (hotelId: string) => Promise<HotelMetrics | null>;
  loadDashboardData: () => Promise<void>;
  loadOrders: (params?: { hotelId?: string; status?: string }) => Promise<void>;
  loadContents: (params?: { hotelId?: string; status?: string }) => Promise<void>;
  loadTickets: (params?: { hotelId?: string; status?: string }) => Promise<void>;
  
  // 设置数据（用于初始化）
  setHotels: (hotels: EnterpriseHotel[]) => void;
  
  // 渠道配置操作
  initializeHotelChannels: (hotelId: string) => void;
  toggleHotelChannel: (hotelId: string, channelId: string) => void;
  updateChannelSettings: (hotelId: string, channelId: string, settings: Partial<ChannelSettings>) => void;
  getHotelEnabledChannels: (hotelId: string) => string[];
  
  // 实时推演操作
  startRealtimeSimulation: () => void;
  stopRealtimeSimulation: () => void;
  generateRealtimeTransaction: () => void;
  clearSimulationOrders: () => void;
  
  // 配额管理操作
  loadChannelQuotas: (hotelId: string, startDate?: string, days?: number) => Promise<void>;
  updateChannelQuota: (hotelId: string, date: string, roomTypeId: string, channelId: string, quota: number) => void;
  deductQuota: (hotelId: string, channelId: string, roomTypeId: string, date: string, quantity?: number) => boolean;
  getAvailableQuota: (hotelId: string, channelId: string, roomTypeId: string, date: string) => number;
  
  // 选择操作
  selectHotel: (hotelId: string) => void;
  selectMultipleHotels: (hotelIds: string[]) => void;
  toggleHotelSelection: (hotelId: string) => void;
  selectAllHotels: () => void;
  clearSelection: () => void;
  
  // 筛选操作
  setFilter: (filter: Partial<EnterpriseState['filter']>) => void;
  resetFilter: () => void;
  
  // 批量操作
  batchUpdatePrice: (params: {
    hotelIds: string[];
    adjustmentType: 'fixed' | 'percentage' | 'ai_suggest';
    value: number;
    reason: string;
  }) => Promise<BatchOperation>;
  
  batchUpdateInventory: (params: {
    hotelIds: string[];
    adjustmentType: 'set' | 'add' | 'close' | 'open';
    value: number;
    reason: string;
  }) => Promise<BatchOperation>;
  
  // 订单操作
  confirmOrder: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;
  checkInOrder: (orderId: string, roomNumber: string) => Promise<void>;
  checkOutOrder: (orderId: string) => Promise<void>;
  
  // 内容操作
  publishContent: (contentId: string) => Promise<void>;
  
  // 工单操作
  updateTicketStatus: (ticketId: string, status: string) => Promise<void>;
  
  // PMS同步
  syncHotelToPMS: (hotelId: string) => Promise<boolean>;
  
  // 数据联动
  subscribeToDataChanges: (callback: (event: DataChangeEvent) => void) => () => void;
  emitDataChange: (event: DataChangeEvent) => void;
  
  // 工具
  getSelectedHotels: () => EnterpriseHotel[];
  getHotelById: (hotelId: string) => EnterpriseHotel | undefined;
  clearError: () => void;
  
  // 智能预警
  generateSmartAlerts: () => void;
  dismissAlert: (alertId: string) => void;
  clearAllAlerts: () => void;
  getActiveAlerts: () => SmartAlert[];
}

// ==================== 事件订阅系统 ====================

const dataChangeListeners: Set<(event: DataChangeEvent) => void> = new Set();

// ==================== Store实现 ====================

const initialFilter = {
  keyword: '',
  city: '',
  brand: '',
  status: '',
};

// 包装set函数以支持immer
const createImmerSet = (set: any) => (recipe: (draft: EnterpriseState & EnterpriseActions) => void) => 
  set((state: EnterpriseState & EnterpriseActions) => produce(state, recipe));

export const useEnterpriseStore = create<EnterpriseState & EnterpriseActions>()(
  subscribeWithSelector(
    devtools(
      (originalSet, get) => {
        const set = createImmerSet(originalSet);
        return {
          // ==================== 初始状态 ====================
          hotels: [],
          accounts: [],
          channels: [],
          orders: [],
          contents: [],
          tickets: [],
          aiInsights: [],
          dashboardSummary: null,
          dashboardTrends: [],
          
          // 渠道配置（按酒店）
          hotelChannelConfigs: {},
          
          // 实时推演状态
          realtimeSimulation: {
            isRunning: false,
            lastTransactionTime: Date.now(),
            todayStats: {
              totalOrders: 0,
              totalGMV: 0,
              roomNights: 0,
            },
            generatedOrders: [],
          },
          
          // 渠道配额数据（90天）
          channelQuotas: {},
          
          selectedHotelIds: [],
          currentHotel: null,
          
          filter: { ...initialFilter },
          
          batchOperations: [],
          
          // 智能预警
          alerts: [],
          
          isLoading: false,
          error: null,
          lastUpdated: null,
          
          // ==================== 数据加载 ====================
          
          loadHotels: async (force = false) => {
            const { hotels, lastUpdated } = get();
            
            // 如果有缓存且不需要强制刷新，直接返回
            if (!force && hotels.length > 0 && lastUpdated) {
              const lastUpdateTime = new Date(lastUpdated).getTime();
              const now = Date.now();
              // 5分钟内不重复加载
              if (now - lastUpdateTime < 5 * 60 * 1000) {
                return;
              }
            }
            
            set(state => { state.isLoading = true; state.error = null; });
            
            try {
              const response = await hotelApi.getHotels({ page: 1, pageSize: 100 });
              
              if (response.success) {
                set(state => {
                  state.hotels = response.data.list.map(h => ({
                    ...h,
                    isSelected: state.selectedHotelIds.includes(h.id),
                  }));
                  state.lastUpdated = new Date().toISOString();
                });
                
                // 如果有选中的酒店，更新currentHotel
                const { selectedHotelIds } = get();
                if (selectedHotelIds.length === 1) {
                  const hotel = response.data.list.find(h => h.id === selectedHotelIds[0]);
                  if (hotel) {
                    set(state => { state.currentHotel = hotel as EnterpriseHotel; });
                  }
                }
              } else {
                set(state => { state.error = response.message || '加载酒店失败'; });
              }
            } catch (error) {
              set(state => { state.error = error instanceof Error ? error.message : '未知错误'; });
            } finally {
              set(state => { state.isLoading = false; });
            }
          },
          
          loadHotelDetail: async (hotelId: string) => {
            set(state => { state.isLoading = true; state.error = null; });
            
            try {
              const response = await hotelApi.getHotelDetail(hotelId);
              
              if (response.success) {
                return response.data;
              } else {
                set(state => { state.error = response.message || '加载酒店详情失败'; });
                return null;
              }
            } catch (error) {
              set(state => { state.error = error instanceof Error ? error.message : '未知错误'; });
              return null;
            } finally {
              set(state => { state.isLoading = false; });
            }
          },
          
          loadHotelMetrics: async (hotelId: string) => {
            try {
              const response = await hotelApi.getHotelMetrics(hotelId);
              return response.success ? response.data : null;
            } catch (error) {
              logger.error('加载酒店指标失败', error instanceof Error ? error : undefined);
              return null;
            }
          },
          
          loadDashboardData: async (hotelIds?: string[]) => {
            set(state => { state.isLoading = true; });
            
            try {
              // 使用传入的hotelIds或当前选中的酒店
              const targetHotelIds = hotelIds || get().selectedHotelIds;
              
              // 并行加载多个API
              const [summaryRes, trendsRes] = await Promise.all([
                dashboardApi.getDashboardSummary(targetHotelIds),
                dashboardApi.getDashboardTrends(30, targetHotelIds),
              ]);
              
              set(state => {
                if (summaryRes.success) {
                  state.dashboardSummary = summaryRes.data;
                }
                if (trendsRes.success) {
                  state.dashboardTrends = trendsRes.data;
                }
              });
            } catch (error) {
              logger.error('加载仪表盘数据失败', error instanceof Error ? error : undefined);
            } finally {
              set(state => { state.isLoading = false; });
            }
          },
          
          loadOrders: async (params = {}) => {
            set(state => { state.isLoading = true; });
            
            try {
              const response = await orderApi.getOrders({
                page: 1,
                pageSize: 50,
                ...(params as any),
              });
              
              if (response.success) {
                set(state => { state.orders = response.data.list; });
              }
            } catch (error) {
              logger.error('加载订单失败', error instanceof Error ? error : undefined);
            } finally {
              set(state => { state.isLoading = false; });
            }
          },
          
          loadContents: async (params = {}) => {
            try {
              const response = await contentApi.getContents({
                page: 1,
                pageSize: 50,
                ...(params as any),
              });
              
              if (response.success) {
                set(state => { state.contents = response.data.list; });
              }
            } catch (error) {
              logger.error('加载内容失败', error instanceof Error ? error : undefined);
            }
          },
          
          loadTickets: async (params = {}) => {
            try {
              const response = await ticketApi.getTickets({
                page: 1,
                pageSize: 50,
                ...(params as any),
              });
              
              if (response.success) {
                set(state => { state.tickets = response.data.list; });
              }
            } catch (error) {
              logger.error('加载工单失败', error instanceof Error ? error : undefined);
            }
          },
          
          // 设置酒店数据（用于初始化）
          setHotels: (hotels: EnterpriseHotel[]) => {
            set(state => { state.hotels = hotels; });
          },
          
          // ==================== 选择操作 ====================
          
          selectHotel: (hotelId: string) => {
            set(state => {
              state.selectedHotelIds = [hotelId];
              const hotel = state.hotels.find((h: EnterpriseHotel) => h.id === hotelId);
              state.currentHotel = hotel || null;
              state.hotels.forEach((h: EnterpriseHotel) => {
                h.isSelected = h.id === hotelId;
              });
            });
            
            // 触发数据联动事件
            get().emitDataChange({ type: 'HOTEL_SELECTED', hotelIds: [hotelId] });
          },
          
          selectMultipleHotels: (hotelIds: string[]) => {
            set(state => {
              state.selectedHotelIds = hotelIds;
              state.hotels.forEach((h: EnterpriseHotel) => {
                h.isSelected = hotelIds.includes(h.id);
              });
              state.currentHotel = hotelIds.length === 1 
                ? state.hotels.find((h: EnterpriseHotel) => h.id === hotelIds[0]) || null
                : null;
            });
            
            get().emitDataChange({ type: 'HOTEL_SELECTED', hotelIds });
          },
          
          toggleHotelSelection: (hotelId: string) => {
            set(state => {
              const index = state.selectedHotelIds.indexOf(hotelId);
              if (index > -1) {
                state.selectedHotelIds.splice(index, 1);
              } else {
                state.selectedHotelIds.push(hotelId);
              }
              
              const hotel = state.hotels.find((h: EnterpriseHotel) => h.id === hotelId);
              if (hotel) {
                hotel.isSelected = !hotel.isSelected;
              }
              
              state.currentHotel = state.selectedHotelIds.length === 1
                ? state.hotels.find((h: EnterpriseHotel) => h.id === state.selectedHotelIds[0]) || null
                : null;
            });
          },
          
          selectAllHotels: () => {
            set(state => {
              state.selectedHotelIds = state.hotels.map((h: EnterpriseHotel) => h.id);
              state.hotels.forEach((h: EnterpriseHotel) => { h.isSelected = true; });
              state.currentHotel = null;
            });
            
            get().emitDataChange({ type: 'HOTEL_SELECTED', hotelIds: get().hotels.map(h => h.id) });
          },
          
          clearSelection: () => {
            set(state => {
              state.selectedHotelIds = [];
              state.hotels.forEach((h: EnterpriseHotel) => { h.isSelected = false; });
              state.currentHotel = null;
            });
          },
          
          // ==================== 筛选操作 ====================
          
          setFilter: (filter) => {
            set(state => {
              state.filter = { ...state.filter, ...filter };
            });
          },
          
          resetFilter: () => {
            set(state => {
              state.filter = { ...initialFilter };
            });
          },
          
          // ==================== 批量操作 ====================
          
          batchUpdatePrice: async (params) => {
            const { hotelIds, adjustmentType, value, reason } = params;
            
            const operation: BatchOperation = {
              id: `batch-${Date.now()}`,
              type: 'pricing',
              status: 'processing',
              progress: 0,
              totalHotels: hotelIds.length,
              completedHotels: 0,
              results: [],
              createdAt: new Date().toISOString(),
            };
            
            set(state => { state.batchOperations.unshift(operation); });
            
            try {
              // 调用API执行批量操作
              const response = await pricingApi.batchUpdatePricing({
                hotelIds,
                dateRange: { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
                adjustment: { type: adjustmentType, value },
                reason,
              });
              
              if (response.success) {
                operation.status = 'completed';
                operation.progress = 100;
                operation.completedHotels = response.data.processedHotels;
                operation.results = response.data.results;
                
                // 触发价格更新事件
                response.data.results.forEach(result => {
                  if (result.success) {
                    get().emitDataChange({
                      type: 'PRICE_UPDATED',
                      hotelId: result.hotelId,
                      roomTypeId: 'all',
                      price: 0,
                    });
                  }
                });
                
                // 刷新数据
                await get().loadHotels(true);
              } else {
                operation.status = 'failed';
              }
            } catch (error) {
              operation.status = 'failed';
              logger.error('批量调价失败', error instanceof Error ? error : undefined, { operationId: operation.id });
            }
            
            set(state => {
              const idx = state.batchOperations.findIndex((o: BatchOperation) => o.id === operation.id);
              if (idx > -1) {
                state.batchOperations[idx] = operation;
              }
            });
            
            return operation;
          },
          
          batchUpdateInventory: async (params) => {
            const { hotelIds, adjustmentType, value, reason } = params;
            
            const operation: BatchOperation = {
              id: `batch-inv-${Date.now()}`,
              type: 'inventory',
              status: 'processing',
              progress: 0,
              totalHotels: hotelIds.length,
              completedHotels: 0,
              results: [],
              createdAt: new Date().toISOString(),
            };
            
            set(state => { state.batchOperations.unshift(operation); });
            
            try {
              const response = await inventoryApi.batchUpdateInventory({
                hotelIds,
                dateRange: { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
                adjustment: { type: adjustmentType, value },
                reason,
              });
              
              if (response.success) {
                operation.status = 'completed';
                operation.progress = 100;
                operation.completedHotels = hotelIds.length;
                operation.results = response.data.results;
              } else {
                operation.status = 'failed';
              }
            } catch (error) {
              operation.status = 'failed';
              logger.error('批量库存更新失败', error instanceof Error ? error : undefined, { operationId: operation.id });
            }
            
            set(state => {
              const idx = state.batchOperations.findIndex((o: BatchOperation) => o.id === operation.id);
              if (idx > -1) {
                state.batchOperations[idx] = operation;
              }
            });
            
            return operation;
          },
          
          // ==================== 订单操作 ====================
          
          confirmOrder: async (orderId: string) => {
            try {
              const response = await orderApi.confirmOrder(orderId);
              if (response.success) {
                get().emitDataChange({
                  type: 'ORDER_STATUS_CHANGED',
                  orderId,
                  oldStatus: 'pending',
                  newStatus: 'confirmed',
                });
                await get().loadOrders();
              }
            } catch (error) {
              logger.error('确认订单失败', error instanceof Error ? error : undefined, { orderId });
            }
          },
          
          cancelOrder: async (orderId: string, reason?: string) => {
            try {
              const response = await orderApi.cancelOrder(orderId, reason);
              if (response.success) {
                get().emitDataChange({
                  type: 'ORDER_STATUS_CHANGED',
                  orderId,
                  oldStatus: response.data.status,
                  newStatus: 'cancelled',
                });
                await get().loadOrders();
              }
            } catch (error) {
              logger.error('取消订单失败', error instanceof Error ? error : undefined, { orderId });
            }
          },
          
          checkInOrder: async (orderId: string, roomNumber: string) => {
            try {
              const response = await orderApi.checkInOrder(orderId, roomNumber);
              if (response.success) {
                await get().loadOrders();
              }
            } catch (error) {
              logger.error('办理入住失败', error instanceof Error ? error : undefined, { orderId });
            }
          },
          
          checkOutOrder: async (orderId: string) => {
            try {
              const response = await orderApi.checkOutOrder(orderId);
              if (response.success) {
                await get().loadOrders();
              }
            } catch (error) {
              logger.error('办理退房失败', error instanceof Error ? error : undefined, { orderId });
            }
          },
          
          // ==================== 内容操作 ====================
          
          publishContent: async (contentId: string) => {
            try {
              const response = await contentApi.publishContent(contentId);
              if (response.success) {
                await get().loadContents();
              }
            } catch (error) {
              logger.error('发布内容失败', error instanceof Error ? error : undefined, { contentId });
            }
          },
          
          // ==================== 工单操作 ====================
          
          updateTicketStatus: async (ticketId: string, status: string) => {
            try {
              const response = await ticketApi.updateTicketStatus(ticketId, status as any);
              if (response.success) {
                await get().loadTickets();
              }
            } catch (error) {
              logger.error('更新工单状态失败', error instanceof Error ? error : undefined, { ticketId, status });
            }
          },
          
          // ==================== PMS同步 ====================
          
          syncHotelToPMS: async (hotelId: string) => {
            try {
              const response = await hotelApi.syncHotelToPMS(hotelId);
              
              get().emitDataChange({
                type: 'SYNC_COMPLETED',
                hotelId,
                success: response.success,
              });
              
              if (response.success) {
                await get().loadHotels(true);
              }
              
              return response.success;
            } catch (error) {
              logger.error('PMS同步失败', error instanceof Error ? error : undefined, { hotelId });
              return false;
            }
          },
          
          // ==================== 数据联动 ====================
          
          subscribeToDataChanges: (callback) => {
            dataChangeListeners.add(callback);
            return () => {
              dataChangeListeners.delete(callback);
            };
          },
          
          emitDataChange: (event) => {
            dataChangeListeners.forEach(callback => {
              try {
                callback(event);
              } catch (error) {
                logger.error('数据变更监听器错误', error instanceof Error ? error : undefined);
              }
            });
          },
          
          // ==================== 工具方法 ====================
          
          getSelectedHotels: () => {
            const { hotels, selectedHotelIds } = get();
            return hotels.filter(h => selectedHotelIds.includes(h.id));
          },
          
          getHotelById: (hotelId: string) => {
            return get().hotels.find(h => h.id === hotelId);
          },
          
          // ==================== 渠道配置操作 ====================
          
          initializeHotelChannels: (hotelId: string) => {
            set(state => {
              // 如果该酒店还没有渠道配置，初始化为全部启用
              if (!state.hotelChannelConfigs[hotelId]) {
                const defaultChannels = ['xianyu', 'xiaohongshu', 'wechat', 'douyin'];
                const channelSettings: Record<string, ChannelSettings> = {};
                
                defaultChannels.forEach(channelId => {
                  channelSettings[channelId] = {
                    quota: 10,
                    pricingStrategy: 'same',
                    pricingAdjustment: 0,
                    apiConnected: false,
                    apiStatus: 'disconnected',
                  };
                });
                
                state.hotelChannelConfigs[hotelId] = {
                  hotelId,
                  enabledChannels: defaultChannels,
                  channelSettings,
                };
              }
            });
          },
          
          toggleHotelChannel: (hotelId: string, channelId: string) => {
            set(state => {
              const config = state.hotelChannelConfigs[hotelId];
              if (!config) return;
              
              const idx = config.enabledChannels.indexOf(channelId);
              if (idx > -1) {
                config.enabledChannels.splice(idx, 1);
              } else {
                config.enabledChannels.push(channelId);
              }
            });
          },
          
          updateChannelSettings: (hotelId: string, channelId: string, settings: Partial<ChannelSettings>) => {
            set(state => {
              const config = state.hotelChannelConfigs[hotelId];
              if (!config) return;
              
              config.channelSettings[channelId] = {
                ...config.channelSettings[channelId],
                ...settings,
              };
            });
          },
          
          getHotelEnabledChannels: (hotelId: string) => {
            const config = get().hotelChannelConfigs[hotelId];
            return config?.enabledChannels || [];
          },
          
          // ==================== 实时推演操作 ====================
          // TODO: 实时推演功能当前使用客户端模拟数据生成
          // 实际应接入 WebSocket 或 SSE 接收真实实时订单数据
          
          startRealtimeSimulation: async () => {
            // 先更新状态为运行中
            set(state => {
              state.realtimeSimulation.isRunning = true;
              state.realtimeSimulation.lastTransactionTime = Date.now();
            });
            
            // 初始化所有酒店的渠道配置和配额数据
            const { hotels } = get();
            const today = new Date().toISOString().split('T')[0];
            
            for (const hotel of hotels) {
              get().initializeHotelChannels(hotel.id);
              // 加载配额数据（推演依赖配额扣减）
              await get().loadChannelQuotas(hotel.id, today, 30);
            }
            
            // 启动推演定时器
            const interval = setInterval(() => {
              const { realtimeSimulation } = get();
              if (!realtimeSimulation.isRunning) {
                clearInterval(interval);
                return;
              }
              
              // 每15秒检查一次，30%概率成交 → 平均50秒一单（符合真实酒店成交节奏）
              if (Math.random() > 0.7) {
                get().generateRealtimeTransaction();
              }
            }, 15000);
            
            (window as any).__enterpriseRealtimeInterval = interval;
          },
          
          stopRealtimeSimulation: () => {
            if ((window as any).__enterpriseRealtimeInterval) {
              clearInterval((window as any).__enterpriseRealtimeInterval);
            }
            set(state => {
              state.realtimeSimulation.isRunning = false;
            });
          },
          
          /**
           * TODO: 演示数据 - 生成模拟实时交易
           * 实际应通过 WebSocket 接收真实订单推送
           */
          generateRealtimeTransaction: () => {
            const { hotels, hotelChannelConfigs } = get();
            
            // 1. 从所有酒店中随机选择一个
            if (hotels.length === 0) return;
            const hotel = hotels[Math.floor(Math.random() * hotels.length)];
            
            // 2. 确保酒店渠道已初始化
            if (!hotelChannelConfigs[hotel.id]) {
              get().initializeHotelChannels(hotel.id);
            }
            
            // 3. 检查该酒店的可用渠道
            const enabledChannels = get().getHotelEnabledChannels(hotel.id);
            if (enabledChannels.length === 0) return;
            
            // 4. 检查该酒店的库存配额
            const channelId = enabledChannels[Math.floor(Math.random() * enabledChannels.length)];
            
            // TODO: 演示数据 - 模拟房型（实际应从酒店房型数据API获取）
            const roomTypes = [
              { id: 'rt-1', name: '标准大床房', basePrice: 380 },
              { id: 'rt-2', name: '豪华双床房', basePrice: 520 },
              { id: 'rt-3', name: '行政套房', basePrice: 880 },
            ];
            const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
            
            // TODO: 演示数据 - 模拟入住日期（实际应从真实订单数据获取）
            const checkInDate = new Date();
            checkInDate.setDate(checkInDate.getDate() + Math.floor(Math.random() * 30) + 1);
            const checkOutDate = new Date(checkInDate);
            checkOutDate.setDate(checkOutDate.getDate() + Math.floor(Math.random() * 3) + 1);
            const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // 根据渠道定价策略计算价格
            const config = hotelChannelConfigs[hotel.id];
            const channelSettings = config?.channelSettings[channelId];
            let price = roomType.basePrice;
            if (channelSettings) {
              if (channelSettings.pricingStrategy === 'premium') {
                price = Math.round(price * (1 + channelSettings.pricingAdjustment / 100));
              } else if (channelSettings.pricingStrategy === 'discount') {
                price = Math.round(price * (1 - channelSettings.pricingAdjustment / 100));
              }
            }
            
            // 5. 扣减库存配额
            const dateStr = checkInDate.toISOString().split('T')[0];
            const deducted = get().deductQuota(hotel.id, channelId, roomType.id, dateStr, nights);
            if (!deducted) return; // 库存不足
            
            // 6. 生成订单
            const orderId = `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
            const order: Order = {
              id: orderId,
              hotelId: hotel.id,
              orderNo: `SB${Date.now()}${Math.floor(Math.random() * 1000)}`,
              source: channelId as any,
              status: 'confirmed',
              paymentStatus: 'paid',
              guestName: `客人${Math.floor(Math.random() * 1000)}`,
              guestPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
              roomTypeId: roomType.id,
              roomTypeName: roomType.name,
              checkInDate: dateStr,
              checkOutDate: checkOutDate.toISOString().split('T')[0],
              nights,
              roomCount: 1,
              guestCount: 2,
              totalAmount: price * nights,
              paidAmount: price * nights,
              discountAmount: 0,
              currency: 'CNY',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              // @ts-ignore - 扩展字段
              isRealtimeGenerated: true,
              hotelName: hotel.name,
              channelName: channelId,
            };
            
            // 7. 添加到订单列表
            set(state => {
              state.orders.unshift(order);
              state.realtimeSimulation.generatedOrders.push(orderId);
              state.realtimeSimulation.todayStats.totalOrders++;
              state.realtimeSimulation.todayStats.totalGMV += price * nights;
              state.realtimeSimulation.todayStats.roomNights += nights;
              state.realtimeSimulation.lastTransactionTime = Date.now();
            });
            
            // 8. 同时生成非标渠道订单（如果是非标渠道）
            const nonStandardChannels = ['xianyu', 'xiaohongshu', 'wechat', 'douyin'];
            if (nonStandardChannels.includes(channelId)) {
              const nsOrder: NonStandardOrder = {
                id: `NS-${orderId}`,
                orderNo: order.orderNo,
                channel: channelId as any,
                channelOrderId: `CH${Date.now()}`,
                hotelId: hotel.id,
                hotelName: hotel.name,
                roomTypeName: roomType.name,
                roomCount: 1,
                guestName: order.guestName,
                guestPhone: order.guestPhone,
                checkInDate: order.checkInDate,
                checkOutDate: order.checkOutDate,
                nights: order.nights,
                totalAmount: order.totalAmount,
                channelFee: Math.round(order.totalAmount * 0.05), // 5%渠道费
                platformFee: Math.round(order.totalAmount * 0.03), // 3%平台费
                netAmount: Math.round(order.totalAmount * 0.92), // 92%净收入
                status: 'confirmed',
                pmsStatus: 'pending',
                createdAt: order.createdAt,
              };
              MOCK_NON_STANDARD_ORDERS.unshift(nsOrder);
            }
            
            // 9. 触发订单创建事件
            get().emitDataChange({ type: 'ORDER_CREATED', order });
          },
          
          clearSimulationOrders: () => {
            // 移除非标渠道中的推演订单
            const nsIndex = MOCK_NON_STANDARD_ORDERS.findIndex(o => o.id.startsWith('NS-SIM-'));
            if (nsIndex >= 0) {
              MOCK_NON_STANDARD_ORDERS.splice(nsIndex, 1);
            }
            
            set(state => {
              // 移除所有推演生成的订单
              state.orders = state.orders.filter(o => !o.id.startsWith('SIM-'));
              // 重置推演统计
              state.realtimeSimulation.generatedOrders = [];
              state.realtimeSimulation.todayStats = {
                totalOrders: 0,
                totalGMV: 0,
                roomNights: 0,
              };
            });
          },
          
          // ==================== 配额管理操作 ====================
          
          loadChannelQuotas: async (hotelId: string, startDate?: string, days: number = 90) => {
            // 生成90天的配额数据（模拟）
            const start = startDate || new Date().toISOString().split('T')[0];
            const quotas: DailyQuota[] = [];
            
            const roomTypes = [
              { id: 'rt-1', name: '标准大床房' },
              { id: 'rt-2', name: '豪华双床房' },
              { id: 'rt-3', name: '行政套房' },
            ];
            
            const channels = ['xianyu', 'xiaohongshu', 'wechat', 'douyin'];
            
            for (let i = 0; i < days; i++) {
              const date = new Date(start);
              date.setDate(date.getDate() + i);
              const dateStr = date.toISOString().split('T')[0];
              
              quotas.push({
                date: dateStr,
                roomTypes: roomTypes.map(rt => {
                  const total = 20 + Math.floor(Math.random() * 20);
                  const pmsSold = Math.floor(Math.random() * total * 0.4);
                  const remaining = total - pmsSold;
                  
                  // 分配渠道配额
                  const channelQuotas: ChannelQuota[] = channels.map(c => {
                    const allocated = Math.floor(remaining / channels.length);
                    const sold = Math.floor(Math.random() * allocated * 0.3);
                    return {
                      channelId: c,
                      allocated,
                      sold,
                      remaining: allocated - sold,
                    };
                  });
                  
                  return {
                    roomTypeId: rt.id,
                    roomTypeName: rt.name,
                    pmsTotal: total,
                    pmsSold,
                    pmsAvailable: remaining,
                    channels: channelQuotas,
                    reservedForPMS: Math.floor(remaining * 0.2),
                  };
                }),
              });
            }
            
            set(state => {
              state.channelQuotas[hotelId] = quotas;
            });
          },
          
          updateChannelQuota: (hotelId: string, date: string, roomTypeId: string, channelId: string, quota: number) => {
            set(state => {
              const hotelQuotas = state.channelQuotas[hotelId];
              if (!hotelQuotas) return;
              
              const dailyQuota = hotelQuotas.find(q => q.date === date);
              if (!dailyQuota) return;
              
              const roomTypeQuota = dailyQuota.roomTypes.find(rt => rt.roomTypeId === roomTypeId);
              if (!roomTypeQuota) return;
              
              const channelQuota = roomTypeQuota.channels.find(c => c.channelId === channelId);
              if (channelQuota) {
                channelQuota.allocated = quota;
                channelQuota.remaining = quota - channelQuota.sold;
              }
            });
          },
          
          deductQuota: (hotelId: string, channelId: string, roomTypeId: string, date: string, quantity: number = 1) => {
            let success = false;
            
            set(state => {
              const hotelQuotas = state.channelQuotas[hotelId];
              if (!hotelQuotas) return;
              
              const dailyQuota = hotelQuotas.find(q => q.date === date);
              if (!dailyQuota) return;
              
              const roomTypeQuota = dailyQuota.roomTypes.find(rt => rt.roomTypeId === roomTypeId);
              if (!roomTypeQuota) return;
              
              const channelQuota = roomTypeQuota.channels.find(c => c.channelId === channelId);
              if (!channelQuota || channelQuota.remaining < quantity) return;
              
              channelQuota.sold += quantity;
              channelQuota.remaining -= quantity;
              success = true;
            });
            
            return success;
          },
          
          getAvailableQuota: (hotelId: string, channelId: string, roomTypeId: string, date: string) => {
            const { channelQuotas } = get();
            const hotelQuotas = channelQuotas[hotelId];
            if (!hotelQuotas) return 0;
            
            const dailyQuota = hotelQuotas.find(q => q.date === date);
            if (!dailyQuota) return 0;
            
            const roomTypeQuota = dailyQuota.roomTypes.find(rt => rt.roomTypeId === roomTypeId);
            if (!roomTypeQuota) return 0;
            
            const channelQuota = roomTypeQuota.channels.find(c => c.channelId === channelId);
            return channelQuota?.remaining || 0;
          },
          
          clearError: () => {
            set(state => { state.error = null; });
          },
          
          // ==================== 智能预警 ====================
          // TODO: 智能预警当前使用客户端本地规则生成
          // 实际应从后端AI预警服务获取
          
          generateSmartAlerts: () => {
            const { hotels, selectedHotelIds, orders } = get();
            const now = new Date().toISOString();
            const newAlerts: SmartAlert[] = [];
            
            // 只检查选中的酒店
            const targetHotels = selectedHotelIds.length > 0
              ? hotels.filter(h => selectedHotelIds.includes(h.id))
              : hotels;
            
            targetHotels.forEach(hotel => {
              const hotelOrders = orders.filter(o => o.hotelId === hotel.id);
              const todayOrders = hotelOrders.filter(o => {
                const orderDate = o.createdAt?.split('T')[0];
                const today = new Date().toISOString().split('T')[0];
                return orderDate === today;
              });
              
              const todayGMV = todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              const occupancyRate = hotel.occupancyRate || 0;
              const roomCount = hotel.roomCount || 100;
              const soldRooms = Math.round(roomCount * occupancyRate);
              const availableRooms = roomCount - soldRooms;
              
              // Critical: 满房预警 (>95%)
              if (occupancyRate > 0.95) {
                newAlerts.push({
                  id: `alert-full-${hotel.id}-${Date.now()}`,
                  hotelId: hotel.id,
                  hotelName: hotel.name,
                  level: 'critical',
                  type: 'inventory',
                  message: `🏨 ${hotel.name} 今日即将满房`,
                  detail: `入住率 ${(occupancyRate * 100).toFixed(0)}%，仅剩 ${availableRooms} 间房`,
                  timestamp: now,
                  requiresAction: true,
                  actionText: '查看详情',
                  actionLink: `/hotel-workbench/${hotel.id}`,
                });
              }
              // Critical: 入住率过高，接近满房 (85%-95%)
              else if (occupancyRate > 0.85) {
                newAlerts.push({
                  id: `alert-high-${hotel.id}-${Date.now()}`,
                  hotelId: hotel.id,
                  hotelName: hotel.name,
                  level: 'warning',
                  type: 'inventory',
                  message: `[预警] ${hotel.name} 入住率较高`,
                  detail: `入住率 ${(occupancyRate * 100).toFixed(0)}%，建议关注价格策略`,
                  timestamp: now,
                  requiresAction: false,
                  actionLink: `/hotel-workbench/${hotel.id}`,
                });
              }
              // Warning: 销售缓慢 (<30% 且下午2点后)
              else if (occupancyRate < 0.3) {
                const currentHour = new Date().getHours();
                if (currentHour >= 14) {
                  newAlerts.push({
                    id: `alert-slow-${hotel.id}-${Date.now()}`,
                    hotelId: hotel.id,
                    hotelName: hotel.name,
                    level: 'warning',
                    type: 'sales',
                    message: `📉 ${hotel.name} 今日销售缓慢`,
                    detail: `入住率仅 ${(occupancyRate * 100).toFixed(0)}%，建议启动促销`,
                    timestamp: now,
                    requiresAction: true,
                    actionText: '调整定价',
                    actionLink: `/hotel-workbench/${hotel.id}`,
                  });
                } else {
                  newAlerts.push({
                    id: `alert-low-${hotel.id}-${Date.now()}`,
                    hotelId: hotel.id,
                    hotelName: hotel.name,
                    level: 'info',
                    type: 'sales',
                    message: `📊 ${hotel.name} 当前入住率较低`,
                    detail: `入住率 ${(occupancyRate * 100).toFixed(0)}%，可继续观察`,
                    timestamp: now,
                    requiresAction: false,
                  });
                }
              }
              
              // Warning: GMV 环比异常下降 (>30%)
              const yesterdayOrders = hotelOrders.filter(o => {
                const orderDate = o.createdAt?.split('T')[0];
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                return orderDate === yesterday;
              });
              const yesterdayGMV = yesterdayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
              
              if (yesterdayGMV > 0 && todayGMV < yesterdayGMV * 0.7) {
                const decline = ((yesterdayGMV - todayGMV) / yesterdayGMV * 100).toFixed(0);
                newAlerts.push({
                  id: `alert-gmv-${hotel.id}-${Date.now()}`,
                  hotelId: hotel.id,
                  hotelName: hotel.name,
                  level: 'warning',
                  type: 'pricing',
                  message: `💰 ${hotel.name} 营收异常下降`,
                  detail: `较昨日下降 ${decline}%，需关注竞争态势`,
                  timestamp: now,
                  requiresAction: true,
                  actionText: '查看数据',
                  actionLink: `/hotel-workbench/${hotel.id}`,
                });
              }
            });
            
            // 合并预警：保留已处理的需要操作的预警，替换同类型的自动预警
            const existingAlerts = get().alerts.filter(a => 
              a.requiresAction && !a.dismissed
            );
            const existingTypes = new Set(existingAlerts.map(a => `${a.hotelId}-${a.type}`));
            const filteredNewAlerts = newAlerts.filter(a => !existingTypes.has(`${a.hotelId}-${a.type}`));
            
            set(state => {
              state.alerts = [...existingAlerts, ...filteredNewAlerts].slice(0, 20);
            });
          },
          
          dismissAlert: (alertId: string) => {
            set(state => {
              const alert = state.alerts.find(a => a.id === alertId);
              if (alert) {
                alert.dismissed = true;
              }
            });
          },
          
          clearAllAlerts: () => {
            set(state => { state.alerts = []; });
          },
          
          getActiveAlerts: () => {
            return get().alerts.filter(a => !a.dismissed);
          },
        };
      },
      { name: 'enterprise-store' }
    )
  )
);



// ==================== 选择器导出 ====================

export const selectSelectedHotels = (state: EnterpriseState & EnterpriseActions) => 
  state.hotels.filter(h => state.selectedHotelIds.includes(h.id));

export const selectFilteredHotels = (state: EnterpriseState & EnterpriseActions) => {
  const { hotels, filter } = state;
  return hotels.filter(hotel => {
    if (filter.keyword && !hotel.name.toLowerCase().includes(filter.keyword.toLowerCase())) {
      return false;
    }
    if (filter.city && hotel.city !== filter.city) {
      return false;
    }
    if (filter.brand && hotel.brand !== filter.brand) {
      return false;
    }
    if (filter.status && hotel.status !== filter.status) {
      return false;
    }
    return true;
  });
};

export const selectHotelCities = (state: EnterpriseState & EnterpriseActions) => 
  [...new Set(state.hotels.map(h => h.city))];

export const selectHotelBrands = (state: EnterpriseState & EnterpriseActions) => 
  [...new Set(state.hotels.map(h => h.brand))];
