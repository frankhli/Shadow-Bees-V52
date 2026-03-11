import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// 角色定义
// ============================================

export enum EnterpriseRole {
  // 系统管理员
  SUPER_ADMIN = 'super_admin',
  
  // 集团视角
  GROUP_ADMIN = 'group_admin',      // 集团管理员 - 全部权限
  GROUP_OPERATOR = 'group_operator', // 集团运营 - 日常操作
  GROUP_VIEWER = 'group_viewer',    // 集团查看者 - 只读
  
  // 区域视角
  REGION_MANAGER = 'region_manager', // 区域经理 - 管理区域内酒店
  REGION_STAFF = 'region_staff',     // 区域专员
  
  // 酒店视角
  HOTEL_MANAGER = 'hotel_manager',   // 酒店店长
  HOTEL_STAFF = 'hotel_staff',       // 酒店员工
  HOTEL_RECEPTION = 'hotel_reception', // 前台 - 仅核销
}

// 角色显示名称
export const ROLE_DISPLAY_NAMES: Record<EnterpriseRole, string> = {
  [EnterpriseRole.SUPER_ADMIN]: '超级管理员',
  [EnterpriseRole.GROUP_ADMIN]: '集团管理员',
  [EnterpriseRole.GROUP_OPERATOR]: '集团运营',
  [EnterpriseRole.GROUP_VIEWER]: '集团查看者',
  [EnterpriseRole.REGION_MANAGER]: '区域经理',
  [EnterpriseRole.REGION_STAFF]: '区域专员',
  [EnterpriseRole.HOTEL_MANAGER]: '酒店店长',
  [EnterpriseRole.HOTEL_STAFF]: '酒店员工',
  [EnterpriseRole.HOTEL_RECEPTION]: '前台员工',
};

// ============================================
// 权限定义
// ============================================

export enum Permission {
  // 经营中心
  VIEW_OVERVIEW = 'view:overview',
  VIEW_TODAY = 'view:today',
  VIEW_DASHBOARD = 'view:dashboard',
  VIEW_AI_INSIGHT = 'view:ai-insight',
  VIEW_COMPARISON = 'view:comparison',
  
  // 情报中心
  VIEW_INTELLIGENCE = 'view:intelligence',
  VIEW_EVENTS = 'view:events',
  VIEW_COMPETITORS = 'view:competitors',
  
  // 收益中心
  VIEW_REVENUE = 'view:revenue',
  EDIT_PRICING = 'edit:pricing',
  EDIT_INVENTORY = 'edit:inventory',
  
  // 订单中心
  VIEW_ORDERS = 'view:orders',
  MANAGE_ORDERS = 'manage:orders',
  VERIFY_ORDERS = 'verify:orders',
  
  // 渠道中心
  VIEW_CHANNELS = 'view:channels',
  MANAGE_CHANNELS = 'manage:channels',
  
  // 内容中心
  VIEW_CONTENT = 'view:content',
  CREATE_CONTENT = 'create:content',
  PUBLISH_CONTENT = 'publish:content',
  
  // 智能客服
  VIEW_SERVICE = 'view:service',
  REPLY_SERVICE = 'reply:service',
  
  // 策略中心
  VIEW_STRATEGY = 'view:strategy',
  MANAGE_STRATEGY = 'manage:strategy',
  
  // 风控中心
  VIEW_RISK = 'view:risk',
  MANAGE_RISK = 'manage:risk',
  
  // 账号中心
  VIEW_ACCOUNTS = 'view:accounts',
  MANAGE_ACCOUNTS = 'manage:accounts',
  ASSIGN_ACCOUNTS = 'assign:accounts',
  
  // 管理中心
  VIEW_MANAGEMENT = 'view:management',
  MANAGE_CUSTOMERS = 'manage:customers',
  MANAGE_BILLING = 'manage:billing',
  
  // 系统权限
  VIEW_SETTINGS = 'view:settings',
  MANAGE_USERS = 'manage:users',
  VIEW_AUDIT_LOG = 'view:audit-log',
}

// ============================================
// 角色权限矩阵
// ============================================

