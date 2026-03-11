/**
 * Shadow-Bees V52 - 集团设置
 * 组织架构、权限管理、品牌配置
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Shield,
  Palette,
  Plus,
  Search,
  ChevronRight,
  Edit3,
  Trash2,
  CheckCircle,
  Key,
  Keyboard,
} from 'lucide-react';
import { ShortcutSettings } from '@/components/ux';
import { useGroupStore } from '../stores/groupStore';

// 模拟组织架构
const mockOrganization = [
  {
    id: 'region-1',
    name: '华北区',
    manager: '张伟',
    hotels: [
      { id: 'h1', name: '三里屯精品店', manager: '李明', staff: 8 },
      { id: 'h2', name: '国贸商务店', manager: '王芳', staff: 6 },
      { id: 'h3', name: '望京科技店', manager: '刘强', staff: 5 },
      { id: 'h4', name: '朝阳门店', manager: '陈静', staff: 5 },
    ],
  },
  {
    id: 'region-2',
    name: '华东区',
    manager: '赵敏',
    hotels: [
      { id: 'h5', name: '静安店', manager: '周杰', staff: 7 },
      { id: 'h6', name: '浦东店', manager: '吴倩', staff: 6 },
    ],
  },
  {
    id: 'region-3',
    name: '华南区',
    manager: '李强',
    hotels: [
      { id: 'h7', name: '深圳湾店', manager: '郑伟', staff: 5 },
    ],
  },
];

// 模拟用户权限
const mockUsers = [
  { id: '1', name: '张总', role: '集团CEO', email: 'ceo@group.com', status: 'active' },
  { id: '2', name: '张伟', role: '华北区总', email: 'zhangwei@group.com', status: 'active' },
  { id: '3', name: '赵敏', role: '华东区总', email: 'zhaomin@group.com', status: 'active' },
  { id: '4', name: '李强', role: '华南区总', email: 'liqiang@group.com', status: 'active' },
  { id: '5', name: '李明', role: '店长', email: 'liming@group.com', status: 'active' },
];

// 模拟角色权限
const mockRoles = [
  { id: '1', name: '集团CEO', description: '全部权限', permissions: ['all'], users: 1 },
  { id: '2', name: '区域经理', description: '区域内所有权限', permissions: ['region_read', 'region_write'], users: 3 },
  { id: '3', name: '店长', description: '单店管理权限', permissions: ['hotel_read', 'hotel_write'], users: 8 },
  { id: '4', name: '运营专员', description: '内容、客服权限', permissions: ['content', 'service'], users: 12 },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'organization' | 'permissions' | 'brand' | 'shortcuts'>('organization');
  const { currentGroup } = useGroupStore();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">集团设置</h1>
          <p className="text-text-secondary text-sm mt-1">
            组织架构管理 · 权限配置 · 品牌标准
          </p>
        </div>
      </motion.div>

      {/* Tab切换 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-border-color w-fit"
      >
        {[
          { key: 'organization', label: '组织架构', icon: Building2 },
          { key: 'permissions', label: '权限管理', icon: Shield },
          { key: 'brand', label: '品牌配置', icon: Palette },
          { key: 'shortcuts', label: '快捷键', icon: Keyboard },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key
                ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/25'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* 内容区 */}
      <AnimatePresence mode="wait">
        {activeTab === 'organization' && (
          <motion.div
            key="organization"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 集团概览 */}
          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple to-purple-600 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{currentGroup?.name}</h3>
                <p className="text-text-secondary text-sm mt-1">
                  {mockOrganization.length} 个区域 · {mockOrganization.reduce((sum, r) => sum + r.hotels.length, 0)} 家门店
                </p>
              </div>
              <button 
                onClick={() => alert(`编辑集团信息\n\n集团名称：${currentGroup?.name}\n门店数量：${mockOrganization.reduce((sum, r) => sum + r.hotels.length, 0)}家\n区域数量：${mockOrganization.length}个`)}
                className="ml-auto px-4 py-2 text-sm border border-border-color rounded-lg hover:bg-surface-hover transition-colors"
              >
                编辑信息
              </button>
            </div>
          </div>

          {/* 区域列表 */}
          <div className="space-y-4">
            {mockOrganization.map((region) => (
              <div key={region.id} className="bg-surface rounded-xl border border-border-color overflow-hidden">
                <div className="p-4 border-b border-border-color bg-surface-hover">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-neon-purple" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{region.name}</h4>
                        <p className="text-xs text-text-secondary">
                          区域总: {region.manager} · {region.hotels.length} 家门店
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => alert(`编辑区域：${region.name}\n\n区域经理：${region.manager}\n门店数量：${region.hotels.length}家`)}
                        className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => alert(`区域详情：${region.name}\n\n下辖门店：\n${region.hotels.map(h => `· ${h.name}（${h.manager}）`).join('\n')}`)}
                        className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-border-color">
                  {region.hotels.map((hotel) => (
                    <div key={hotel.id} className="p-4 hover:bg-surface-hover transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium">{hotel.name}</p>
                          <p className="text-xs text-text-secondary">
                            店长: {hotel.manager} · {hotel.staff} 名员工
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => alert(`门店管理：${hotel.name}\n\n店长：${hotel.manager}\n员工数：${hotel.staff}人\n\n可操作：\n- 编辑门店信息\n- 调整人员配置\n- 查看经营数据`)}
                        className="text-xs text-neon-purple hover:underline"
                      >
                        管理
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => alert('添加新区域\n\n请填写以下信息：\n- 区域名称\n- 区域经理\n- 管辖范围')}
            className="w-full py-3 border-2 border-dashed border-border-color rounded-xl text-text-secondary hover:text-neon-purple hover:border-neon-purple/30 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加区域
          </button>
          </motion.div>
        )}

        {activeTab === 'permissions' && (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* 角色列表 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color flex items-center justify-between">
              <h3 className="font-semibold">角色权限</h3>
              <button 
                onClick={() => alert('新建角色\n\n请填写：\n- 角色名称\n- 角色描述\n- 权限配置')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建角色
              </button>
            </div>
            <div className="divide-y divide-border-color">
              {mockRoles.map((role) => (
                <div key={role.id} className="p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{role.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-hover text-text-secondary">
                          {role.users} 人
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{role.description}</p>
                      <p className="text-xs text-text-muted mt-1">
                        权限: {role.permissions.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => alert(`编辑角色：${role.name}\n\n当前权限：${role.permissions.join(', ')}\n当前用户：${role.users}人`)}
                        className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`确定删除角色「${role.name}」吗？\n\n注意：该角色下还有 ${role.users} 个用户`)) {
                            alert(`角色「${role.name}」已删除`);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-surface-hover text-neon-red"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 用户列表 */}
          <div className="bg-surface rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 border-b border-border-color flex items-center justify-between">
              <h3 className="font-semibold">用户管理</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="搜索用户..."
                    className="pl-9 pr-4 py-1.5 bg-surface border border-border-color rounded-lg text-sm text-text-primary focus:border-neon-purple focus:outline-none appearance-none"
                  />
                </div>
                <button 
                  onClick={() => alert('添加新用户\n\n请填写：\n- 姓名\n- 邮箱\n- 手机号\n- 所属角色')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加用户
                </button>
              </div>
            </div>
            <div className="divide-y divide-border-color">
              {mockUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neon-purple/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-neon-purple" />
                      </div>
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-text-secondary">{user.role}</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        user.status === 'active' 
                          ? 'bg-neon-green/10 text-neon-green' 
                          : 'bg-text-muted/10 text-text-muted'
                      }`}>
                        {user.status === 'active' ? '正常' : '停用'}
                      </span>
                      <button 
                        onClick={() => alert(`编辑用户信息：\n\n姓名：${user.name}\n角色：${user.role}\n邮箱：${user.email}\n状态：${user.status === 'active' ? '正常' : '停用'}`)}
                        className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </motion.div>
        )}

        {activeTab === 'brand' && (
          <motion.div
            key="brand"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
          {/* VI标准 */}
          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <h3 className="font-semibold">VI标准</h3>
                <p className="text-xs text-text-secondary">品牌视觉识别规范</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
                <span className="text-sm">Logo使用规范</span>
                <button 
                  onClick={() => alert('Logo使用规范\n\n1. 主Logo用于官方渠道\n2. 副Logo用于合作伙伴\n3. 最小使用尺寸：120px\n4. 安全间距：Logo高度的1/4')}
                  className="text-xs text-neon-purple hover:underline"
                >查看文档</button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
                <span className="text-sm">色彩标准</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-neon-purple" />
                  <span className="text-xs text-text-muted">#A855F7</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
                <span className="text-sm">字体规范</span>
                <span className="text-xs text-text-muted">PingFang SC / DIN Pro</span>
              </div>
            </div>
          </div>

          {/* 内容标准 */}
          <div className="bg-surface rounded-xl border border-border-color p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <h3 className="font-semibold">内容标准</h3>
                <p className="text-xs text-text-secondary">各渠道发布规范</p>
              </div>
            </div>
            <div className="space-y-3">
              {['小红书发布标准', '闲鱼发布标准', '微信视频标准', '客服话术标准'].map((item) => (
                <div key={item} className="flex items-center justify-between p-3 rounded-lg bg-surface-hover">
                  <span className="text-sm">{item}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">已配置</span>
                    <CheckCircle className="w-4 h-4 text-neon-green" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <button 
              onClick={() => alert('品牌配置保存成功！\n\n已更新：\n- VI标准\n- 内容标准\n\n更改将同步到所有门店')}
              className="px-6 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/90 transition-colors"
            >
              保存设置
            </button>
          </div>
          </motion.div>
        )}

        {/* 快捷键设置 */}
        {activeTab === 'shortcuts' && (
          <motion.div
            key="shortcuts"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <ShortcutSettings appType="group" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SettingsPage;
