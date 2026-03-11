/**
 * AI 话术库相关 API
 */

import type {
  ApiResponse,
  PaginatedResponse,
  Script,
  ScriptCategory,
  PaginationParams,
} from './types';
import { MOCK_SCRIPTS } from './mockData';

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 获取话术列表
 */
export async function getScripts(
  params?: PaginationParams & { category?: string; scene?: string; status?: string; hotelIds?: string[] }
): Promise<ApiResponse<PaginatedResponse<Script>>> {
  await delay();
  
  let list = [...MOCK_SCRIPTS];
  
  if (params?.category) {
    list = list.filter(s => s.category === params.category);
  }
  
  if (params?.scene) {
    list = list.filter(s => s.scene === params.scene);
  }
  
  if (params?.status) {
    list = list.filter(s => s.status === params.status);
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
 * 获取话术分类列表
 */
export async function getScriptCategories(): Promise<ApiResponse<ScriptCategory[]>> {
  await delay();
  
  // 从话术数据中提取分类
  const categories = [...new Set(MOCK_SCRIPTS.map(s => s.category))];
  const categoryData: ScriptCategory[] = categories.map((cat, index) => ({
    id: `cat-${index}`,
    name: cat,
    description: `${cat}相关话术`,
    scriptCount: MOCK_SCRIPTS.filter(s => s.category === cat).length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  
  return {
    success: true,
    data: categoryData,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建话术
 */
export async function createScript(
  data: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<Script>> {
  await delay(500);
  
  const newScript: Script = {
    ...data as any,
    id: `script-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  MOCK_SCRIPTS.unshift(newScript);
  
  return {
    success: true,
    data: newScript,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新话术
 */
export async function updateScript(
  scriptId: string,
  data: Partial<Script>
): Promise<ApiResponse<Script>> {
  await delay(300);
  
  const index = MOCK_SCRIPTS.findIndex(s => s.id === scriptId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '话术不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_SCRIPTS[index] = {
    ...MOCK_SCRIPTS[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_SCRIPTS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 删除话术
 */
export async function deleteScript(scriptId: string): Promise<ApiResponse<void>> {
  await delay(300);
  
  const index = MOCK_SCRIPTS.findIndex(s => s.id === scriptId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '话术不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_SCRIPTS.splice(index, 1);
  
  return {
    success: true,
    data: undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 更新话术状态
 */
export async function updateScriptStatus(
  scriptId: string,
  status: 'active' | 'inactive'
): Promise<ApiResponse<Script>> {
  await delay(300);
  
  const index = MOCK_SCRIPTS.findIndex(s => s.id === scriptId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '话术不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_SCRIPTS[index] = {
    ...MOCK_SCRIPTS[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_SCRIPTS[index],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 增加话术使用次数
 */
export async function incrementScriptUsage(scriptId: string): Promise<ApiResponse<Script>> {
  await delay(200);
  
  const index = MOCK_SCRIPTS.findIndex(s => s.id === scriptId);
  
  if (index === -1) {
    return {
      success: false,
      data: null as any,
      message: '话术不存在',
      timestamp: new Date().toISOString(),
    };
  }
  
  MOCK_SCRIPTS[index] = {
    ...MOCK_SCRIPTS[index],
    usageCount: (MOCK_SCRIPTS[index].usageCount || 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  
  return {
    success: true,
    data: MOCK_SCRIPTS[index],
    timestamp: new Date().toISOString(),
  };
}
