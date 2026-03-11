/**
 * SAAS端 - 手动录入工单（代客建单）
 * 用于微信/电话等渠道收到的工单需求
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, Phone, User, MessageSquare, Hotel, Building } from 'lucide-react';
import { useAdminStore } from '../../stores/adminStore';
import type { TicketType, TicketPriority } from '@/types';
import { Button } from '../../components/ui';
import { useToast } from '../../components/ui';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ticketTypes: { value: TicketType; label: string }[] = [
  { value: 'tech', label: '技术问题' },
  { value: 'business', label: '业务申请' },
  { value: 'consult', label: '使用咨询' },
];

const priorities: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'low', label: '低', color: 'text-gray-400' },
  { value: 'medium', label: '中', color: 'text-cyan-400' },
  { value: 'high', label: '高', color: 'text-orange-400' },
  { value: 'urgent', label: '紧急', color: 'text-red-400' },
];

export function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const { customers, tickets, setTickets } = useAdminStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  // 客户类型选择：单体或集团
  const [customerType, setCustomerType] = useState<'single' | 'group'>('single');
  
  // 表单数据
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('tech');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [source, setSource] = useState<'wechat' | 'phone' | 'email'>('phone');

  if (!isOpen) return null;

  // 根据客户类型筛选客户
  const filteredCustomers = customers.filter((c) => c.type === customerType);
  
  // 获取选中的客户
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  
  // 获取选中的酒店（单体模式）
  const selectedHotel = selectedCustomer?.hotels.find((h) => h.id === selectedHotelId);

  const handleCustomerTypeChange = (type: 'single' | 'group') => {
    setCustomerType(type);
    setSelectedCustomerId('');
    setSelectedHotelId('');
  };

  const handleSubmit = async () => {
    // 验证
    if (!selectedCustomerId) {
      toast.error(customerType === 'group' ? '请选择集团' : '请选择酒店');
      return;
    }
    if (customerType === 'single' && !selectedHotelId) {
      toast.error('请选择具体门店');
      return;
    }
    if (!title.trim()) {
      toast.error('请输入工单标题');
      return;
    }
    if (!description.trim()) {
      toast.error('请输入工单描述');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      toast.error('客户信息错误');
      setLoading(false);
      return;
    }

    // 根据客户类型确定酒店信息
    const hotel = customerType === 'group' 
      ? customer.hotels[0]  // 集团工单使用第一个酒店作为默认
      : customer.hotels.find((h) => h.id === selectedHotelId);
      
    if (!hotel) {
      toast.error('酒店信息错误');
      setLoading(false);
      return;
    }

    // 创建工单
    const newTicket = {
      id: `TKT-${Date.now()}`,
      hotelId: hotel.id,
      hotelName: hotel.name,
      customerId: customer.id,
      customerType: customerType, // 'single' | 'group'
      isGroupLevel: customerType === 'group', // 集团级工单标记
      affectedHotelIds: customerType === 'group' ? customer.hotelIds : [hotel.id],
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      status: 'open' as const,
      tags: [source === 'phone' ? '电话' : source === 'wechat' ? '微信' : '邮件'],
      messages: [],
      assignedTo: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'manual' as const,
      contactName: contactName || customer.contactName,
      contactPhone: contactPhone || customer.contactPhone,
    };

    setTickets([newTicket, ...tickets]);
    toast.success(
      '工单创建成功', 
      customerType === 'group' 
        ? `已为集团 ${customer.companyName} 创建工单：${title}`
        : `已为 ${hotel.name} 创建工单：${title}`
    );
    
    setLoading(false);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setCustomerType('single');
    setSelectedCustomerId('');
    setSelectedHotelId('');
    setTitle('');
    setDescription('');
    setType('tech');
    setPriority('medium');
    setContactName('');
    setContactPhone('');
    setSource('phone');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <MessageSquare size={20} className="text-neon-cyan" />
              代客建单
            </h3>
            <p className="text-sm text-gray-300 mt-1">
              为微信/电话/邮件渠道收到的需求创建工单
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* 来源选择 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">需求来源</label>
            <div className="flex gap-3">
              {(['phone', 'wechat', 'email'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                    source === s
                      ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {s === 'phone' ? '📞 电话' : s === 'wechat' ? '💬 微信' : '📧 邮件'}
                </button>
              ))}
            </div>
          </div>

          {/* 客户类型选择 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">客户类型</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleCustomerTypeChange('single')}
                className={`flex-1 py-3 rounded-lg border text-sm transition-all flex items-center justify-center gap-2 ${
                  customerType === 'single'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Hotel size={16} />
                🏨 单体酒店
              </button>
              <button
                onClick={() => handleCustomerTypeChange('group')}
                className={`flex-1 py-3 rounded-lg border text-sm transition-all flex items-center justify-center gap-2 ${
                  customerType === 'group'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <Building size={16} />
                🏢 集团客户
              </button>
            </div>
          </div>

          {/* 客户选择 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              <Building2 size={14} className="inline mr-1" />
              {customerType === 'group' ? '选择集团 *' : '选择客户 *'}
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSelectedHotelId('');
              }}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-neon-cyan focus:outline-none"
            >
              <option value="" className="text-gray-400">
                {customerType === 'group' ? '请选择集团' : '请选择客户'}
              </option>
              {filteredCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.companyName} ({customer.hotels.length}家门店) - {customer.contactName}
                </option>
              ))}
            </select>
          </div>

          {/* 单体模式下显示门店选择 */}
          {customerType === 'single' && selectedCustomer && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                <Hotel size={14} className="inline mr-1" />
                选择具体门店 *
              </label>
              <select
                value={selectedHotelId}
                onChange={(e) => setSelectedHotelId(e.target.value)}
                className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-neon-cyan focus:outline-none"
              >
                <option value="" className="text-gray-400">请选择门店</option>
                {selectedCustomer.hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name} ({hotel.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 集团模式下显示关联门店信息 */}
          {customerType === 'group' && selectedCustomer && (
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-purple-400">集团级工单</span>
              </div>
              <p className="text-xs text-gray-400">
                此工单将关联集团下全部 {selectedCustomer.hotels.length} 家门店
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedCustomer.hotels.slice(0, 5).map((hotel) => (
                  <span key={hotel.id} className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                    {hotel.name}
                  </span>
                ))}
                {selectedCustomer.hotels.length > 5 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                    +{selectedCustomer.hotels.length - 5} 家
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 联系人信息（选填） */}
          {(selectedCustomer || selectedHotel) && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-[#0B0F19] rounded-lg">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  <User size={14} className="inline mr-1" />
                  联系人
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={selectedCustomer?.contactName || ''}
                  className="w-full px-3 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  <Phone size={14} className="inline mr-1" />
                  联系电话
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder={selectedCustomer?.contactPhone || ''}
                  className="w-full px-3 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500"
                />
              </div>
            </div>
          )}

          {/* 工单类型 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">工单类型</label>
            <div className="grid grid-cols-3 gap-3">
              {ticketTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`py-2 rounded-lg border text-sm transition-all ${
                    type === t.value
                      ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">优先级</label>
            <div className="flex gap-3">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                    priority === p.value
                      ? 'border-neon-cyan bg-neon-cyan/10'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className={priority === p.value ? p.color : ''}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              工单标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="简要概括问题"
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-neon-cyan focus:outline-none"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              详细描述 *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细描述客户遇到的问题或需求..."
              rows={4}
              className="w-full px-4 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:border-neon-cyan focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            创建工单
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
