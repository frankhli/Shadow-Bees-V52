/**
 * 账号管理 API
 * 
 * 功能：
 * 1. 获取账号列表（支持按酒店筛选）
 * 2. 创建账号
 * 3. 更新账号
 * 4. 删除账号
 * 5. 分配账号到酒店
 * 6. 回收账号
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Account,
  PaginationParams,
} from './types';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== Mock 数据 ====================

let MOCK_ACCOUNTS: Account[] = [
  // 小红书账号
  { id: 'acc-001', hotelId: 'hotel-001', platform: '小红书', username: 'xhs_beijing_001', status: 'active', loginMethod: 'qr', lastLoginAt: '2024-03-08 10:30:00', assignedTo: '张运营', createdAt: '2024-01-15T08:00:00Z' },
  { id: 'acc-002', hotelId: 'hotel-001', platform: '小红书', username: 'xhs_beijing_002', status: 'active', loginMethod: 'qr', lastLoginAt: '2024-03-07 16:45:00', assignedTo: '李运营', createdAt: '2024-01-20T08:00:00Z' },
  { id: 'acc-003', hotelId: 'hotel-002', platform: '小红书', username: 'xhs_shanghai_001', status: 'inactive', loginMethod: 'password', lastLoginAt: '2024-02-28 09:00:00', assignedTo: '王运营', createdAt: '2024-02-01T08:00:00Z' },
  
  // 闲鱼账号
  { id: 'acc-004', hotelId: 'hotel-001', platform: '闲鱼', username: 'xianyu_beijing_01', status: 'active', loginMethod: 'qr', lastLoginAt: '2024-03-08 11:20:00', assignedTo: '张运营', notes: '主账号', createdAt: '2024-01-10T08:00:00Z' },
  { id: 'acc-005', hotelId: 'hotel-002', platform: '闲鱼', username: 'xianyu_shanghai_01', status: 'suspended', loginMethod: 'password', assignedTo: '王运营', notes: '账号异常，待处理', createdAt: '2024-02-10T08:00:00Z' },
  { id: 'acc-006', hotelId: 'unassigned', platform: '闲鱼', username: 'xianyu_backup_01', status: 'active', loginMethod: 'qr', notes: '备用账号', createdAt: '2024-03-01T08:00:00Z' },
  
  // 微信账号
  { id: 'acc-007', hotelId: 'hotel-001', platform: '微信', username: 'wx_beijing_001', status: 'active', loginMethod: 'qr', lastLoginAt: '2024-03-08 14:00:00', assignedTo: '张运营', createdAt: '2024-01-05T08:00:00Z' },
  { id: 'acc-008', hotelId: 'hotel-003', platform: '微信', username: 'wx_guangzhou_001', status: 'active', loginMethod: 'qr', lastLoginAt: '2024-03-07 10:00:00', assignedTo: '赵运营', createdAt: '2024-02-15T08:00:00Z' },
  
  // 抖音账号
  { id: 'acc-009', hotelId: 'hotel-002', platform: '抖音', username: 'douyin_shanghai_01', status: 'active', loginMethod: 'qr', lastLoginAt: '2024-03-08 09:30:00', assignedTo: '李运营', createdAt: '2024-01-25T08:00:00Z' },
  { id: 'acc-010', hotelId: 'unassigned', platform: '抖音', username: 'douyin_backup_01', status: 'inactive', loginMethod: 'password', notes: '新注册账号', createdAt: '2024-03-05T08:00:00Z' },
  
  // 更多未分配账号
  { id: 'acc-011', hotelId: 'unassigned', platform: '小红书', username: 'xhs_backup_001', status: 'active', loginMethod: 'qr', notes: '备用', createdAt: '2024-03-01T08:00:00Z' },
  { id: 'acc-012', hotelId: 'unassigned', platform: '微信', username: 'wx_backup_001', status: 'active', loginMethod: 'qr', notes: '备用', createdAt: '2024-03-01T08:00:00Z' },
];

// ==================== API 实现 ====================

/**
 * 获取账号列表
 */
