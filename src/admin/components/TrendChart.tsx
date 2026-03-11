/**
 * 趋势图表组件
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function TrendChart() {
  const data = useMemo(() => {
    // 生成30天模拟数据
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        revenue: Math.floor(Math.random() * 50000) + 80000,
        orders: Math.floor(Math.random() * 200) + 300,
      };
    });
  }, []);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2538" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#151B2B',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: number) => [`¥${value.toLocaleString()}`, '营收']}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#00F0FF"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
