/**
 * 新增客户弹窗 - 功能完整版
 */

import React, { useState } from 'react';
import { Modal, Button } from '../../components/ui';
import { useAdminStore, type Customer, type CustomerTier, type CustomerType } from '../../stores/adminStore';
import { useToast } from '../../components/ui/Toast';
import { Building2, User, Phone, Mail, Calendar, Home, Building } from 'lucide-react';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tiers: { value: CustomerTier; label: string; price: string }[] = [
  { value: 'starter', label: '入门版', price: '¥299/月' },
  { value: 'professional', label: '专业版', price: '¥799/月' },
  { value: 'enterprise', label: '企业版', price: '¥1999/月' },
];

const customerTypes: { value: CustomerType; label: string; icon: React.ElementType }[] = [
  { value: 'single', label: '单体酒店', icon: Home },
  { value: 'group', label: '集团客户', icon: Building },
];

export function CreateCustomerModal({ isOpen, onClose }: CreateCustomerModalProps) {
  const { customers, setCustomers } = useAdminStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    tier: 'professional' as CustomerTier,
    type: 'single' as CustomerType,
    notes: '',
  });

  const handleSubmit = async () => {
    // 验证
    if (!formData.companyName.trim()) {
      toast.error('请输入酒店名称');
      return;
    }
    if (!formData.contactName.trim()) {
      toast.error('请输入联系人');
      return;
    }
    if (!formData.contactPhone.trim()) {
      toast.error('请输入联系电话');
      return;
    }

    setLoading(true);

    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 生成新客户
    const newCustomer: Customer = {
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      tenantId: `tenant-${Date.now()}`,
      type: formData.type,
      companyName: formData.companyName,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      contactEmail: formData.contactEmail || '',
      tier: formData.tier,
      status: 'trial',
      hotelIds: [],
      hotels: [],
      totalRevenue: 0,
      monthlyRevenue: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天试用
      salesRep: '系统自动',
      notes: formData.notes,
      healthScore: 100, // 新客户默认健康度100
    };

    setCustomers([...customers, newCustomer]);
    toast.success('客户创建成功', `${formData.companyName} 已添加为试用客户`);
    setLoading(false);
    onClose();
    
    // 重置表单
    setFormData({
      companyName: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      tier: 'professional',
      type: 'single',
      notes: '',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增客户"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            创建客户
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 酒店名称 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <Building2 size={14} className="inline mr-1" />
            酒店名称 *
          </label>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="请输入酒店名称"
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>

        {/* 联系人 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <User size={14} className="inline mr-1" />
            联系人 *
          </label>
          <input
            type="text"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            placeholder="请输入联系人姓名"
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>

        {/* 联系电话 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <Phone size={14} className="inline mr-1" />
            联系电话 *
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            placeholder="请输入联系电话"
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>

        {/* 邮箱 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <Mail size={14} className="inline mr-1" />
            邮箱
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            placeholder="请输入邮箱地址"
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>

        {/* 客户类型 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">客户类型</label>
          <div className="grid grid-cols-2 gap-3">
            {customerTypes.map((type) => {
              const TypeIcon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.type === type.value
                      ? 'border-neon-cyan bg-neon-cyan/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="mb-2">
                    <TypeIcon size={20} className={formData.type === type.value ? 'text-neon-cyan' : 'text-gray-400'} />
                  </div>
                  <p className="font-medium text-sm">{type.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 套餐选择 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <Calendar size={14} className="inline mr-1" />
            选择套餐
          </label>
          <div className="grid grid-cols-3 gap-3">
            {tiers.map((tier) => (
              <button
                key={tier.value}
                onClick={() => setFormData({ ...formData, tier: tier.value })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formData.tier === tier.value
                    ? 'border-neon-cyan bg-neon-cyan/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <p className="font-medium text-sm">{tier.label}</p>
                <p className="text-xs text-gray-400">{tier.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">备注</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="请输入备注信息"
            rows={3}
            className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm focus:border-neon-cyan focus:outline-none resize-none"
          />
        </div>

        <p className="text-xs text-gray-500">
          * 新创建的客户将自动获得30天试用期
        </p>
      </div>
    </Modal>
  );
}