export const ROLE_PERMISSIONS: Record<EnterpriseRole, Permission[]> = {
  [EnterpriseRole.SUPER_ADMIN]: Object.values(Permission),
  
  [EnterpriseRole.GROUP_ADMIN]: [
    // 全部查看权限
    Permission.VIEW_OVERVIEW, Permission.VIEW_TODAY, Permission.VIEW_DASHBOARD,
    Permission.VIEW_AI_INSIGHT, Permission.VIEW_COMPARISON,
    Permission.VIEW_INTELLIGENCE, Permission.VIEW_EVENTS, Permission.VIEW_COMPETITORS,
    Permission.VIEW_REVENUE, Permission.VIEW_ORDERS, Permission.VIEW_CHANNELS,
    Permission.VIEW_CONTENT, Permission.VIEW_SERVICE, Permission.VIEW_STRATEGY,
    Permission.VIEW_RISK, Permission.VIEW_ACCOUNTS, Permission.VIEW_MANAGEMENT,
    Permission.VIEW_SETTINGS, Permission.VIEW_AUDIT_LOG,
    // 全部操作权限
    Permission.EDIT_PRICING, Permission.EDIT_INVENTORY,
    Permission.MANAGE_ORDERS, Permission.VERIFY_ORDERS,
    Permission.MANAGE_CHANNELS, Permission.CREATE_CONTENT, Permission.PUBLISH_CONTENT,
    Permission.REPLY_SERVICE, Permission.MANAGE_STRATEGY, Permission.MANAGE_RISK,
    Permission.MANAGE_ACCOUNTS, Permission.ASSIGN_ACCOUNTS,
    Permission.MANAGE_CUSTOMERS, Permission.MANAGE_BILLING, Permission.MANAGE_USERS,
  ],
  
  [EnterpriseRole.GROUP_OPERATOR]: [
    // 全部查看权限
    Permission.VIEW_OVERVIEW, Permission.VIEW_TODAY, Permission.VIEW_DASHBOARD,
    Permission.VIEW_AI_INSIGHT, Permission.VIEW_COMPARISON,
    Permission.VIEW_INTELLIGENCE, Permission.VIEW_EVENTS, Permission.VIEW_COMPETITORS,
    Permission.VIEW_REVENUE, Permission.VIEW_ORDERS, Permission.VIEW_CHANNELS,
    Permission.VIEW_CONTENT, Permission.VIEW_SERVICE, Permission.VIEW_STRATEGY,
    Permission.VIEW_RISK, Permission.VIEW_ACCOUNTS,
    // 日常操作权限（不包含账号分配、用户管理）
    Permission.EDIT_PRICING, Permission.EDIT_INVENTORY,
    Permission.MANAGE_ORDERS, Permission.VERIFY_ORDERS,
    Permission.MANAGE_CHANNELS, Permission.CREATE_CONTENT, Permission.PUBLISH_CONTENT,
    Permission.REPLY_SERVICE, Permission.MANAGE_STRATEGY, Permission.MANAGE_RISK,
  ],
  
  [EnterpriseRole.GROUP_VIEWER]: [
    // 仅查看权限
    Permission.VIEW_OVERVIEW, Permission.VIEW_TODAY, Permission.VIEW_DASHBOARD,
    Permission.VIEW_AI_INSIGHT, Permission.VIEW_COMPARISON,
    Permission.VIEW_INTELLIGENCE, Permission.VIEW_EVENTS, Permission.VIEW_COMPETITORS,
    Permission.VIEW_REVENUE, Permission.VIEW_ORDERS, Permission.VIEW_CHANNELS,
    Permission.VIEW_CONTENT, Permission.VIEW_SERVICE, Permission.VIEW_STRATEGY,
    Permission.VIEW_RISK, Permission.VIEW_ACCOUNTS, Permission.VIEW_MANAGEMENT,
  ],
  
  [EnterpriseRole.REGION_MANAGER]: [
    // 区域内全部权限
    Permission.VIEW_OVERVIEW, Permission.VIEW_TODAY, Permission.VIEW_DASHBOARD,
    Permission.VIEW_AI_INSIGHT, Permission.VIEW_COMPARISON,
    Permission.VIEW_INTELLIGENCE, Permission.VIEW_EVENTS,
    Permission.VIEW_REVENUE, Permission.VIEW_ORDERS,
    Permission.VIEW_CONTENT, Permission.VIEW_SERVICE,
    Permission.EDIT_PRICING, Permission.EDIT_INVENTORY,
    Permission.MANAGE_ORDERS, Permission.VERIFY_ORDERS,
    Permission.CREATE_CONTENT, Permission.PUBLISH_CONTENT,
    Permission.REPLY_SERVICE,
  ],
  
  [EnterpriseRole.REGION_STAFF]: [
    // 区域内部分权限
    Permission.VIEW_OVERVIEW, Permission.VIEW_TODAY,
    Permission.VIEW_REVENUE, Permission.VIEW_ORDERS,
    Permission.VIEW_CONTENT, Permission.VIEW_SERVICE,
    Permission.EDIT_PRICING, Permission.EDIT_INVENTORY,
    Permission.MANAGE_ORDERS, Permission.VERIFY_ORDERS,
    Permission.CREATE_CONTENT, Permission.REPLY_SERVICE,
  ],
  
  [EnterpriseRole.HOTEL_MANAGER]: [
    // 单酒店全部权限
    Permission.VIEW_OVERVIEW, Permission.VIEW_TODAY,
    Permission.VIEW_REVENUE, Permission.VIEW_ORDERS,
    Permission.VIEW_CONTENT, Permission.VIEW_SERVICE,
    Permission.EDIT_PRICING, Permission.EDIT_INVENTORY,
    Permission.MANAGE_ORDERS, Permission.VERIFY_ORDERS,
    Permission.CREATE_CONTENT, Permission.PUBLISH_CONTENT,
    Permission.REPLY_SERVICE,
  ],
  
  [EnterpriseRole.HOTEL_STAFF]: [
    // 单酒店部分权限
    Permission.VIEW_OVERVIEW, Permission.VIEW_TODAY,
    Permission.VIEW_ORDERS, Permission.VIEW_CONTENT,
    Permission.VERIFY_ORDERS, Permission.REPLY_SERVICE,
  ],
  
  [EnterpriseRole.HOTEL_RECEPTION]: [
    // 仅核销权限
    Permission.VIEW_ORDERS, Permission.VERIFY_ORDERS,
  ],
};