export async function getAccounts(
  params?: PaginationParams & { hotelIds?: string[]; platform?: string; status?: string }
): Promise<ApiResponse<PaginatedResponse<Account>>> {
  await delay();
  
  let list = [...MOCK_ACCOUNTS];
  
  // 按酒店筛选
  if (params?.hotelIds && params.hotelIds.length > 0) {
    list = list.filter(a => params.hotelIds?.includes(a.hotelId));
  }
  
  // 按平台筛选
  if (params?.platform) {
    list = list.filter(a => a.platform === params.platform);
  }
  
  // 按状态筛选
  if (params?.status) {
    list = list.filter(a => a.status === params.status);
  }
  
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
 * 创建账号
 */
export async function createAccount(
  account: Omit<Account, 'id' | 'createdAt'>
): Promise<ApiResponse<Account>> {
  await delay(500);
  
  const newAccount: Account = {
    ...account,
    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  
  MOCK_ACCOUNTS.push(newAccount);
  
  return {
    success: true,
    data: newAccount,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量创建账号
 */
export async function batchCreateAccounts(
  accounts: Omit<Account, 'id' | 'createdAt'>[]
): Promise<ApiResponse<Account[]>> {
  await delay(800);
  
  const newAccounts: Account[] = accounts.map(acc => ({
    ...acc,
    id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }));
  
  MOCK_ACCOUNTS.push(...newAccounts);
  
  return {
    success: true,
    data: newAccounts,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新账号
 */
export async function updateAccount(
  accountId: string,
  updates: Partial<Account>
): Promise<ApiResponse<Account>> {
  await delay(300);
  
  const index = MOCK_ACCOUNTS.findIndex(a => a.id === accountId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '账号不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ACCOUNTS[index] = {
    ...MOCK_ACCOUNTS[index],
    ...updates,
  };
  
  return {
    success: true,
    data: MOCK_ACCOUNTS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 删除账号
 */
export async function deleteAccount(accountId: string): Promise<ApiResponse<boolean>> {
  await delay(300);
  
  const index = MOCK_ACCOUNTS.findIndex(a => a.id === accountId);
  
  if (index === -1) {
    return {
      success: false,
      data: false,
      message: '账号不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ACCOUNTS.splice(index, 1);
  
  return {
    success: true,
    data: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量删除账号
 */
export async function batchDeleteAccounts(accountIds: string[]): Promise<ApiResponse<{ deleted: number; failed: number }>> {
  await delay(500);
  
  let deleted = 0;
  let failed = 0;
  
  accountIds.forEach(id => {
    const index = MOCK_ACCOUNTS.findIndex(a => a.id === id);
    if (index > -1) {
      MOCK_ACCOUNTS.splice(index, 1);
      deleted++;
    } else {
      failed++;
    }
  });
  
  return {
    success: true,
    data: { deleted, failed },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 分配账号到酒店
 */
export async function assignAccountToHotel(
  accountId: string,
  hotelId: string,
  hotelName?: string
): Promise<ApiResponse<Account>> {
  await delay(300);
  
  const index = MOCK_ACCOUNTS.findIndex(a => a.id === accountId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '账号不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ACCOUNTS[index] = {
    ...MOCK_ACCOUNTS[index],
    hotelId,
    assignedTo: hotelName ? '运营专员' : undefined,
  };
  
  return {
    success: true,
    data: MOCK_ACCOUNTS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 批量分配账号到酒店
 */
export async function batchAssignAccounts(
  accountIds: string[],
  hotelId: string,
  hotelName?: string
): Promise<ApiResponse<{ assigned: number; failed: number }>> {
  await delay(500);
  
  let assigned = 0;
  let failed = 0;
  
  accountIds.forEach(id => {
    const index = MOCK_ACCOUNTS.findIndex(a => a.id === id);
    if (index > -1) {
      MOCK_ACCOUNTS[index] = {
        ...MOCK_ACCOUNTS[index],
        hotelId,
        assignedTo: hotelName ? '运营专员' : undefined,
      };
      assigned++;
    } else {
      failed++;
    }
  });
  
  return {
    success: true,
    data: { assigned, failed },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 回收账号（取消分配）
 */
export async function unassignAccount(accountId: string): Promise<ApiResponse<Account>> {
  await delay(300);
  
  const index = MOCK_ACCOUNTS.findIndex(a => a.id === accountId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '账号不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_ACCOUNTS[index] = {
    ...MOCK_ACCOUNTS[index],
    hotelId: 'unassigned',
    assignedTo: undefined,
  };
  
  return {
    success: true,
    data: MOCK_ACCOUNTS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取账号统计
 */
export async function getAccountStats(
  hotelIds?: string[]
): Promise<ApiResponse<{
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  assigned: number;
  unassigned: number;
  byPlatform: Record<string, number>;
}>> {
  await delay(300);
  
  let list = [...MOCK_ACCOUNTS];
  
  if (hotelIds && hotelIds.length > 0) {
    list = list.filter(a => hotelIds.includes(a.hotelId));
  }
  
  const byPlatform: Record<string, number> = {};
  list.forEach(a => {
    byPlatform[a.platform] = (byPlatform[a.platform] || 0) + 1;
  });
  
  return {
    success: true,
    data: {
      total: list.length,
      active: list.filter(a => a.status === 'active').length,
      inactive: list.filter(a => a.status === 'inactive').length,
      suspended: list.filter(a => a.status === 'suspended').length,
      assigned: list.filter(a => a.hotelId !== 'unassigned').length,
      unassigned: list.filter(a => a.hotelId === 'unassigned').length,
      byPlatform,
    },
    timestamp: new Date().toISOString(),
  };
}
