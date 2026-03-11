/**
 * 财务对账服务
 * 负责财务数据获取、发票管理和对账操作
 * 
 * 核心功能：
 * 1. 获取交易列表
 * 2. 获取对账统计数据
 * 3. 发票开具和管理
 * 4. 对账状态更新
 * 5. 报表导出
 */

import { useEnterpriseStore } from '../stores/enterpriseStore';

// 平台类型
type Platform = 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin' | 'direct';
type InvoiceStatus = 'issued' | 'pending' | 'not_required';
type ReconcileStatus = 'matched' | 'mismatch' | 'pending';

// 非标渠道订单关联
interface NonStandardOrderLink {
  orderId: string;
  channel: 'xianyu' | 'xiaohongshu' | 'wechat' | 'douyin';
  channelOrderNo: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  pmsOrderId?: string;
}

// 交易数据
interface Transaction {
  id: string;
  orderId: string;
  hotelId: string;
  hotelName: string;
  platform: Platform;
  amount: number;
  serviceFee: number;
  netAmount: number;
  platformFee: number;
  expectedAmount: number;
  actualAmount: number;
  invoiceStatus: InvoiceStatus;
  reconcileStatus: ReconcileStatus;
  transactionDate: string;
  guestName: string;
  roomType: string;
  nights: number;
  linkedOrder?: NonStandardOrderLink;
  mismatchReason?: string;
  daysAgo: number;
}

// 对账统计
interface ReconciliationStats {
  totalGross: number;
  totalNet: number;
  totalActual: number;
  totalMismatch: number;
  pendingInvoice: number;
  count: number;
}

// 平台统计
interface PlatformStat {
  count: number;
  amount: number;
}

// 发票信息
interface InvoiceInfo {
  id: string;
  orderId: string;
  invoiceNo: string;
  amount: number;
  status: InvoiceStatus;
  issueDate?: string;
  title?: string;
  taxNo?: string;
}

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 获取 API 基础 URL
const getApiBaseUrl = () => {
  return (import.meta as any).env.VITE_API_BASE_URL || '/api/v1';
};

// 获取认证 Token
const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
};

// 请求封装
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 模拟延迟（用于开发测试）
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 判断是否使用模拟数据
const USE_MOCK_DATA = (import.meta as any).env.VITE_USE_MOCK_DATA === 'true' || !getApiBaseUrl().startsWith('http');

class FinanceReconciliationService {
  // ==========================================
  // 交易数据获取
  // ==========================================

  /**
   * 获取交易列表
   * @param hotelIds 酒店ID列表
   * @param dateRange 日期范围
   * @param filters 筛选条件
   */
  async getTransactions(
    hotelIds: string[],
    dateRange: { start: string; end: string },
    filters: {
      platforms?: Platform[];
      reconcileStatus?: ReconcileStatus | 'all';
      invoiceStatus?: InvoiceStatus | 'all';
      searchQuery?: string;
    } = {}
  ): Promise<Transaction[]> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const params = new URLSearchParams({
          hotelIds: hotelIds.join(','),
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
        
        if (filters.platforms?.length) {
          params.append('platforms', filters.platforms.join(','));
        }
        if (filters.reconcileStatus && filters.reconcileStatus !== 'all') {
          params.append('reconcileStatus', filters.reconcileStatus);
        }
        if (filters.invoiceStatus && filters.invoiceStatus !== 'all') {
          params.append('invoiceStatus', filters.invoiceStatus);
        }
        if (filters.searchQuery) {
          params.append('searchQuery', filters.searchQuery);
        }
        
        const response = await apiRequest<Transaction[]>(`/finance/transactions?${params}`);
        return response.data;
      }

      // 模拟 API 延迟（开发环境）
      await delay(600);
      
      // 模拟数据生成
      return this.generateMockTransactions(hotelIds, dateRange, filters);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
  }