// ============================================
// 菜单权限映射
// ============================================

export const MENU_PERMISSION_MAP: Record<string, Permission[]> = {
  'overview': [Permission.VIEW_OVERVIEW],
  'today': [Permission.VIEW_TODAY],
  'dashboard': [Permission.VIEW_DASHBOARD],
  'ai-insight': [Permission.VIEW_AI_INSIGHT],
  'comparison': [Permission.VIEW_COMPARISON],
  
  'intelligence': [Permission.VIEW_INTELLIGENCE],
  'events': [Permission.VIEW_EVENTS],
  'competitors': [Permission.VIEW_COMPETITORS],
  
  'revenue': [Permission.VIEW_REVENUE],
  'pricing': [Permission.VIEW_REVENUE, Permission.EDIT_PRICING],
  'inventory': [Permission.VIEW_REVENUE, Permission.EDIT_INVENTORY],
  
  'orders': [Permission.VIEW_ORDERS],
  'orders-mgmt': [Permission.VIEW_ORDERS, Permission.MANAGE_ORDERS],
  'channel-efficiency': [Permission.VIEW_ORDERS],
  
  'channels': [Permission.VIEW_CHANNELS],
  'channel-mgmt': [Permission.VIEW_CHANNELS, Permission.MANAGE_CHANNELS],
  'channel-price': [Permission.VIEW_CHANNELS],
  
  'content': [Permission.VIEW_CONTENT],
  'content-factory': [Permission.VIEW_CONTENT, Permission.CREATE_CONTENT],
  'image-library': [Permission.VIEW_CONTENT, Permission.CREATE_CONTENT],
  'publish': [Permission.VIEW_CONTENT, Permission.PUBLISH_CONTENT],
  'private-domain': [Permission.VIEW_CONTENT],
  
  'service': [Permission.VIEW_SERVICE],
  'ai-chat': [Permission.VIEW_SERVICE, Permission.REPLY_SERVICE],
  'human-service': [Permission.VIEW_SERVICE, Permission.REPLY_SERVICE],
  
  'strategy': [Permission.VIEW_STRATEGY],
  'pricing-strategy': [Permission.VIEW_STRATEGY, Permission.MANAGE_STRATEGY],
  'operation-strategy': [Permission.VIEW_STRATEGY, Permission.MANAGE_STRATEGY],
  'monitor': [Permission.VIEW_STRATEGY],
  
  'risk': [Permission.VIEW_RISK],
  'risk-warning': [Permission.VIEW_RISK, Permission.MANAGE_RISK],
  'content-compliance': [Permission.VIEW_RISK, Permission.MANAGE_RISK],
  'audit-log': [Permission.VIEW_AUDIT_LOG],
  
  'accounts': [Permission.VIEW_ACCOUNTS],
  'account-pool': [Permission.VIEW_ACCOUNTS, Permission.MANAGE_ACCOUNTS],
  'account-assign': [Permission.VIEW_ACCOUNTS, Permission.ASSIGN_ACCOUNTS],
  'account-status': [Permission.VIEW_ACCOUNTS],
  
  'management': [Permission.VIEW_MANAGEMENT],
  'customer-mgmt': [Permission.VIEW_MANAGEMENT, Permission.MANAGE_CUSTOMERS],
  'tickets': [Permission.VIEW_MANAGEMENT],
  'billing': [Permission.VIEW_MANAGEMENT, Permission.MANAGE_BILLING],
};

// ============================================
// 用户接口
// ============================================

export interface User {
  id: string;
  name: string;
  avatar?: string;
  role: EnterpriseRole;
  roleName: string;
  
