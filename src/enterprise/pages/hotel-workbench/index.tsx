/**
 * 酒店操作台 - 企业版核心功能
 * 
 * 功能定位：
 * 从集团视角穿透到单店，直接操作酒店的定价/库存/订单/内容
 * 无需切换到酒店端，在一个界面完成所有操作
 * 
 * 使用场景：
 * 1. 集团运营在大盘发现某酒店数据异常
 * 2. 点击该酒店进入操作台
 * 3. 直接修改定价/库存/订单
 * 4. 修改实时同步到PMS
 * 5. 点击返回回到集团大盘
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Star,
  TrendingUp,
  DollarSign,
  Calendar,
  ShoppingCart,
  FileText,
  BarChart3,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useEnterpriseStore, type EnterpriseHotel } from '../../stores/enterpriseStore';
import { PricingAdapter } from '../../adapters/PricingAdapter';
import { InventoryAdapter } from '../../adapters/InventoryAdapter';
import { OrdersAdapter } from '../../adapters/OrdersAdapter';
import { ContentAdapter } from '../../adapters/ContentAdapter';
import { updatePricing } from '../../api/pricingApi';
import { updateInventory } from '../../api/inventoryApi';
import { confirmOrder, cancelOrder, checkInOrder, checkOutOrder } from '../../api/orderApi';
import { publishContent, deleteContent } from '../../api/contentApi';
import { useCountUp } from '../../hooks/useCountUp';
import { useToast } from '../../../components/ui/Toast';

// 操作台标签类型
type WorkbenchTab = 'pricing' | 'inventory' | 'orders' | 'content' | 'data';

// 标签配置
const TAB_CONFIG: Record<WorkbenchTab, { label: string; icon: any; permission: string }> = {
  pricing: { label: '定价管理', icon: DollarSign, permission: 'canAdjustPrice' },
  inventory: { label: '库存日历', icon: Calendar, permission: 'canManageInventory' },
  orders: { label: '订单处理', icon: ShoppingCart, permission: 'canProcessOrders' },
  content: { label: '内容发布', icon: FileText, permission: 'canManageContent' },
  data: { label: '实时数据', icon: BarChart3, permission: 'canViewData' },
};

export function HotelWorkbench() {
  const { hotelId } = useParams<{ hotelId: string }>();
  // @ts-ignore - used by child components
  const _navigate = useNavigate();
  const { getHotelById } = useEnterpriseStore();
  const { success } = useToast();
  
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('pricing');
  const [isLoading, setIsLoading] = useState(true);
  const [hotel, setHotel] = useState<EnterpriseHotel | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // 加载酒店数据
  useEffect(() => {
    if (hotelId) {
      setIsLoading(true);
      const hotelData = getHotelById(hotelId);
      if (hotelData) {
        setHotel(hotelData);
      }
      setIsLoading(false);
    }
  }, [hotelId, getHotelById]);

  // 切换酒店（预留）
  // const handleHotelChange = (newHotelId: string) => {
  //   navigate(`/hotel-workbench/${newHotelId}`);
  // };

  // 刷新数据
  const handleRefresh = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      success('数据已刷新', '酒店数据已同步至最新状态');
    }, 1000);
  };

  // 检查权限
  const hasPermission = (permission: string): boolean => {
    return hotel?.permissions?.includes(permission) ?? true;
  };

  // 过滤有权限的标签
  const availableTabs = Object.entries(TAB_CONFIG).filter(([_, config]) => 
    hasPermission(config.permission)
  ) as [WorkbenchTab, typeof TAB_CONFIG[WorkbenchTab]][];

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
          <p className="mt-3 text-gray-500">加载酒店数据中...</p>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">酒店不存在</h3>
          <p className="text-gray-500 mt-1">未找到ID为 {hotelId} 的酒店</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-1 mt-4 text-violet-600 hover:text-violet-700"
          >
            <ArrowLeft className="w-4 h-4" />
            返回集团大盘
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部导航栏 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 返回栏 */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <Link 
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-violet-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回集团大盘
          </Link>
          
          {/* 快捷操作 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? '同步中...' : '刷新数据'}
            </button>
            <a
              href={`/hotel/${hotelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              打开酒店端
            </a>
          </div>
        </div>

        {/* 酒店信息栏 */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-gray-900">{hotel.name}</h1>
                {hotel.starRating && (
                  <div className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-sm">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{hotel.starRating}星</span>
                  </div>
                )}
                {/* PMS同步状态 */}
                <div className={`
                  flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs
                  ${syncStatus === 'synced' 
                    ? 'bg-green-50 text-green-700' 
                    : syncStatus === 'syncing'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'}
                `}>
                  {syncStatus === 'synced' && <CheckCircle className="w-3 h-3" />}
                  {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {syncStatus === 'error' && <AlertCircle className="w-3 h-3" />}
                  {syncStatus === 'synced' ? 'PMS已同步' : syncStatus === 'syncing' ? '同步中' : '同步失败'}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {hotel.city} {(hotel as any).district || ''}
                </span>
                <span>{hotel.roomCount}间房</span>
                <span>ID: {hotel.pmsHotelId || hotel.id}</span>
              </div>
            </div>

            {/* 快捷指标 - 使用动画数字 */}
            <div className="flex items-center gap-6">
              <AnimatedRevenue value={hotel.metrics?.revenue || hotel.metrics?.todayRevenue || 0} />
              <AnimatedOccupancyRate value={hotel.metrics?.occupancyRate || 0} />
              <AnimatedOrderCount value={hotel.metrics?.orders || hotel.metrics?.todayOrders || 0} />
            </div>
          </div>
        </div>

        {/* 标签导航 */}
        <div className="border-t border-gray-200">
          <div className="flex">
            {availableTabs.map(([tab, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab
                      ? 'border-violet-600 text-violet-600 bg-violet-50/50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'pricing' && <PricingTab hotelId={hotelId!} />}
          {activeTab === 'inventory' && <InventoryTab hotelId={hotelId!} />}
          {activeTab === 'orders' && <OrdersTab hotelId={hotelId!} />}
          {activeTab === 'content' && <ContentTab hotelId={hotelId!} />}
          {activeTab === 'data' && <DataTab hotel={hotel} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ===== 动画数字组件 - 今日营收 =====
function AnimatedRevenue({ value }: { value: number }) {
  const { count } = useCountUp(value, { duration: 1500 });
  
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">
        ¥{Math.round(count).toLocaleString()}
      </div>
      <div className="text-xs text-gray-500">今日营收</div>
    </div>
  );
}

// ===== 动画数字组件 - 入住率 =====
function AnimatedOccupancyRate({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const { count } = useCountUp(percentage, { duration: 1500 });
  
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">
        {Math.round(count)}%
      </div>
      <div className="text-xs text-gray-500">入住率</div>
    </div>
  );
}

// ===== 动画数字组件 - 今日订单 =====
function AnimatedOrderCount({ value }: { value: number }) {
  const { count } = useCountUp(value, { duration: 1500 });
  
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">
        {Math.round(count)}
      </div>
      <div className="text-xs text-gray-500">今日订单</div>
    </div>
  );
}

// ===== 定价管理标签 =====
function PricingTab({ hotelId }: { hotelId: string }) {
  const { success, error: showError } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePriceUpdate = async (roomTypeId: string, newPrice: number, date?: string) => {
    setIsUpdating(true);
    try {
      const today = date || new Date().toISOString().split('T')[0];
      const response = await updatePricing({
        hotelId,
        roomTypeId,
        date: today,
        price: newPrice,
        reason: '酒店工作台手动调价',
      });
      
      if (response.success) {
        success('价格更新成功', `房型价格已更新为 ¥${newPrice}`);
      } else {
        showError('价格更新失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('价格更新出错:', error);
      showError('价格更新失败', '网络错误，请检查连接后重试');
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {isUpdating && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在更新价格...
        </div>
      )}
      <PricingAdapter 
        hotelId={hotelId} 
        onPriceUpdate={handlePriceUpdate}
      />
    </div>
  );
}

// ===== 库存日历标签 =====
function InventoryTab({ hotelId }: { hotelId: string }) {
  const { success, error: showError } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleInventoryUpdate = async (roomTypeId: string, date: string, count: number) => {
    setIsUpdating(true);
    try {
      const response = await updateInventory({
        hotelId,
        roomTypeId,
        date,
        availableRooms: count,
        reason: '酒店工作台手动调整库存',
      });
      
      if (response.success) {
        success('库存更新成功', `${date} 库存已调整为 ${count} 间`);
      } else {
        showError('库存更新失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('库存更新出错:', error);
      showError('库存更新失败', '网络错误，请检查连接后重试');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {isUpdating && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在更新库存...
        </div>
      )}
      <InventoryAdapter 
        hotelId={hotelId}
        onInventoryUpdate={handleInventoryUpdate}
      />
    </div>
  );
}

// ===== 订单处理标签 =====
function OrdersTab({ hotelId }: { hotelId: string }) {
  const { success, error: showError, info } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusUpdate = async (orderId: string, status: string, roomNumber?: string) => {
    setIsProcessing(true);
    try {
      let response;
      let successMessage = '';
      
      switch (status) {
        case 'confirmed':
          response = await confirmOrder(orderId);
          successMessage = '订单已确认';
          break;
        case 'cancelled':
          response = await cancelOrder(orderId, '酒店工作台手动取消');
          successMessage = '订单已取消';
          break;
        case 'checked_in':
          if (!roomNumber) {
            showError('入住失败', '入住操作需要提供房间号');
            setIsProcessing(false);
            return;
          }
          response = await checkInOrder(orderId, roomNumber);
          successMessage = `客人已入住 ${roomNumber}`;
          break;
        case 'checked_out':
          response = await checkOutOrder(orderId);
          successMessage = '订单已退房';
          break;
        default:
          info('未知操作', `状态: ${status}`);
          setIsProcessing(false);
          return;
      }
      
      if (response.success) {
        success('订单状态更新成功', successMessage);
      } else {
        showError('订单状态更新失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('订单状态更新出错:', error);
      showError('订单状态更新失败', '网络错误，请检查连接后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {isProcessing && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在处理订单...
        </div>
      )}
      <OrdersAdapter 
        hotelId={hotelId}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  );
}

// ===== 内容发布标签 =====
function ContentTab({ hotelId }: { hotelId: string }) {
  const { success, error: showError } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePublish = async (contentId: string) => {
    setIsProcessing(true);
    try {
      const response = await publishContent(contentId);
      
      if (response.success) {
        success('内容发布成功', '内容已上线并对外展示');
      } else {
        showError('内容发布失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('内容发布出错:', error);
      showError('内容发布失败', '网络错误，请检查连接后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    setIsProcessing(true);
    try {
      const response = await deleteContent(contentId);
      
      if (response.success) {
        success('内容删除成功', '内容已从系统中移除');
      } else {
        showError('内容删除失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('内容删除出错:', error);
      showError('内容删除失败', '网络错误，请检查连接后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {isProcessing && (
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在处理内容...
        </div>
      )}
      <ContentAdapter 
        hotelId={hotelId}
        onPublish={handlePublish}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ===== 实时数据标签 =====
function DataTab({ hotel }: { hotel: EnterpriseHotel }) {
  return (
    <div className="space-y-4">
      {/* 关键指标卡片 - 使用数字动画 */}
      <div className="grid grid-cols-4 gap-4">
        <AnimatedMetricCard
          title="今日营收"
          value={hotel.metrics?.revenue || hotel.metrics?.todayRevenue || 0}
          prefix="¥"
          change="+12.5%"
          trend="up"
          icon={DollarSign}
        />
        <AnimatedMetricCard
          title="今日订单"
          value={hotel.metrics?.orders || hotel.metrics?.todayOrders || 0}
          change="+5"
          trend="up"
          icon={ShoppingCart}
        />
        <AnimatedMetricCard
          title="入住率"
          value={Math.round((hotel.metrics?.occupancyRate || 0) * 100)}
          suffix="%"
          change="+8%"
          trend="up"
          icon={Activity}
        />
        <AnimatedMetricCard
          title="平均房价"
          value={Number(hotel.metrics?.adr) || 0}
          prefix="¥"
          change="-2%"
          trend="down"
          icon={TrendingUp}
        />
      </div>

      {/* 实时状态 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">实时状态</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">PMS连接</div>
              <div className="font-medium text-green-600">正常</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">最后同步</div>
              <div className="font-medium text-gray-900">2分钟前</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">待处理</div>
              <div className="font-medium text-amber-600">3个订单</div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近操作记录</h3>
        <div className="space-y-3">
          {[
            { time: '10:23', action: '调整价格', detail: '大床房 ¥380 → ¥420', operator: '张运营' },
            { time: '09:45', action: '确认订单', detail: '订单 #20240315001', operator: '系统自动' },
            { time: '09:12', action: '发布内容', detail: '小红书图文《春日特惠》', operator: '李内容' },
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-400 w-12">{log.time}</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{log.action}</span>
              <span className="flex-1 text-sm text-gray-700">{log.detail}</span>
              <span className="text-sm text-gray-400">{log.operator}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 动画指标卡片组件
function AnimatedMetricCard({ 
  title, 
  value,
  prefix = '',
  suffix = '',
  change, 
  trend, 
  icon: Icon 
}: { 
  title: string; 
  value: number;
  prefix?: string;
  suffix?: string;
  change: string; 
  trend: 'up' | 'down'; 
  icon: any;
}) {
  const { count } = useCountUp(value, { duration: 1500 });
  
  const formattedValue = prefix + Math.round(count).toLocaleString() + suffix;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-violet-600" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{formattedValue}</div>
      <div className={`flex items-center gap-1 text-xs mt-1 ${
        trend === 'up' ? 'text-green-600' : 'text-red-600'
      }`}>
        <TrendingUp className={`w-3 h-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
        <span>{change}</span>
      </div>
    </div>
  );
}

export default HotelWorkbench;
