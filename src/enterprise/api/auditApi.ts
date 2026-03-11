/**
 * 审计日志API
 * 
 * 功能：
 * 1. 获取审计日志列表（支持筛选、分页）
 * 2. 获取审计统计
 * 3. 导出审计日志
 * 
 * 当前实现：模拟数据
 * 后续替换：只需修改本文件中的实现，保持接口签名不变
 */

import type { 
  ApiResponse, 
  PaginatedResponse, 
  AuditRecord, 
  GetAuditLogsParams,
  AuditStats,
  ExportAuditLogsParams 
} from './types';

// ============================================
// Mock数据生成器
// ============================================
const MOCK_USERS = [
  { id: 'u1', name: '张经理', role: '店长' },
  { id: 'u2', name: '李运营', role: '运营专员' },
  { id: 'u3', name: '王财务', role: '财务专员' },
  { id: 'u4', name: '赵客服', role: '客服' },
  { id: 'u5', name: '刘技术', role: '技术专员' },
];

const MOCK_OPERATIONS: AuditRecord['operation'][] = ['create', 'update', 'delete', 'view', 'export'];
const MOCK_RESOURCES: AuditRecord['resource'][] = ['price', 'inventory', 'order', 'account', 'content', 'settings'];

const RESOURCE_NAMES: Record<AuditRecord['resource'], string> = {
  price: '价格',
  inventory: '库存',
  order: '订单',
  account: '账号',
  content: '内容',
  settings: '设置',
};

const OPERATION_NAMES: Record<AuditRecord['operation'], string> = {
  create: '创建',
  update: '修改',
  delete: '删除',
  view: '查看',
  export: '导出',
  login: '登录',
};

// 生成单条审计记录
const generateAuditRecord = (
  index: number, 
  hotels: { id: string; name: string }[]
): AuditRecord => {
  const user = MOCK_USERS[index % MOCK_USERS.length];
  const hotel = hotels[index % hotels.length] || hotels[0] || { id: 'unknown', name: '未知酒店' };
  const operation = MOCK_OPERATIONS[index % MOCK_OPERATIONS.length];
  const resource = MOCK_RESOURCES[index % MOCK_RESOURCES.length];
  
  // 根据操作类型生成合理的详情
  let details = '';
  switch (operation) {
    case 'create':
      details = `创建了新的${RESOURCE_NAMES[resource]}记录`;
      break;
    case 'update':
      details = `修改了${RESOURCE_NAMES[resource]}信息`;
      break;
    case 'delete':
      details = `删除了${RESOURCE_NAMES[resource]}记录`;
      break;
    case 'view':
      details = `查看了${RESOURCE_NAMES[resource]}详情`;
      break;
    case 'export':
      details = `导出了${RESOURCE_NAMES[resource]}报表`;
      break;
    default:
      details = `${OPERATION_NAMES[operation]}${RESOURCE_NAMES[resource]}`;
  }
  
  // 风险等级：删除操作高风险，导出操作中风险，其他低风险
  let riskLevel: AuditRecord['riskLevel'] = 'low';
  if (operation === 'delete') riskLevel = 'high';
  else if (operation === 'export' || operation === 'update') riskLevel = 'medium';
  
  // 偶尔失败
  const status: AuditRecord['status'] = Math.random() > 0.95 ? 'failed' : 'success';
  
  return {
    id: `audit-${Date.now()}-${index}`,
    timestamp: new Date(Date.now() - index * 30 * 60 * 1000).toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    hotelId: hotel.id,
    hotelName: hotel.name,
    operation,
    resource,
    resourceId: `res-${resource}-${index}`,
    resourceName: `${RESOURCE_NAMES[resource]} #${index + 1}`,
    details,
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    riskLevel,
    status,
  };
};

// 生成Mock数据
const generateMockData = (
  count: number,
  hotels: { id: string; name: string }[]
): AuditRecord[] => {
  return Array.from({ length: count }, (_, i) => generateAuditRecord(i, hotels));
};

// ============================================
// API实现
// ============================================

/**
 * 获取审计日志列表
 * 
 * @param params 查询参数
 * @returns 分页的审计记录列表
 */