  /**
   * 获取对账统计数据
   */
  async getStats(
    hotelIds: string[],
    dateRange: { start: string; end: string }
  ): Promise<ReconciliationStats> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const params = new URLSearchParams({
          hotelIds: hotelIds.join(','),
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
        const response = await apiRequest<ReconciliationStats>(`/finance/stats?${params}`);
        return response.data;
      }

      await delay(400);
      return this.generateMockStats(hotelIds, dateRange);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw error;
    }
  }

  /**
   * 获取平台统计数据
   */
  async getPlatformStats(
    hotelIds: string[],
    dateRange: { start: string; end: string }
  ): Promise<Record<Platform, PlatformStat>> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const params = new URLSearchParams({
          hotelIds: hotelIds.join(','),
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
        const response = await apiRequest<Record<Platform, PlatformStat>>(
          `/finance/platform-stats?${params}`
        );
        return response.data;
      }

      await delay(300);
      return this.generateMockPlatformStats(hotelIds, dateRange);
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      throw error;
    }
  }

  // ==========================================
  // 发票管理
  // ==========================================

  /**
   * 开具发票
   * @param orderId 订单ID
   * @param invoiceData 发票信息
   */
  async issueInvoice(
    orderId: string,
    invoiceData: {
      title: string;
      taxNo: string;
      email: string;
      amount: number;
    }
  ): Promise<{ success: boolean; invoiceNo?: string; error?: string }> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<{ invoiceNo: string }>('/finance/invoice', {
          method: 'POST',
          body: JSON.stringify({ orderId, ...invoiceData }),
        });
        
        if (response.success) {
          return { success: true, invoiceNo: response.data.invoiceNo };
        } else {
          return { success: false, error: response.message || '发票开具失败' };
        }
      }

      // 模拟 API 延迟（开发环境）
      await delay(800);
      
      // 模拟 95% 成功率
      if (Math.random() > 0.05) {
        return {
          success: true,
          invoiceNo: `INV${Date.now()}`,
        };
      } else {
        return {
          success: false,
          error: '发票开具失败，请稍后重试',
        };
      }
    } catch (error) {
      console.error('Failed to issue invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 批量开票
   * @param orderIds 订单ID列表
   */
  async batchIssueInvoices(
    orderIds: string[],
    invoiceData: {
      title: string;
      taxNo: string;
      email: string;
    }
  ): Promise<{ success: boolean; issuedCount: number; failedOrders: string[] }> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<{ issuedCount: number; failedOrders: string[] }>(
          '/finance/invoice/batch',
          {
            method: 'POST',
            body: JSON.stringify({ orderIds, ...invoiceData }),
          }
        );
        return { success: true, ...response.data };
      }

      await delay(1200);
      
      // 模拟批量开票
      const failedOrders: string[] = [];
      orderIds.forEach(orderId => {
        if (Math.random() < 0.05) {
          failedOrders.push(orderId);
        }
      });
      
      return {
        success: failedOrders.length === 0,
        issuedCount: orderIds.length - failedOrders.length,
        failedOrders,
      };
    } catch (error) {
      console.error('Failed to batch issue invoices:', error);
      return {
        success: false,
        issuedCount: 0,
        failedOrders: orderIds,
      };
    }
  }

  /**
   * 查看发票详情
   */
  async getInvoiceDetail(orderId: string): Promise<InvoiceInfo | null> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<InvoiceInfo>(`/finance/invoice/${orderId}`);
        return response.success ? response.data : null;
      }

      await delay(300);
      
      // 模拟数据
      if (Math.random() > 0.3) {
        return {
          id: `inv-${orderId}`,
          orderId,
          invoiceNo: `INV${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          amount: Math.round(300 + Math.random() * 800),
          status: 'issued',
          issueDate: new Date().toISOString(),
          title: '某公司',
          taxNo: '91110000XXXXXXXX',
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch invoice detail:', error);
      return null;
    }
  }

  // ==========================================
  // 对账操作
  // ==========================================

  /**
   * 标记订单为已对平
   */
  async markAsMatched(orderId: string, remark?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<void>('/finance/reconcile', {
          method: 'POST',
          body: JSON.stringify({ orderId, status: 'matched', remark }),
        });
        
        if (response.success) {
          return { success: true };
        } else {
          return { success: false, error: response.message || '操作失败' };
        }
      }

      await delay(500);
      return { success: true };
    } catch (error) {
      console.error('Failed to mark as matched:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 批量标记为已对平
   */
  async batchMarkAsMatched(orderIds: string[], remark?: string): Promise<{ 
    success: boolean; 
    processedCount: number;
    error?: string;
  }> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<{ processedCount: number }>('/finance/reconcile/batch', {
          method: 'POST',
          body: JSON.stringify({ orderIds, status: 'matched', remark }),
        });
        
        if (response.success) {
          return { success: true, processedCount: response.data.processedCount };
        } else {
          return { success: false, processedCount: 0, error: response.message || '操作失败' };
        }
      }

      await delay(800);
      return { success: true, processedCount: orderIds.length };
    } catch (error) {
      console.error('Failed to batch mark as matched:', error);
      return {
        success: false,
        processedCount: 0,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 导出对账报表
   */
  async exportReport(
    hotelIds: string[],
    dateRange: { start: string; end: string },
    format: 'csv' | 'excel' = 'csv'
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<{ downloadUrl: string }>('/finance/export', {
          method: 'POST',
          body: JSON.stringify({ hotelIds, dateRange, format }),
        });
        
        if (response.success) {
          return { success: true, downloadUrl: response.data.downloadUrl };
        } else {
          return { success: false, error: response.message || '导出失败' };
        }
      }

      await delay(1000);
      
      // 模拟生成下载链接
      return {
        success: true,
        downloadUrl: `/api/v1/finance/export/${Date.now()}.${format}`,
      };
    } catch (error) {
      console.error('Failed to export report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      };
    }
  }

  // ==========================================
  // 非标渠道订单关联
  // ==========================================

  /**
   * 获取非标渠道订单详情
   */
  async getNonStandardOrderDetail(channelOrderNo: string): Promise<any | null> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<any>(`/orders/non-standard/${channelOrderNo}`);
        return response.success ? response.data : null;
      }

      await delay(400);
      
      // 模拟数据
      return {
        orderNo: channelOrderNo,
        channel: 'xiaohongshu',
        status: 'confirmed',
        guestName: '张先生',
        checkIn: '2024-03-15',
        checkOut: '2024-03-17',
        roomType: '标准大床房',
        amount: 760,
      };
    } catch (error) {
      console.error('Failed to fetch non-standard order:', error);
      return null;
    }
  }

  /**
   * 获取 PMS 订单详情
   */
  async getPMSOrderDetail(pmsOrderId: string): Promise<any | null> {
    try {
      // 真实 API 调用
      if (!USE_MOCK_DATA) {
        const response = await apiRequest<any>(`/pms/orders/${pmsOrderId}`);
        return response.success ? response.data : null;
      }

      await delay(400);
      
      // 模拟数据
      return {
        pmsOrderId,
        status: 'checked_in',
        guestName: '张先生',
        roomNo: '801',
        checkIn: '2024-03-15',
        checkOut: '2024-03-17',
      };
    } catch (error) {
      console.error('Failed to fetch PMS order:', error);
      return null;
    }
  }

  // ==========================================
  // 模拟数据生成（用于开发和测试）
  // ==========================================

  private generateMockTransactions(
    hotelIds: string[],
    dateRange: { start: string; end: string },
    _filters: any
  ): Transaction[] {
    const store = useEnterpriseStore.getState();
    const hotels = store.hotels.filter(h => hotelIds.includes(h.id));
    
    const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat', 'douyin', 'direct'];
    const roomTypes = ['大床房', '双床房', '套房', '家庭房'];
    const mismatchReasons = ['平台手续费变动', '退款未同步', '优惠抵扣差异', '汇率波动', '系统延迟'];
    
    if (hotels.length === 0) return [];
    
    const startTime = new Date(dateRange.start).getTime();
    const endTime = new Date(dateRange.end).getTime() + 86400000;
    
    return Array.from({ length: 50 }, (_, i) => {
      const hotel = hotels[i % hotels.length] || hotels[0];
      const platform = platforms[i % platforms.length];
      const amount = Math.round(300 + Math.random() * 800);
      const serviceFee = Math.round(amount * 0.05);
      const platformFee = platform === 'direct' ? 0 : Math.round(amount * 0.08);
      const netAmount = amount - serviceFee - platformFee;
      
      const hasMismatch = Math.random() < 0.15;
      const diffAmount = hasMismatch ? Math.round(Math.random() * 100) : 0;
      const actualAmount = netAmount - diffAmount;
      
      const transactionDate = new Date(startTime + Math.random() * (endTime - startTime));
      const daysAgo = Math.floor((Date.now() - transactionDate.getTime()) / 86400000);
      
      return {
        id: `txn-${i}`,
        orderId: `ORD${Date.now()}-${i}`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        platform,
        amount,
        serviceFee,
        netAmount,
        platformFee,
        expectedAmount: netAmount,
        actualAmount,
        invoiceStatus: Math.random() > 0.6 ? 'issued' : Math.random() > 0.3 ? 'pending' : 'not_required',
        reconcileStatus: hasMismatch ? 'mismatch' : Math.random() > 0.8 ? 'pending' : 'matched',
        transactionDate: transactionDate.toISOString(),
        guestName: `客人${i + 1}`,
        roomType: roomTypes[i % roomTypes.length],
        nights: 1 + Math.floor(Math.random() * 3),
        linkedOrder: platform !== 'direct' ? {
          orderId: `ORD-${Date.now()}-${i}`,
          channel: platform as any,
          channelOrderNo: `${platform.toUpperCase()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          syncStatus: Math.random() > 0.2 ? 'synced' : Math.random() > 0.5 ? 'pending' : 'failed',
          pmsOrderId: Math.random() > 0.3 ? `PMS-${Math.random().toString(36).substr(2, 6).toUpperCase()}` : undefined,
        } : undefined,
        mismatchReason: hasMismatch ? mismatchReasons[Math.floor(Math.random() * mismatchReasons.length)] : undefined,
        daysAgo,
      };
    });
  }

  private generateMockStats(
    hotelIds: string[],
    _dateRange: { start: string; end: string }
  ): ReconciliationStats {
    const baseAmount = hotelIds.length * 15000;
    const totalGross = Math.round(baseAmount * (0.8 + Math.random() * 0.4));
    const totalNet = Math.round(totalGross * 0.87);
    const totalActual = Math.round(totalNet * 0.95);
    const totalMismatch = Math.round(totalNet * 0.05);
    
    return {
      totalGross,
      totalNet,
      totalActual,
      totalMismatch,
      pendingInvoice: Math.floor(hotelIds.length * 3 * Math.random()),
      count: hotelIds.length * 10,
    };
  }

  private generateMockPlatformStats(
    hotelIds: string[],
    _dateRange: { start: string; end: string }
  ): Record<Platform, PlatformStat> {
    const baseCount = hotelIds.length * 2;
    
    return {
      xianyu: { count: Math.floor(baseCount * 0.3), amount: Math.round(baseCount * 0.3 * 550) },
      xiaohongshu: { count: Math.floor(baseCount * 0.25), amount: Math.round(baseCount * 0.25 * 600) },
      wechat: { count: Math.floor(baseCount * 0.2), amount: Math.round(baseCount * 0.2 * 500) },
      douyin: { count: Math.floor(baseCount * 0.15), amount: Math.round(baseCount * 0.15 * 650) },
      direct: { count: Math.floor(baseCount * 0.1), amount: Math.round(baseCount * 0.1 * 700) },
    };
  }
}

// 单例实例
let serviceInstance: FinanceReconciliationService | null = null;

export function getFinanceReconciliationService(): FinanceReconciliationService {
  if (!serviceInstance) {
    serviceInstance = new FinanceReconciliationService();
  }
  return serviceInstance;
}

export {
  FinanceReconciliationService,
  type Transaction,
  type ReconciliationStats,
  type PlatformStat,
  type InvoiceInfo,
  type NonStandardOrderLink,
  type Platform,
  type InvoiceStatus,
  type ReconcileStatus,
};
