/**
 * 续约日历视图 - Phase 2 客户成功核心功能
 * 展示未来60天内的客户续约分布
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building,
  Building2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Filter
} from 'lucide-react';
import type { Customer } from '../stores/adminStore';

interface RenewalCalendarProps {
  customers: Customer[];
  onSelectCustomer?: (customer: Customer) => void;
}

// 获取未来60天内的续约客户
function getUpcomingRenewals(customers: Customer[]) {
  const now = new Date();
  const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  
  return customers
    .filter(c => {
      const expireDate = new Date(c.expireAt);
      return expireDate >= now && expireDate <= sixtyDaysLater;
    })
    .map(c => ({
      ...c,
      daysUntilExpire: Math.ceil((new Date(c.expireAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }))
    .sort((a, b) => a.daysUntilExpire - b.daysUntilExpire);
}

// 计算风险等级
function getRiskLevel(daysUntil: number, healthScore?: number): 'high' | 'medium' | 'low' {
  if (daysUntil <= 7) return 'high';
  if (daysUntil <= 30 || (healthScore && healthScore < 60)) return 'medium';
  return 'low';
}

// 日历单元格
function CalendarDay({
  date,
  renewals,
  isToday,
  isCurrentMonth,
  onSelect
}: {
  date: Date;
  renewals: Customer[];
  isToday: boolean;
  isCurrentMonth: boolean;
  onSelect: (renewals: Customer[]) => void;
}) {
  const dayRenewals = renewals.filter(r => {
    const expireDate = new Date(r.expireAt);
    return expireDate.getDate() === date.getDate() &&
           expireDate.getMonth() === date.getMonth() &&
           expireDate.getFullYear() === date.getFullYear();
  });
  
  const hasHighRisk = dayRenewals.some(r => {
    const days = Math.ceil((new Date(r.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 7;
  });
  
  const hasMediumRisk = dayRenewals.some(r => {
    const days = Math.ceil((new Date(r.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days > 7;
  });
  
  return (
    <motion.div
      whileHover={dayRenewals.length > 0 ? { scale: 1.05 } : {}}
      onClick={() => dayRenewals.length > 0 && onSelect(dayRenewals)}
      className={`
        min-h-[80px] p-2 rounded-lg border transition-all cursor-pointer
        ${isToday ? 'border-neon-cyan bg-neon-cyan/5' : 'border-gray-800'}
        ${!isCurrentMonth ? 'opacity-40' : ''}
        ${dayRenewals.length > 0 ? 'hover:border-neon-purple hover:bg-neon-purple/5' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${isToday ? 'text-neon-cyan' : 'text-gray-400'}`}>
          {date.getDate()}
        </span>
        {isToday && <span className="text-[10px] text-neon-cyan">今天</span>}
      </div>
      
      {dayRenewals.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            {hasHighRisk && <div className="w-2 h-2 rounded-full bg-red-500" />}
            {hasMediumRisk && <div className="w-2 h-2 rounded-full bg-amber-500" />}
            {!hasHighRisk && !hasMediumRisk && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
            <span className="text-xs font-medium">{dayRenewals.length}家</span>
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            {dayRenewals[0].companyName}
            {dayRenewals.length > 1 && ` +${dayRenewals.length - 1}`}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// 续约客户卡片
function RenewalCustomerCard({
  customer,
  daysUntil,
  onClick
}: {
  customer: Customer;
  daysUntil: number;
  onClick?: () => void;
}) {
  const riskLevel = getRiskLevel(daysUntil, customer.healthScore);
  const riskConfig = {
    high: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Clock },
    low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2 },
  };
  const config = riskConfig[riskLevel];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`p-3 rounded-lg border ${config.bg} ${config.border} cursor-pointer transition-all hover:brightness-110`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
            {customer.type === 'group' ? (
              <Building2 size={14} className={config.color} />
            ) : (
              <Building size={14} className={config.color} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{customer.companyName}</p>
            <p className="text-xs text-gray-500">
              {customer.type === 'group' ? '集团' : '单体'} · {customer.hotels.length}家门店
            </p>
          </div>
        </div>
        <div className={`text-right ${config.color}`}>
          <p className="text-lg font-bold">{daysUntil}</p>
          <p className="text-[10px]">天后</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-2 text-xs">
        <span className="text-gray-400">
          GMV: ¥{(customer.monthlyRevenue / 10000).toFixed(1)}万/月
        </span>
        {customer.healthScore && (
          <span className={`${customer.healthScore >= 80 ? 'text-emerald-400' : customer.healthScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            健康度: {customer.healthScore}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function RenewalCalendar({ customers, onSelectCustomer }: RenewalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateRenewals, setSelectedDateRenewals] = useState<Customer[] | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'group' | 'single'>('all');
  
  // 过滤客户
  const filteredCustomers = useMemo(() => {
    if (filterType === 'all') return customers;
    return customers.filter(c => c.type === filterType);
  }, [customers, filterType]);
  
  // 获取续约数据
  const renewals = useMemo(() => getUpcomingRenewals(filteredCustomers), [filteredCustomers]);
  
  // 日历数据
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month
      });
    }
    
    return days;
  }, [currentDate]);
  
  // 切换到上/下月
  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    setSelectedDateRenewals(null);
  };
  
  // 风险统计
  const riskStats = useMemo(() => {
    const high = renewals.filter(r => getRiskLevel(r.daysUntilExpire, r.healthScore) === 'high').length;
    const medium = renewals.filter(r => getRiskLevel(r.daysUntilExpire, r.healthScore) === 'medium').length;
    const low = renewals.filter(r => getRiskLevel(r.daysUntilExpire, r.healthScore) === 'low').length;
    return { high, medium, low, total: renewals.length };
  }, [renewals]);
  
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  
  return (
    <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
      {/* 头部 */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-amber/10 rounded-lg">
              <Calendar size={20} className="text-neon-amber" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">续约日历</h2>
              <p className="text-gray-400 text-sm">未来60天内 {riskStats.total} 个客户待续约</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 筛选 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0B0F19] rounded-lg">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent text-sm text-gray-300 focus:outline-none"
              >
                <option value="all">全部客户</option>
                <option value="group">集团客户</option>
                <option value="single">单体客户</option>
              </select>
            </div>
            
            {/* 月份切换 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="w-8 h-8 rounded-lg bg-[#0B0F19] hover:bg-[#1E2538] flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium w-24 text-center">
                {currentDate.getFullYear()}年{monthNames[currentDate.getMonth()]}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="w-8 h-8 rounded-lg bg-[#0B0F19] hover:bg-[#1E2538] flex items-center justify-center transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* 风险统计条 */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-400">高风险: <span className="text-red-400 font-medium">{riskStats.high}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-gray-400">中风险: <span className="text-amber-400 font-medium">{riskStats.medium}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-400">低风险: <span className="text-emerald-400 font-medium">{riskStats.low}</span></span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-[1fr,320px]">
        {/* 日历网格 */}
        <div className="p-5 border-r border-gray-800">
          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, isCurrentMonth }, index) => (
              <CalendarDay
                key={index}
                date={date}
                renewals={renewals}
                isToday={date.toDateString() === new Date().toDateString()}
                isCurrentMonth={isCurrentMonth}
                onSelect={setSelectedDateRenewals}
              />
            ))}
          </div>
        </div>
        
        {/* 侧边列表 */}
        <div className="p-5 bg-[#0B0F19]">
          <AnimatePresence mode="wait">
            {selectedDateRenewals ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {selectedDateRenewals[0]?.expireAt ? new Date(selectedDateRenewals[0].expireAt).toLocaleDateString() : '选中日期'}
                  </h3>
                  <button
                    onClick={() => setSelectedDateRenewals(null)}
                    className="text-xs text-neon-cyan hover:underline"
                  >
                    查看全部
                  </button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedDateRenewals.map(customer => (
                    <RenewalCustomerCard
                      key={customer.id}
                      customer={customer}
                      daysUntil={Math.ceil((new Date(customer.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                      onClick={() => onSelectCustomer?.(customer)}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="all"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <h3 className="font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="text-neon-amber" />
                  即将到期 ({renewals.length})
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {renewals.slice(0, 10).map(customer => (
                    <RenewalCustomerCard
                      key={customer.id}
                      customer={customer}
                      daysUntil={customer.daysUntilExpire}
                      onClick={() => onSelectCustomer?.(customer)}
                    />
                  ))}
                  {renewals.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                      <p>未来60天内无续约</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
