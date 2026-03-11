/**
 * 权限体系类型定义
 * 支持三端：酒店端 / 集团端 / 管理端
 */

// ==========================================
// 用户角色（RBAC）
// ==========================================
export enum UserRole {
  // 平台级（管理端）
  SUPER_ADMIN = 'super_admin',    // 超级管理员
  ADMIN = 'admin',                // 平台管理员
  OPERATOR = 'operator',          // 运营人员
  
  // 集团级（集团端）
  GROUP_OWNER = 'group_owner',    // 集团老板
  GROUP_MANAGER = 'group_manager', // 集团经理
  
  // 酒店级（酒店端）
  HOTEL_MANAGER = 'hotel_manager', // 酒店店长
  HOTEL_STAFF = 'hotel_staff',     // 酒店员工
  RECEPTIONIST = 'receptionist',   // 前台
}

// ==========================================
// 数据权限范围
// ==========================================
export enum DataScope {
  ALL = 'all',              // 全部数据（平台级）
  GROUP = 'group',          // 集团内数据
  HOTEL = 'hotel',          // 单酒店数据
  SELF = 'self',            // 仅自己的数据
}

// ==========================================
// JWT Payload
// ==========================================
export interface JWTPayload {
  sub: string;              // userId
  email: string;
  role: UserRole;
  scope: DataScope;
  
  // 权限范围ID列表
  hotelIds?: string[];      // 可访问的酒店ID
  groupId?: string;         // 所属集团ID
  
  // 其他元数据
  iat: number;
  exp: number;
}

// ==========================================
// 权限检查上下文
// ==========================================
export interface PermissionContext {
  userId: string;
  role: UserRole;
  scope: DataScope;
  hotelIds: string[];
  groupId?: string;
}

// ==========================================
// 权限策略
// ==========================================
export interface PermissionPolicy {
  role: UserRole;
  allowedEndpoints: string[];
  dataScope: DataScope;
  allowedActions: Action[];
}

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  APPROVE = 'approve',
}

// ==========================================
// 三端特定的权限配置
// ==========================================

// 酒店端权限
export const HotelPermissions: Record<UserRole, PermissionPolicy> = {
  [UserRole.HOTEL_MANAGER]: {
    role: UserRole.HOTEL_MANAGER,
    allowedEndpoints: [
      '/hotels/:id',           // 查看自己酒店
      '/hotels/:id/stats',     // 酒店统计
      '/hotels/:id/orders',    // 酒店订单
      '/hotels/:id/inventory', // 酒店库存
      '/hotels/:id/pricing',   // 酒店定价
      '/hotels/:id/contents',  // 酒店内容
    ],
    dataScope: DataScope.HOTEL,
    allowedActions: [Action.READ, Action.CREATE, Action.UPDATE],
  },
  [UserRole.HOTEL_STAFF]: {
    role: UserRole.HOTEL_STAFF,
    allowedEndpoints: [
      '/hotels/:id',
      '/hotels/:id/orders',
      '/hotels/:id/inventory',
    ],
    dataScope: DataScope.HOTEL,
    allowedActions: [Action.READ, Action.CREATE],
  },
  [UserRole.RECEPTIONIST]: {
    role: UserRole.RECEPTIONIST,
    allowedEndpoints: [
      '/hotels/:id/orders',
      '/hotels/:id/inventory',
    ],
    dataScope: DataScope.HOTEL,
    allowedActions: [Action.READ, Action.CREATE, Action.UPDATE],
  },
  // 其他角色不适用于酒店端
} as any;

// 集团端权限
export const GroupPermissions: Record<UserRole, PermissionPolicy> = {
  [UserRole.GROUP_OWNER]: {
    role: UserRole.GROUP_OWNER,
    allowedEndpoints: [
      '/group/dashboard',      // 集团仪表盘
      '/group/hotels',         // 集团酒店列表
      '/group/aggregations',   // 聚合数据
      '/group/reports/*',      // 报表
      '/group/strategies',     // 策略中心
    ],
    dataScope: DataScope.GROUP,
    allowedActions: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.EXPORT],
  },
  [UserRole.GROUP_MANAGER]: {
    role: UserRole.GROUP_MANAGER,
    allowedEndpoints: [
      '/group/dashboard',
      '/group/hotels',
      '/group/aggregations',
      '/group/reports/*',
    ],
    dataScope: DataScope.GROUP,
    allowedActions: [Action.READ, Action.EXPORT],
  },
} as any;

// 管理端权限
export const AdminPermissions: Record<UserRole, PermissionPolicy> = {
  [UserRole.SUPER_ADMIN]: {
    role: UserRole.SUPER_ADMIN,
    allowedEndpoints: ['*'],  // 全部接口
    dataScope: DataScope.ALL,
    allowedActions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXPORT, Action.APPROVE],
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    allowedEndpoints: [
      '/admin/dashboard',
      '/admin/hotels/*',
      '/admin/orders/*',
      '/admin/customers/*',
      '/admin/content/*',
      '/admin/finance/*',
      '/admin/system/*',
    ],
    dataScope: DataScope.ALL,
    allowedActions: [Action.READ, Action.UPDATE, Action.EXPORT],
  },
  [UserRole.OPERATOR]: {
    role: UserRole.OPERATOR,
    allowedEndpoints: [
      '/admin/dashboard',
      '/admin/content/audit',
      '/admin/tickets',
    ],
    dataScope: DataScope.ALL,
    allowedActions: [Action.READ, Action.UPDATE, Action.APPROVE],
  },
} as any;
