/**
 * 头部客户组件 - 使用真实数据
 * 基于 customerSuccessService 计算
 */

import { motion } from 'framer-motion';
import { Crown, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';
import { useAdminStore } from '../stores/adminStore';
import { calculateAllCustomerHealth } from '../services/customerSuccessService';

export function TopCustomers() {
  const { customers, contentItems, tickets } = useAdminStore();

  // 使用统一的客户成功计算服务
  const healthScores = useMemo(() => {
    return calculateAllCustomerHealth(customers, contentItems, tickets);
  }, [customers, contentItems, tickets]);

  // 按健康度排序取前5
  const topCustomers = useMemo(() => {
    return [...healthScores]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5);
  }, [healthScores]);

  // 计算平均健康度作为对比基准
  const avgHealth = useMemo(() => {
    if (healthScores.length === 0) return 0;
    return Math.round(healthScores.reduce((sum, h) => sum + h.overallScore, 0) / healthScores.length);
  }, [healthScores]);

  return (
    <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Crown size={18} className="text-neon-amber" />
        头部客户
        <span className="text-xs text-gray-400 font-normal">本月GMV · 健康度</span>
      </h3>
      <div className="space-y-3">
        {topCustomers.map((customer, index) => {
          const isHealthy = customer.overallScore >= avgHealth;
          const levelColor = customer.level === 'healthy' ? 'text-emerald-400' : 
                            customer.level === 'warning' ? 'text-amber-400' : 'text-red-400';
          
          return (
            <motion.div
              key={customer.customerId}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg hover:bg-[#1E2538] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-neon-cyan/10 text-neon-cyan">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium">{customer.customerName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs flex items-center gap-0.5 ${levelColor}`}>
                      {isHealthy ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      健康度 {customer.overallScore}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  customer.level === 'healthy' ? 'bg-emerald-500/10' :
                  customer.level === 'warning' ? 'bg-amber-500/10' : 'bg-red-500/10'
                }`}>
                  <span className={`text-sm font-bold ${levelColor}`}>
                    {customer.overallScore}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {topCustomers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>暂无客户数据</p>
        </div>
      )}
    </div>
  );
}