  // 数据权限范围
  dataScope: 'all' | 'region' | 'hotel';
  regionIds?: string[];      // 区域范围
  hotelIds: string[];        // 酒店范围
  
  // 权限列表（缓存）
  permissions: Permission[];
  
  // SSO相关
  token: string;
  expiresAt: number;
  pmsToken?: string;         // PMS系统的token
}

// ============================================
// Auth Store
// ============================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // SSO登录
  loginBySSO: (token: string, userInfo?: SSOLoginParams) => Promise<void>;
  logout: () => void;
  
  // 权限检查
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canViewHotel: (hotelId: string) => boolean;
  canEditHotel: (hotelId: string) => boolean;
  
  // 视角判断
  isSingleHotel: () => boolean;
  isRegionView: () => boolean;
  isGroupView: () => boolean;
  
  // 菜单权限
  canAccessMenu: (menuId: string) => boolean;
  getVisibleMenus: () => string[];
}

export interface SSOLoginParams {
  id?: string;
  name?: string;
  role?: EnterpriseRole;
  hotelIds?: string[];
  regionIds?: string[];
  pmsToken?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      loginBySSO: async (token, userInfo) => {
        set({ isLoading: true });
        
        try {
          // TODO: 调用后端解析token
          // const userData = await api.parseToken(token);
          
          // Mock数据：模拟从SSO获取的用户信息
          const role = userInfo?.role || EnterpriseRole.GROUP_ADMIN;
          const permissions = ROLE_PERMISSIONS[role] || [];
          
          const mockUser: User = {
            id: userInfo?.id || 'user_001',
            name: userInfo?.name || '张经理',
            role,
            roleName: ROLE_DISPLAY_NAMES[role],
            permissions,
            hotelIds: userInfo?.hotelIds || ['all'],
            regionIds: userInfo?.regionIds,
            dataScope: role === EnterpriseRole.GROUP_ADMIN || role === EnterpriseRole.GROUP_OPERATOR 
              ? 'all' 
              : role === EnterpriseRole.REGION_MANAGER || role === EnterpriseRole.REGION_STAFF
              ? 'region'
              : 'hotel',
            token,
            pmsToken: userInfo?.pmsToken,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          };
          
          set({ user: mockUser, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      logout: () => {
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem('enterprise-auth');
        localStorage.removeItem('pms_token');
        localStorage.removeItem('pms_user_info');
        // 跳转到企业版登录页
        window.location.href = '/enterprise';
      },
      
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        
        if (Array.isArray(permission)) {
          return permission.every(p => user.permissions.includes(p));
        }
        return user.permissions.includes(permission);
      },
      
      hasAnyPermission: (permissions) => {
        const { user } = get();
        if (!user) return false;
        return permissions.some(p => user.permissions.includes(p));
      },
      
      canViewHotel: (hotelId) => {
        const { user } = get();
        if (!user) return false;
        
        // 集团视角可以看到所有酒店
        if (user.hotelIds?.includes('all')) return true;
        
        return user.hotelIds?.includes(hotelId) ?? false;
      },
      
      canEditHotel: (hotelId) => {
        const { user, hasPermission, canViewHotel } = get();
        if (!user) return false;
        
        // 首先要有查看权限
        if (!canViewHotel(hotelId)) return false;
        
        // 然后要有编辑权限
        return hasPermission(Permission.EDIT_PRICING) || hasPermission(Permission.EDIT_INVENTORY);
      },
      
      isSingleHotel: () => {
        const { user } = get();
        if (!user) return true;
        if (user.hotelIds?.includes('all')) return false;
        return user.hotelIds?.length === 1;
      },
      
      isRegionView: () => {
        const { user } = get();
        return user?.dataScope === 'region';
      },
      
      isGroupView: () => {
        const { user } = get();
        return user?.dataScope === 'all';
      },
      
      canAccessMenu: (menuId) => {
        const { hasAnyPermission } = get();
        const requiredPermissions = MENU_PERMISSION_MAP[menuId];
        if (!requiredPermissions) return true;
        return hasAnyPermission(requiredPermissions);
      },
      
      getVisibleMenus: () => {
        const { canAccessMenu } = get();
        return Object.keys(MENU_PERMISSION_MAP).filter(canAccessMenu);
      },
    }),
    {
      name: 'enterprise-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// 权限检查Hook（用于组件内）
// ============================================

export function checkPermission(
  user: User | null,
  permission: Permission | Permission[]
): boolean {
  if (!user) return false;
  
  if (Array.isArray(permission)) {
    return permission.every(p => user.permissions.includes(p));
  }
  return user.permissions.includes(permission);
}

export function checkAnyPermission(
  user: User | null,
  permissions: Permission[]
): boolean {
  if (!user) return false;
  return permissions.some(p => user.permissions.includes(p));
}
