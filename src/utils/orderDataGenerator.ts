/**
 * Shadow-Bees V52 - 订单数据生成器
 * 生成预设历史订单 + 支持实时订单追加
 * Version: 2.0 - 修复今日订单时间戳生成问题
 */

import type { Transaction, OrderStatus, Platform } from '@/types';
import { generateId } from './helpers';

const platforms: Platform[] = ['xianyu', 'xiaohongshu', 'wechat'];
const roomTypes = ['舒适标准房', '经济特价房', '行政豪华套房'];

// 生成随机日期（在指定天数范围内）
// V3: 修复 - 确保不会生成未来时间
// 对于今日订单，请使用 generateTodayOrders 或在 generateOrder 中传入 timestampDaysAgo=0
function generateRandomDate(daysAgo: number, daysForward: number = 0): string {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * (daysAgo + daysForward + 1)) - daysAgo;
  
  // 如果是今天（randomDays === 0），确保时间不超过当前时间
  if (randomDays === 0) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const randomHour = Math.floor(Math.random() * (currentHour + 1));
    const randomMinute = randomHour === currentHour 
      ? Math.floor(Math.random() * (currentMinute + 1))
      : Math.floor(Math.random() * 60);
    
    // 直接构造目标时间
    const orderDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      randomHour,
      randomMinute,
      0,
      0
    );
    return orderDate.toISOString();
  }
  
  // 不是今天，可以任意时间
  const date = new Date(now);
  date.setDate(date.getDate() + randomDays);
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date.toISOString();
}

// 生成随机入住日期
function generateStayDates(): { checkInDate: string; checkOutDate: string; stayNights: number } {
  const checkIn = new Date();
  // 提前0-14天预订
  const advanceDays = Math.floor(Math.random() * 15);
  checkIn.setDate(checkIn.getDate() + advanceDays);
  
  // 住1-3晚
  const stayNights = 1 + Math.floor(Math.random() * 3);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + stayNights);
  
  return {
    checkInDate: checkIn.toISOString().split('T')[0],
    checkOutDate: checkOut.toISOString().split('T')[0],
    stayNights,
  };
}

// 生成单笔订单
function generateOrder(
  hotelId: string,
  basePrice: number,
  status: OrderStatus,
  timestampDaysAgo: number
): Transaction {
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
  const { checkInDate, checkOutDate, stayNights } = generateStayDates();
  
  // 根据房型调整价格
  const roomMultiplier = roomType === '经济特价房' ? 0.7 : roomType === '行政豪华套房' ? 1.5 : 1;
  const price = Math.round(basePrice * roomMultiplier * (0.9 + Math.random() * 0.2));
  
  // 平台系数
  const platformCoefficients: Record<Platform, number> = {
    xianyu: 1.08,
    xiaohongshu: 1.0,
    wechat: 0.95,
  };
  
  const finalPrice = Math.round(price * platformCoefficients[platform]);
  const serviceFee = Math.round(finalPrice * 0.06);
  
  // 生成时间戳：如果是今日订单（timestampDaysAgo === 0），则时间在0点到当前时间之间
  let timestamp: string;
  if (timestampDaysAgo === 0) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const randomHour = Math.floor(Math.random() * (currentHour + 1));
    const randomMinute = randomHour === currentHour 
      ? Math.floor(Math.random() * (currentMinute + 1))
      : Math.floor(Math.random() * 60);
    
    // 直接构造目标时间：今天 randomHour:randomMinute
    const orderDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      randomHour,
      randomMinute,
      0,
      0
    );
    timestamp = orderDate.toISOString();
  } else {
    timestamp = generateRandomDate(timestampDaysAgo);
  }
  
  return {
    id: generateId('TXN'),
    hotelId,
    roomType,
    platform,
    price: finalPrice,
    timestamp,
    orderNo: generateId('ORD'),
    status,
    checkInDate,
    checkOutDate,
    stayNights,
    financials: {
      gross: finalPrice,
      serviceFee,
      net: finalPrice - serviceFee,
    },
  };
}

// 根据状态分配数量（确保各状态分布合理）
function distributeStatus(total: number): Record<OrderStatus, number> {
  const distribution: Record<OrderStatus, number> = {
    pending: 0, paid: 0, checked_in: 0, checked_out: 0, invoiced: 0, refunded: 0,
    refund_pending: 0, cancelled: 0,
  };
  
  // 退款率约 5%
  distribution.refunded = Math.floor(total * 0.05);
  
  // 退款待处理约 2%
  distribution.refund_pending = Math.floor(total * 0.02);
  
  // 已完成（已开票）约 40%
  distribution.invoiced = Math.floor(total * 0.40);
  
  // 已离店待开票约 15%
  distribution.checked_out = Math.floor(total * 0.15);
  
  // 在住约 10%
  distribution.checked_in = Math.floor(total * 0.10);
  
  // 已付款待入住约 20%
  distribution.paid = Math.floor(total * 0.20);
  
  // 待确认约 8%
  distribution.pending = total - 
    distribution.refunded - 
    distribution.refund_pending -
    distribution.invoiced - 
    distribution.checked_out - 
    distribution.checked_in - 
    distribution.paid;
  
  return distribution;
}

