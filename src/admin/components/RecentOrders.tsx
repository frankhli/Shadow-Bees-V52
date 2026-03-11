/**
 * 实时订单组件
 */

import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { PlatformLogo } from './PlatformLogo';
import type { Platform } from '../stores/adminStore';

export function RecentOrders() {
  const orders = [
    { id: 'ORD7891', hotel: '三里屯潮流酒店', platform: 'xianyu' as Platform, amount: 350, time: '2分钟前' },
    { id: 'ORD7890', hotel: '崇礼星空酒店', platform: 'wechat' as Platform, amount: 420, time: '5分钟前' },
    { id: 'ORD7889', hotel: '大理洱海酒店', platform: 'xiaohongshu' as Platform, amount: 380, time: '8分钟前' },
    { id: 'ORD7888', hotel: '三里屯潮流酒店', platform: 'xianyu' as Platform, amount: 320, time: '12分钟前' },
    { id: 'ORD7887', hotel: '崇礼星空酒店', platform: 'wechat' as Platform, amount: 450, time: '15分钟前' },
  ];

  return (
    <div className="bg-[#151B2B] rounded-xl border border-gray-800 p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <PartyPopper size={18} className="text-neon-green" />
        实时订单
      </h3>
      <div className="space-y-3">
        {orders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-lg"
          >
            <div className="flex items-center gap-3">
              <PlatformLogo platform={order.platform} size={20} />
              <div>
                <p className="text-sm font-medium">{order.hotel}</p>
                <p className="text-xs text-gray-400">{order.id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-neon-cyan">¥{order.amount}</p>
              <p className="text-xs text-gray-400">{order.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