export async function getAuditLogs(
  params: GetAuditLogsParams
): Promise<ApiResponse<PaginatedResponse<AuditRecord>>> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const { 
    page = 1, 
    pageSize = 20,
    hotelIds = [],
    startDate,
    endDate,
    operations = [],
    resources = [],
    riskLevels = [],
    keyword = ''
  } = params;
  
  // 生成基础数据（实际项目中这些数据来自后端）
  const mockHotels = hotelIds.length > 0 
    ? hotelIds.map(id => ({ id, name: `酒店-${id.slice(-4)}` }))
    : [
        { id: 'hotel-001', name: '北京希尔顿酒店' },
        { id: 'hotel-002', name: '上海外滩茂悦大酒店' },
        { id: 'hotel-003', name: '广州四季酒店' },
      ];
  
  // 生成100条模拟数据
  let allRecords = generateMockData(100, mockHotels);
  
  // 应用筛选
  if (hotelIds.length > 0) {
    allRecords = allRecords.filter(r => hotelIds.includes(r.hotelId));
  }
  
  if (startDate) {
    const start = new Date(startDate).getTime();
    allRecords = allRecords.filter(r => new Date(r.timestamp).getTime() >= start);
  }
  
  if (endDate) {
    const end = new Date(endDate).getTime() + 86400000;
    allRecords = allRecords.filter(r => new Date(r.timestamp).getTime() <= end);
  }
  
  if (operations.length > 0) {
    allRecords = allRecords.filter(r => operations.includes(r.operation));
  }
  
  if (resources.length > 0) {
    allRecords = allRecords.filter(r => resources.includes(r.resource));
  }
  
  if (riskLevels.length > 0) {
    allRecords = allRecords.filter(r => riskLevels.includes(r.riskLevel));
  }
  
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    allRecords = allRecords.filter(r => 
      r.details.toLowerCase().includes(lowerKeyword) ||
      r.userName.toLowerCase().includes(lowerKeyword) ||
      r.hotelName.toLowerCase().includes(lowerKeyword)
    );
  }
  
  // 排序（最新的在前）
  allRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // 分页
  const total = allRecords.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const list = allRecords.slice(start, end);
  
  return {
    success: true,
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取审计统计
 * 
 * @param hotelIds 酒店ID列表
 * @returns 审计统计数据
 */
export async function getAuditStats(
  hotelIds?: string[]
): Promise<ApiResponse<AuditStats>> {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const mockHotels = hotelIds?.length 
    ? hotelIds.map(id => ({ id, name: '' }))
    : [{ id: '1', name: '' }];
    
  const allRecords = generateMockData(100, mockHotels);
  const filteredRecords = hotelIds?.length 
    ? allRecords.filter(r => hotelIds.includes(r.hotelId))
    : allRecords;
  
  const today = new Date().toDateString();
  const todayCount = filteredRecords.filter(r => 
    new Date(r.timestamp).toDateString() === today
  ).length;
  
  return {
    success: true,
    data: {
      total: filteredRecords.length,
      totalRecords: filteredRecords.length,
      success: filteredRecords.filter(r => r.status === 'success').length,
      failed: filteredRecords.filter(r => r.status === 'failed').length,
      highRisk: filteredRecords.filter(r => r.riskLevel === 'high').length,
      highRiskCount: filteredRecords.filter(r => r.riskLevel === 'high').length,
      mediumRiskCount: filteredRecords.filter(r => r.riskLevel === 'medium').length,
      todayCount,
      todayRecords: todayCount,
      operationCounts: {
        create: filteredRecords.filter(r => r.operation === 'create').length,
        update: filteredRecords.filter(r => r.operation === 'update').length,
        delete: filteredRecords.filter(r => r.operation === 'delete').length,
        view: filteredRecords.filter(r => r.operation === 'view').length,
        export: filteredRecords.filter(r => r.operation === 'export').length,
        login: filteredRecords.filter(r => r.operation === 'login').length,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 导出审计日志
 * 
 * @param params 导出参数
 * @returns 导出文件URL
 */
export async function exportAuditLogs(
  params: ExportAuditLogsParams
): Promise<ApiResponse<{ downloadUrl: string; filename: string }>> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 模拟生成导出文件
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `审计日志_${timestamp}.${params.format}`;
  
  return {
    success: true,
    data: {
      downloadUrl: `/api/v1/audit/export/${filename}`,
      filename,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 记录审计日志（前端调用，用于记录用户操作）
 * 
 * @param record 审计记录（不含id和timestamp）
 * @returns 是否记录成功
 */
export async function logAudit(
  record: Omit<AuditRecord, 'id' | 'timestamp'>
): Promise<ApiResponse<boolean>> {
  // 在实际项目中，这里会发送请求到后端
  // 为了性能，前端可能使用 Beacon API 或批量发送
  
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(record)], { type: 'application/json' });
    navigator.sendBeacon('/api/v1/audit/log', blob);
  }
  
  return {
    success: true,
    data: true,
    timestamp: new Date().toISOString(),
  };
}