// 历史订单状态分配（排除 pending，因为待确认订单当日必须处理）
function distributeStatusForHistory(total: number): Record<OrderStatus, number> {
  const distribution: Record<OrderStatus, number> = {
    pending: 0, paid: 0, checked_in: 0, checked_out: 0, invoiced: 0, refunded: 0,
    refund_pending: 0, cancelled: 0,
  };
  
  // 退款率约 5%
  distribution.refunded = Math.floor(total * 0.05);
  
  // 退款待处理约 2%
  distribution.refund_pending = Math.floor(total * 0.02);
  
  // 已完成（已开票）约 45%（pending 的份额分配到这里）
  distribution.invoiced = Math.floor(total * 0.45);
  
  // 已离店待开票约 15%
  distribution.checked_out = Math.floor(total * 0.15);
  
  // 在住约 10%
  distribution.checked_in = Math.floor(total * 0.10);
  
  // 已付款待入住约 23%（pending 的份额分配到这里）
  distribution.paid = total - 
    distribution.refunded - 
    distribution.refund_pending -
    distribution.invoiced - 
    distribution.checked_out - 
    distribution.checked_in;
  
  // pending 保持为 0（历史订单没有待确认）
  distribution.pending = 0;
  
  return distribution;
}

/**
 * 生成今日预设订单
 * 时间戳在今日0点到当前时间之间（模拟今日已产生的订单）
 */
export function generateTodayOrders(hotelId: string, basePrice: number, count: number): Transaction[] {
  const distribution = distributeStatus(count);
  const orders: Transaction[] = [];
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 为每种状态生成订单（时间戳在今日0点到当前时间之间）
  (Object.keys(distribution) as OrderStatus[]).forEach((status) => {
    const statusCount = distribution[status];
    for (let i = 0; i < statusCount; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
      
      // 生成今日0点到当前时间之间的随机时间戳
      // 方案：直接构造今天的随机时间，避免计算误差
      const randomHour = Math.floor(Math.random() * (currentHour + 1));
      const randomMinute = randomHour === currentHour 
        ? Math.floor(Math.random() * (currentMinute + 1))
        : Math.floor(Math.random() * 60);
      
      // 直接构造目标时间：今天 randomHour:randomMinute
      const orderDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        randomHour,
        randomMinute,
        0,
        0
      );
      const timestamp = orderDate.toISOString();
      
      // 生成入住日期（今日起0-3天后）
      const advanceDays = Math.floor(Math.random() * 4);
      const checkInDate = new Date(now);
      checkInDate.setDate(checkInDate.getDate() + advanceDays);
      const checkInDateStr = checkInDate.toISOString().split('T')[0];
      
      const stayNights = 1 + Math.floor(Math.random() * 3);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkInDate.getDate() + stayNights);
      const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
      
      // 计算价格
      const roomMultiplier = roomType === '经济特价房' ? 0.7 : roomType === '行政豪华套房' ? 1.5 : 1;
      const price = Math.round(basePrice * roomMultiplier * (0.9 + Math.random() * 0.2));
      const platformCoefficients: Record<Platform, number> = { xianyu: 1.08, xiaohongshu: 1.0, wechat: 0.95 };
      const finalPrice = Math.round(price * platformCoefficients[platform]);
      const serviceFee = Math.round(finalPrice * 0.06);
      
      orders.push({
        id: generateId('TXN'),
        hotelId,
        roomType,
        platform,
        price: finalPrice,
        timestamp,
        orderNo: generateId('ORD'),
        status,
        checkInDate: checkInDateStr,
        checkOutDate: checkOutDateStr,
        stayNights,
        financials: {
          gross: finalPrice,
          serviceFee,
          net: finalPrice - serviceFee,
        },
      });
      

    }
  });
  
  // 按时间倒序排列（最新的在前）
  return orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * 生成本周预设订单（含今日）
 */
export function generateWeekOrders(hotelId: string, basePrice: number, count: number): Transaction[] {
  const orders: Transaction[] = [];
  
  // 今日订单（30%）
  const todayCount = Math.floor(count * 0.3);
  orders.push(...generateTodayOrders(hotelId, basePrice, todayCount));
  
  // 本周其他日期订单（70%）- 历史订单使用 distributeStatusForHistory（排除 pending）
  const otherDaysCount = count - todayCount;
  const historyDistribution = distributeStatusForHistory(otherDaysCount);
  
  (Object.keys(historyDistribution) as OrderStatus[]).forEach((status) => {
    const statusCount = historyDistribution[status];
    for (let i = 0; i < statusCount; i++) {
      // 时间戳在1-6天前
      orders.push(generateOrder(hotelId, basePrice, status, 1 + Math.floor(Math.random() * 6)));
    }
  });
  
  return orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * 生成本月预设订单（含本周）
 */
export function generateMonthOrders(hotelId: string, basePrice: number, count: number): Transaction[] {
  const orders: Transaction[] = [];
  
  // 本周订单（40%）
  const weekCount = Math.floor(count * 0.4);
  orders.push(...generateWeekOrders(hotelId, basePrice, weekCount));
  
  // 本月其他日期订单（60%）- 历史订单使用 distributeStatusForHistory（排除 pending）
  const otherDaysCount = count - weekCount;
  const historyDistribution = distributeStatusForHistory(otherDaysCount);
  
  (Object.keys(historyDistribution) as OrderStatus[]).forEach((status) => {
    const statusCount = historyDistribution[status];
    for (let i = 0; i < statusCount; i++) {
      // 时间戳在7-30天前
      orders.push(generateOrder(hotelId, basePrice, status, 7 + Math.floor(Math.random() * 24)));
    }
  });
  
  return orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * 生成完整预设订单数据
 * 用于初始化应用时的默认订单
 */
export function generatePresetOrders(
  hotelId: string, 
  roomTypes: { floorPrice: number; ceilingPrice: number }[]
): Transaction[] {
  // 计算平均基础价格
  const avgBasePrice = Math.round(
    roomTypes.reduce((sum, r) => sum + (r.floorPrice + r.ceilingPrice) / 2, 0) / roomTypes.length
  );
  
  // 生成约 50-80 笔订单作为基础数据
  const totalCount = 50 + Math.floor(Math.random() * 31);
  
  return generateMonthOrders(hotelId, avgBasePrice, totalCount);
}

/**
 * 筛选指定日期范围内的订单
 */
export function filterOrdersByDateRange(
  orders: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  return orders.filter(order => {
    const orderDate = new Date(order.timestamp);
    return orderDate >= startDate && orderDate <= endDate;
  });
}

/**
 * 按状态统计订单数量
 */
export function countOrdersByStatus(orders: Transaction[]): Record<OrderStatus, number> {
  const counts: Record<OrderStatus, number> = {
    pending: 0, paid: 0, checked_in: 0, checked_out: 0, invoiced: 0, refunded: 0,
    refund_pending: 0, cancelled: 0,
  };
  
  orders.forEach(order => {
    counts[order.status] = (counts[order.status] || 0) + 1;
  });
  
  return counts;
}

/**
 * 生成测试用订单（用于演示退款流转）
 * 包含各种状态的订单，入住日期分散到未来30-90天，便于库存日历可视化
 * V2: 支持传入房型列表，适配多酒店
 */
export function generateTestOrders(
  hotelId: string, 
  basePrice: number, 
  roomTypes?: { name: string; floorPrice: number; ceilingPrice: number }[]
): Transaction[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // 使用传入的房型或默认房型
  const rooms = roomTypes || [
    { name: '舒适标准房', floorPrice: 260, ceilingPrice: 420 },
    { name: '经济特价房(无窗)', floorPrice: 150, ceilingPrice: 280 },
    { name: '行政豪华套房', floorPrice: 450, ceilingPrice: 680 },
  ];
  
  // 根据房型动态选择
  const getRoom = (index: number) => rooms[index % rooms.length];
  
  // 生成今日0点到当前时间之间的随机时间
  const generateTodayTimestamp = () => {
    const randomHour = Math.floor(Math.random() * (currentHour + 1));
    const randomMinute = randomHour === currentHour 
      ? Math.floor(Math.random() * (currentMinute + 1))
      : Math.floor(Math.random() * 60);
    
    // 直接构造目标时间：今天 randomHour:randomMinute
    const orderDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      randomHour,
      randomMinute,
      0,
      0
    );
    return orderDate.toISOString();
  };
  
  // 生成未来日期的辅助函数（未来1-14天）
  const generateFutureDate = (daysFromNow: number): string => {
    const date = new Date(now);
    date.setDate(date.getDate() + daysFromNow);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // 分散的入住日期（未来30-90天），错开初始化预占，便于测试
  const dates = {
    day30: generateFutureDate(30),   // 30天后
    day35: generateFutureDate(35),   // 35天后
    day40: generateFutureDate(40),   // 40天后
    day45: generateFutureDate(45),   // 45天后
    day60: generateFutureDate(60),   // 60天后
    day75: generateFutureDate(75),   // 75天后
    day90: generateFutureDate(90),   // 90天后
  };
  
  const testOrders: Transaction[] = [
    // 1. 待确认订单（30天后入住，住2晚）- 分散日期展示
    {
      id: 'TXN-TEST-001',
      hotelId,
      roomType: getRoom(0).name,
      platform: 'xianyu',
      price: basePrice,
      timestamp: generateTodayTimestamp(),
      orderNo: 'ORD-TEST-001',
      status: 'pending',
      checkInDate: dates.day30,
      checkOutDate: dates.day35,
      stayNights: 5,
      financials: {
        gross: basePrice,
        serviceFee: Math.round(basePrice * 0.06),
        net: basePrice - Math.round(basePrice * 0.06),
      },
    },
    // 2. 待确认订单（40天后入住，住2晚）- 分散日期展示
    {
      id: 'TXN-TEST-002',
      hotelId,
      roomType: getRoom(1).name,
      platform: 'xiaohongshu',
      price: Math.round(basePrice * 0.8),
      timestamp: generateTodayTimestamp(),
      orderNo: 'ORD-TEST-002',
      status: 'pending',
      checkInDate: dates.day40,
      checkOutDate: dates.day45,
      stayNights: 5,
      financials: {
        gross: Math.round(basePrice * 0.8),
        serviceFee: Math.round(basePrice * 0.8 * 0.06),
        net: Math.round(basePrice * 0.8) - Math.round(basePrice * 0.8 * 0.06),
      },
    },
    // 3. 退款待处理订单（60天后入住）- 退款流程演示
    {
      id: 'TXN-TEST-003',
      hotelId,
      roomType: getRoom(0).name,
      platform: 'wechat',
      price: Math.round(basePrice * 0.9),
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      orderNo: 'ORD-TEST-003',
      status: 'refund_pending',
      checkInDate: dates.day60,
      checkOutDate: dates.day75,
      stayNights: 15,
      refundReason: '客户行程变更',
      financials: {
        gross: Math.round(basePrice * 0.9),
        serviceFee: Math.round(basePrice * 0.9 * 0.06),
        net: Math.round(basePrice * 0.9) - Math.round(basePrice * 0.9 * 0.06),
      },
    },
    // 4. 退款待处理订单（连住订单，75天后入住）
    {
      id: 'TXN-TEST-004',
      hotelId,
      roomType: getRoom(2).name,
      platform: 'xianyu',
      price: Math.round(basePrice * 1.5 * 2),
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      orderNo: 'ORD-TEST-004',
      status: 'refund_pending',
      checkInDate: dates.day75,
      checkOutDate: dates.day90,
      stayNights: 15,
      refundReason: '酒店原因：房间维修',
      financials: {
        gross: Math.round(basePrice * 1.5 * 2),
        serviceFee: Math.round(basePrice * 1.5 * 2 * 0.06),
        net: Math.round(basePrice * 1.5 * 2) - Math.round(basePrice * 1.5 * 2 * 0.06),
      },
    },
    // 5. 已退款订单（不占用库存，30天前入住）
    {
      id: 'TXN-TEST-005',
      hotelId,
      roomType: getRoom(1).name,
      platform: 'xiaohongshu',
      price: Math.round(basePrice * 0.7),
      timestamp: new Date(Date.now() - 259200000).toISOString(),
      orderNo: 'ORD-TEST-005',
      status: 'refunded',
      checkInDate: dates.day30,
      checkOutDate: dates.day35,
      stayNights: 5,
      refund: {
        amount: Math.round(basePrice * 0.7),
        reason: '客户取消',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
      },
      financials: {
        gross: Math.round(basePrice * 0.7),
        serviceFee: Math.round(basePrice * 0.7 * 0.06),
        net: Math.round(basePrice * 0.7) - Math.round(basePrice * 0.7 * 0.06),
      },
    },
    // 6. 已付款订单（已确认，90天后入住，连住10晚）
    {
      id: 'TXN-TEST-006',
      hotelId,
      roomType: getRoom(0).name,
      platform: 'wechat',
      price: basePrice,
      timestamp: new Date(Date.now() - 43200000).toISOString(),
      orderNo: 'ORD-TEST-006',
      status: 'paid',
      checkInDate: dates.day90,
      checkOutDate: generateFutureDate(100),
      stayNights: 10,
      financials: {
        gross: basePrice,
        serviceFee: Math.round(basePrice * 0.06),
        net: basePrice - Math.round(basePrice * 0.06),
      },
    },
  ];
  
  return testOrders;
}
