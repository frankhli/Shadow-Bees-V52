import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Building2, Users, FileText, ChevronRight, Check, MapPin, 
  Image as ImageIcon, Plus, Trash2, Shield,
  AlertTriangle, Bed, Settings, UserCircle, Crown, User as UserIcon, X,
  Briefcase, Bell, Moon, Sun, Download, Database, Save, Eye,
  HardDrive, Activity, Clock, RotateCcw, Sparkles, Palette,
  Volume2, Mail, Smartphone, Trash, Archive, FileDown,
  Lock, Unlock, Edit3, CheckCircle2, AlertCircle,
  Info, ShoppingCart, Keyboard
} from 'lucide-react';
import { useUnifiedStore, demoUsers } from '@/stores/unifiedStore';
import { ShortcutSettings } from '@/components/ux';
import packageInfo from '../../package.json';

import type { UserRole, User, Hotel } from '@/types';

// ============================================
// 预设数据
// ============================================

// 预设酒店图片
const presetImages = [
  { id: 'hotel-ext-1', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', label: '现代酒店外观' },
  { id: 'hotel-ext-2', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400', label: '精品酒店外观' },
  { id: 'hotel-int-1', url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400', label: '大堂环境A' },
  { id: 'hotel-int-2', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400', label: '大堂环境B' },
  { id: 'room-1', url: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=400', label: '经济房' },
  { id: 'room-2', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400', label: '标准房' },
  { id: 'room-3', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', label: '豪华房' },
  { id: 'room-4', url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400', label: '套房' },
];

// 中国城市数据（扩展版）
const chinaCities = [
  { province: '北京', city: '北京', districts: ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '通州区'] },
  { province: '上海', city: '上海', districts: ['黄浦区', '静安区', '浦东新区', '徐汇区', '长宁区', '虹口区'] },
  { province: '广东', city: '广州', districts: ['天河区', '越秀区', '海珠区', '白云区', '番禺区', '黄埔区'] },
  { province: '广东', city: '深圳', districts: ['福田区', '南山区', '罗湖区', '宝安区', '龙岗区', '龙华区'] },
  { province: '浙江', city: '杭州', districts: ['西湖区', '上城区', '滨江区', '拱墅区', '余杭区', '萧山区'] },
  { province: '四川', city: '成都', districts: ['锦江区', '武侯区', '青羊区', '金牛区', '成华区', '高新区'] },
  { province: '江苏', city: '南京', districts: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '栖霞区', '雨花台区'] },
  { province: '湖北', city: '武汉', districts: ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '洪山区'] },
  { province: '陕西', city: '西安', districts: ['新城区', '碑林区', '莲湖区', '雁塔区', '未央区', '灞桥区'] },
  { province: '重庆', city: '重庆', districts: ['渝中区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '渝北区'] },
  { province: '天津', city: '天津', districts: ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区'] },
  { province: '云南', city: '大理', districts: ['古城区', '下关区', '经济开发区'] },
  { province: '河北', city: '张家口', districts: ['崇礼区', '桥东区', '桥西区', '宣化区'] },
  { province: '山东', city: '青岛', districts: ['市南区', '市北区', '李沧区', '崂山区', '城阳区', '黄岛区'] },
  { province: '福建', city: '厦门', districts: ['思明区', '湖里区', '集美区', '海沧区', '同安区', '翔安区'] },
];

// 预设竞品
const presetCompetitors = [
  { name: '亚朵酒店', brand: '亚朵', rating: 4.7, basePrice: 450 },
  { name: '桔子水晶', brand: '华住', rating: 4.5, basePrice: 420 },
  { name: '全季酒店', brand: '华住', rating: 4.3, basePrice: 350 },
  { name: '如家精选', brand: '首旅', rating: 4.1, basePrice: 280 },
  { name: '汉庭酒店', brand: '华住', rating: 4.0, basePrice: 220 },
  { name: '7天酒店', brand: '铂涛', rating: 3.8, basePrice: 180 },
  { name: '锦江之星', brand: '锦江', rating: 3.9, basePrice: 200 },
  { name: '维也纳酒店', brand: '锦江', rating: 4.2, basePrice: 320 },
  { name: '麗枫酒店', brand: '铂涛', rating: 4.4, basePrice: 380 },
  { name: '希岸酒店', brand: '锦江', rating: 4.0, basePrice: 260 },
];

// 预设房型模板
const roomTypeTemplates = [
  { name: '经济特价房', area: 20, beds: '1张单人床', floorPrice: 180, ceilingPrice: 350, count: 15 },
  { name: '舒适标准房', area: 28, beds: '2张单人床', floorPrice: 250, ceilingPrice: 480, count: 30 },
  { name: '商务大床房', area: 32, beds: '1张大床', floorPrice: 320, ceilingPrice: 580, count: 25 },
  { name: '豪华套房', area: 55, beds: '1张大床+客厅', floorPrice: 580, ceilingPrice: 1200, count: 8 },
  { name: '家庭房', area: 40, beds: '1张大床+1张单人床', floorPrice: 420, ceilingPrice: 780, count: 10 },
  { name: '观景房', area: 35, beds: '1张大床', floorPrice: 480, ceilingPrice: 880, count: 5 },
];

// ============================================
// 主组件
// ============================================

export default function SystemSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, auditLogs, initHotel, transactions, contents, currentHotel } = useUnifiedStore();
  const toast = useToast();
  
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(
    tabFromUrl || 'overview'
  );
  
  // 真实的存储使用情况
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    total: number;
    percent: number;
    isSupported: boolean;
  }>({
    used: 0,
    total: 0,
    percent: 0,
    isSupported: false,
  });
  
  // 获取真实存储使用情况
  useEffect(() => {
    const getStorageInfo = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const used = estimate.usage || 0;
          const total = estimate.quota || 0;
          const percent = total > 0 ? Math.round((used / total) * 100) : 0;
          setStorageInfo({ used, total, percent, isSupported: true });
        } catch (e) {
          console.warn('无法获取存储信息:', e);
          setStorageInfo(prev => ({ ...prev, isSupported: false }));
        }
      }
    };
    getStorageInfo();
  }, []);
  
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // 检查用户权限
  const canInitHotel = user.role === 'owner' || user.permissions.canInitHotel;
  const canViewPermissions = user.role === 'owner' || user.role === 'manager';
  const canViewAudit = user.permissions.canViewAudit;

  // 计算真实运行时间（从页面加载开始）
  const [uptime, setUptime] = useState({
    startTime: Date.now(),
    formatted: '刚刚启动',
  });
  
  useEffect(() => {
    const updateUptime = () => {
      const diff = Date.now() - uptime.startTime;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      let formatted = '';
      if (days > 0) formatted += `${days}天 `;
      if (hours > 0 || days > 0) formatted += `${hours}小时`;
      else if (minutes > 0) formatted += `${minutes}分钟`;
      else formatted = '刚刚启动';
      
      setUptime(prev => ({ ...prev, formatted }));
    };
    
    updateUptime();
    const interval = setInterval(updateUptime, 60000); // 每分钟更新
    return () => clearInterval(interval);
  }, [uptime.startTime]);

  // 系统统计数据
  const systemStats = useMemo(() => {
    // 使用真实的存储数据，如果不支持则回退到估算值
    const usedStorage = storageInfo.isSupported 
      ? storageInfo.used 
      : new Blob([JSON.stringify({ transactions, contents, auditLogs })]).size;
    const totalStorage = storageInfo.isSupported 
      ? storageInfo.total 
      : Math.max(usedStorage * 3, 50 * 1024 * 1024); // 最小50MB或3倍已用空间
    
    return {
      storageUsed: usedStorage,
      storageTotal: totalStorage,
      storagePercent: storageInfo.isSupported ? storageInfo.percent : Math.round((usedStorage / totalStorage) * 100),
      recordCount: transactions.length + contents.length + auditLogs.length,
      lastBackup: '2025-02-12 08:30',
      systemVersion: `v${localStorage.getItem('sb_config_version') || packageInfo.version}`,
      uptime: uptime.formatted,
    };
  }, [transactions, contents, auditLogs, storageInfo, uptime.formatted]);

  const tabs = [
    { id: 'overview', label: '系统概览', icon: Activity, visible: true },
    { id: 'init', label: '酒店初始化', icon: Building2, visible: canInitHotel },
    { id: 'preferences', label: '系统偏好', icon: Settings, visible: true },
    { id: 'shortcuts', label: '快捷键', icon: Keyboard, visible: true },
    { id: 'data', label: '数据管理', icon: Database, visible: true },
    { id: 'user', label: '账号切换与退出', icon: UserCircle, visible: true },
    { id: 'permissions', label: '权限管理', icon: Users, visible: canViewPermissions },
    { id: 'audit', label: '审计日志', icon: FileText, visible: canViewAudit },
  ].filter(t => t.visible);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-sm text-text-secondary mt-1">管理系统配置、用户权限和数据</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-lg border border-border-color">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-sm text-text-secondary">系统正常运行</span>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2 border-b border-border-color overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchParams(tab.id === 'overview' ? {} : { tab: tab.id });
              }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-neon-cyan text-neon-cyan'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
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
          {/* 系统概览 */}
          {activeTab === 'overview' && (
            <SystemOverview stats={systemStats} user={user} currentHotel={currentHotel} />
          )}

          {/* 酒店初始化向导 */}
          {activeTab === 'init' && (
            <HotelInitWizard 
              canInit={canInitHotel} 
              onComplete={(hotelData) => {
                const newHotel: Hotel = {
                  id: `temp-${Date.now()}`,
                  name: hotelData.name,
                  type: hotelData.type,
                  tier: hotelData.star === 'luxury' ? 'premium' : hotelData.star === 'mid' ? 'comfort' : 'economy',
                  theme: hotelData.theme,
                  location: {
                    city: hotelData.city,
                    address: hotelData.address,
                    coordinates: hotelData.coordinates,
                    distanceToEvent: 500,
                    monitoringRadius: hotelData.hotelType === 'city' ? 3 : hotelData.hotelType === 'scenic' ? 5 : 20,
                  },
                  roomTypes: hotelData.roomTypes.map((r: any) => ({
                    id: `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: r.name,
                    count: r.count,
                    floorPrice: r.floorPrice,
                    ceilingPrice: r.ceilingPrice,
                    images: r.images,
                    area: r.area || 25,
                    beds: r.beds || '标准床型',
                  })),
                  defaultMode: 'dynamic',
                  eventTypes: ['general'],
                  flexibleInventoryRate: 0.15,
                  priceRange: { 
                    normal: [hotelData.basePrice * 0.8, hotelData.basePrice * 1.2], 
                    peak: [hotelData.basePrice * 1.2, hotelData.basePrice * 1.8] 
                  },
                  scriptStrategy: '标准话术',
                };
                initHotel(newHotel);
                toast.success('酒店创建成功', `"${hotelData.name}"已添加到酒店切换列表`);
              }}
            />
          )}

          {/* 系统偏好 */}
          {activeTab === 'preferences' && <SystemPreferences />}

          {/* 数据管理 */}
          {activeTab === 'data' && <DataManagement stats={systemStats} />}

          {/* 账号切换与退出 */}
          {activeTab === 'user' && <UserSwitcherPanel currentUser={user} />}

          {/* 权限管理 */}
          {activeTab === 'permissions' && canViewPermissions && (
            <PermissionsManager currentRole={user.role} />
          )}

          {/* 快捷键设置 */}
          {activeTab === 'shortcuts' && (
            <ShortcutSettings appType="hotel" />
          )}

          {/* 审计日志 */}
          {activeTab === 'audit' && canViewAudit && (
            <AuditLogViewer logs={auditLogs} userRole={user.role} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


// ============================================
// 系统概览组件
// ============================================

function SystemOverview({ stats, user, currentHotel }: { 
  stats: any; 
  user: User; 
  currentHotel: any;
}) {
  const { transactions, contents, auditLogs } = useUnifiedStore();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  useEffect(() => {
    // 检查远程配置更新
    const checkUpdate = () => {
      const pending = localStorage.getItem('sb_remote_config_pending');
      const currentVersion = localStorage.getItem('sb_config_version') || '1.0.0';
      
      if (pending) {
        const config = JSON.parse(pending);
        if (config.version !== currentVersion) {
          setHasUpdate(true);
          setPendingConfig(config);
          console.log('[RemoteConfig] Update available:', config.version);
        } else {
          setHasUpdate(false);
        }
      } else {
        setHasUpdate(false);
      }
    };
    
    // 立即检查一次
    checkUpdate();
    
    // 轮询检查（每10秒）
    const intervalId = setInterval(checkUpdate, 10000);
    
    // 监听 BroadcastChannel 实时更新（如果页面同时打开）
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('hotel_config_sync');
      channel.onmessage = (event) => {
        if (event.data.type === 'CONFIG_PUSH') {
          console.log('[RemoteConfig] Received push notification');
          checkUpdate();
        }
      };
    }
    
    // 监听 storage 事件（同一浏览器不同标签页）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sb_remote_config_pending') {
        console.log('[RemoteConfig] Storage changed');
        checkUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);
    
    return () => {
      clearInterval(intervalId);
      channel?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
  
  const handleUpdate = async () => {
    setIsUpdating(true);
    
    // 模拟更新过程
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 应用配置
    if (pendingConfig) {
      localStorage.setItem('sb_remote_config', JSON.stringify(pendingConfig));
      localStorage.setItem('sb_config_version', pendingConfig.version);
      localStorage.removeItem('sb_remote_config_pending');
      
      setHasUpdate(false);
      setShowUpdateModal(false);
      
      // 刷新页面使配置生效
      window.location.reload();
    }
    
    setIsUpdating(false);
  };
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    { 
      label: '存储使用', 
      value: `${stats.storagePercent}%`, 
      subtext: `${formatBytes(stats.storageUsed)} / ${formatBytes(stats.storageTotal)}`,
      icon: HardDrive, 
      color: 'text-neon-cyan',
      bgColor: 'bg-neon-cyan/10',
      progress: stats.storagePercent,
    },
    { 
      label: '数据记录', 
      value: stats.recordCount.toLocaleString(), 
      subtext: '交易 + 内容 + 日志',
      icon: Database, 
      color: 'text-neon-green',
      bgColor: 'bg-neon-green/10',
    },
    { 
      label: hasUpdate ? '有新版本' : '系统版本', 
      value: hasUpdate ? pendingConfig?.version || '1.1.0' : stats.systemVersion, 
      subtext: hasUpdate ? `当前: ${stats.systemVersion}` : '当前运行版本',
      icon: Sparkles, 
      color: hasUpdate ? 'text-neon-green' : 'text-neon-purple',
      bgColor: hasUpdate ? 'bg-neon-green/10' : 'bg-neon-purple/10',
      hasUpdate,
      onClick: hasUpdate ? () => setShowUpdateModal(true) : undefined,
    },
    { 
      label: '运行时间', 
      value: stats.uptime, 
      subtext: '自上次重启',
      icon: Clock, 
      color: 'text-neon-amber',
      bgColor: 'bg-neon-amber/10',
    },
  ];

  const quickActions = [
    { label: '酒店初始化', icon: Building2, tab: 'init', desc: '配置新酒店档案' },
    { label: '导出数据', icon: Download, tab: 'data', desc: '备份系统数据' },
    { label: '系统偏好', icon: Settings, tab: 'preferences', desc: '个性化设置' },
    { label: '审计日志', icon: FileText, tab: 'audit', desc: '查看操作记录' },
  ];

  return (
    <div className="space-y-6">
      {/* 全局更新提示 */}
      {hasUpdate && pendingConfig && (
        <div 
          className="bg-neon-green/10 border border-neon-green rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-neon-green/20 transition-all"
          onClick={() => setShowUpdateModal(true)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
              <Sparkles size={20} className="text-[#00E396]" />
            </div>
            <div>
              <div className="font-medium text-[#00E396]">
                系统更新可用：v{pendingConfig.version}
              </div>
              <div className="text-sm text-text-secondary">
                {pendingConfig.description || '优化定价算法参数，点击更新'}
              </div>
            </div>
          </div>
          <button className="px-4 py-2 bg-neon-green text-bg-primary rounded-lg font-medium hover:bg-neon-green/90">
            立即更新
          </button>
        </div>
      )}
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`bg-bg-secondary rounded-xl border p-4 ${
              card.hasUpdate 
                ? 'border-neon-green cursor-pointer hover:border-neon-green/80' 
                : 'border-border-color'
            }`}
            onClick={card.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center relative`}>
                <card.icon size={20} className={card.color} />
                {card.hasUpdate && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-[10px] text-text-primary">!</span>
                  </span>
                )}
              </div>
              {card.progress !== undefined && (
                <span className={`text-sm font-medium ${card.color}`}>{card.value}</span>
              )}
            </div>
            {card.progress !== undefined ? (
              <>
                <div className="h-2 bg-bg-primary rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${card.color.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(card.progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary">{card.subtext}</p>
              </>
            ) : (
              <>
                <div className={`text-2xl font-bold ${card.color} mb-1`}>{card.value}</div>
                <p className="text-xs text-text-secondary">{card.subtext}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 系统更新弹窗 */}
      {showUpdateModal && pendingConfig && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
                <Sparkles size={24} className="text-[#00E396]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">系统更新可用</h3>
                <p className="text-sm text-text-secondary">新版本配置已就绪</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">当前版本</span>
                <span className="text-text-primary">{stats.systemVersion}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">新版本</span>
                <span className="text-[#00E396] font-medium">{pendingConfig.version}</span>
              </div>
              <div className="p-3 bg-bg-primary rounded-lg border border-border-color/30">
                <p className="text-sm text-text-secondary mb-1">更新内容</p>
                <p className="text-sm text-text-primary">{pendingConfig.description || '优化定价算法参数，提升收益表现'}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 px-4 py-2 bg-bg-primary text-text-primary rounded-lg hover:bg-bg-tertiary transition-all border border-border-color"
                disabled={isUpdating}
              >
                稍后提醒
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-neon-green text-bg-primary rounded-lg hover:bg-neon-green/90 transition-all flex items-center justify-center gap-2 font-medium"
              >
                {isUpdating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <span>立即更新</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 当前状态 & 快捷操作 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 当前状态 */}
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} className="text-neon-cyan" />
            当前状态
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                  <Building2 size={18} className="text-neon-cyan" />
                </div>
                <div>
                  <div className="font-medium">{currentHotel?.name || '未选择酒店'}</div>
                  <div className="text-xs text-text-secondary">当前运营酒店</div>
                </div>
              </div>
              <span className="px-2 py-1 bg-neon-green/20 text-neon-green rounded text-xs">运营中</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center">
                  <UserCircle size={18} className="text-neon-purple" />
                </div>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-text-secondary">
                    {user.role === 'owner' ? '业主' : user.role === 'manager' ? '店长' : '员工'}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                user.role === 'owner' ? 'bg-neon-purple/20 text-neon-purple' :
                user.role === 'manager' ? 'bg-neon-cyan/20 text-neon-cyan' :
                'bg-text-secondary/20 text-text-secondary'
              }`}>
                {user.role === 'owner' ? '全部权限' : user.role === 'manager' ? '管理权限' : '基础权限'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                <div className="text-xl font-mono text-neon-cyan">{transactions.length}</div>
                <div className="text-xs text-text-secondary">交易记录</div>
              </div>
              <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                <div className="text-xl font-mono text-neon-green">{contents.length}</div>
                <div className="text-xs text-text-secondary">内容发布</div>
              </div>
              <div className="text-center p-3 bg-bg-tertiary rounded-lg">
                <div className="text-xl font-mono text-neon-amber">{auditLogs.length}</div>
                <div className="text-xs text-text-secondary">审计日志</div>
              </div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-neon-amber" />
            快捷操作
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('tab', action.tab);
                  window.history.pushState({}, '', `${window.location.pathname}?${params}`);
                  window.location.reload();
                }}
                className="flex items-start gap-3 p-4 bg-bg-tertiary rounded-lg border border-border-color hover:border-neon-cyan transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors">
                  <action.icon size={20} className="text-text-secondary group-hover:text-neon-cyan" />
                </div>
                <div>
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} className="text-neon-green" />
          最近活动
        </h3>
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <Info size={32} className="mx-auto mb-2 opacity-30" />
            <p>暂无活动记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {auditLogs.slice(0, 5).map((log, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  log.level === 'critical' ? 'bg-neon-red' :
                  log.level === 'warning' ? 'bg-neon-amber' : 'bg-neon-cyan'
                }`} />
                <div className="flex-1">
                  <span className="text-sm">{log.action}</span>
                  <span className="text-xs text-text-secondary ml-2">{log.detail}</span>
                </div>
                <span className="text-xs text-text-secondary font-mono">{log.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================
// 系统偏好组件
// ============================================

function SystemPreferences() {
  const toast = useToast();
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('shadowBeesPreferences');
    return saved ? JSON.parse(saved) : {
      theme: 'dark',
      sidebarCollapsed: false,
      autoRefresh: true,
      refreshInterval: 30,
      notificationSound: true,
      desktopNotification: false,
      emailNotification: false,
      compactMode: false,
      tableRows: 10,
    };
  });

  const [saved, setSaved] = useState(false);

  // 应用主题到 document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme);
  }, [preferences.theme]);

  const updatePreference = (key: string, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    localStorage.setItem('shadowBeesPreferences', JSON.stringify(newPrefs));
    // 触发自定义事件通知其他组件设置已更改
    window.dispatchEvent(new CustomEvent('preferencesChanged', { detail: { key, value, preferences: newPrefs } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportPreferences = () => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadow-bees-preferences-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPreferences = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setPreferences(imported);
        localStorage.setItem('shadowBeesPreferences', JSON.stringify(imported));
        toast.success('偏好设置导入成功');
      } catch {
        toast.error('导入失败', '文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* 保存提示 */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-2 px-4 py-3 bg-neon-green/20 text-neon-green rounded-lg"
          >
            <CheckCircle2 size={18} />
            <span>设置已自动保存</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-6">
        {/* 外观设置 */}
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Palette size={20} className="text-neon-purple" />
            外观设置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2">主题模式</label>
              <div className="flex gap-2">
                {[
                  { key: 'light', label: '浅色', icon: Sun },
                  { key: 'dark', label: '深色', icon: Moon },
                  { key: 'auto', label: '跟随系统', icon: Sparkles },
                ].map((theme) => (
                  <button
                    key={theme.key}
                    onClick={() => updatePreference('theme', theme.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all flex-1 ${
                      preferences.theme === theme.key
                        ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                        : 'bg-bg-tertiary border-border-color hover:border-text-secondary'
                    }`}
                  >
                    <theme.icon size={16} />
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center">
                  <ChevronRight size={16} className="text-text-secondary" />
                </div>
                <span className="text-sm">侧边栏收起</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.sidebarCollapsed}
                onChange={(e) => updatePreference('sidebarCollapsed', e.target.checked)}
                className="w-5 h-5 accent-neon-cyan"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center">
                  <Activity size={16} className="text-text-secondary" />
                </div>
                <span className="text-sm">紧凑模式</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.compactMode}
                onChange={(e) => updatePreference('compactMode', e.target.checked)}
                className="w-5 h-5 accent-neon-cyan"
              />
            </label>

            <div>
              <label className="block text-sm text-text-secondary mb-2">表格每页行数</label>
              <select
                value={preferences.tableRows}
                onChange={(e) => updatePreference('tableRows', Number(e.target.value))}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-lg"
              >
                {[5, 10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n} 行</option>
                ))}
              </select>
            </div>

            {/* 重新观看启动动画 */}
            <div className="pt-4 border-t border-border-color">
              <button
                onClick={() => {
                  sessionStorage.removeItem('sb_hotel_booted');
                  localStorage.removeItem('sb_skip_boot_animation');
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/20 transition-all"
              >
                <Sparkles size={16} />
                重新观看启动动画
              </button>
              <p className="mt-2 text-xs text-text-secondary/50 text-center">
                刷新页面后将再次显示 Shadow-Bees 启动动画
              </p>
            </div>
          </div>
        </div>

        {/* 通知设置 */}
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} className="text-neon-amber" />
            通知设置
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center">
                  <Volume2 size={16} className="text-text-secondary" />
                </div>
                <div>
                  <span className="text-sm">声音提醒</span>
                  <p className="text-xs text-text-secondary">新订单和警报时播放提示音</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.notificationSound}
                onChange={(e) => updatePreference('notificationSound', e.target.checked)}
                className="w-5 h-5 accent-neon-cyan"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center">
                  <Smartphone size={16} className="text-text-secondary" />
                </div>
                <div>
                  <span className="text-sm">桌面通知</span>
                  <p className="text-xs text-text-secondary">在桌面显示系统通知</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.desktopNotification}
                onChange={(e) => updatePreference('desktopNotification', e.target.checked)}
                className="w-5 h-5 accent-neon-cyan"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center">
                  <Mail size={16} className="text-text-secondary" />
                </div>
                <div>
                  <span className="text-sm">邮件通知</span>
                  <p className="text-xs text-text-secondary">重要事件发送邮件提醒</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.emailNotification}
                onChange={(e) => updatePreference('emailNotification', e.target.checked)}
                className="w-5 h-5 accent-neon-cyan"
              />
            </label>
          </div>
        </div>

        {/* 数据刷新设置 */}
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RotateCcw size={20} className="text-neon-cyan" />
            数据刷新
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-bg-secondary flex items-center justify-center">
                  <Activity size={16} className="text-text-secondary" />
                </div>
                <div>
                  <span className="text-sm">自动刷新</span>
                  <p className="text-xs text-text-secondary">定时更新页面数据</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoRefresh}
                onChange={(e) => updatePreference('autoRefresh', e.target.checked)}
                className="w-5 h-5 accent-neon-cyan"
              />
            </label>

            <div>
              <label className="block text-sm text-text-secondary mb-2">刷新间隔</label>
              <select
                value={preferences.refreshInterval}
                onChange={(e) => updatePreference('refreshInterval', Number(e.target.value))}
                disabled={!preferences.autoRefresh}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-lg disabled:opacity-50"
              >
                <option value={10}>10 秒</option>
                <option value={30}>30 秒</option>
                <option value={60}>1 分钟</option>
                <option value={300}>5 分钟</option>
              </select>
            </div>
          </div>
        </div>

        {/* 导入/导出 */}
        <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileDown size={20} className="text-neon-green" />
            配置管理
          </h3>
          <div className="space-y-3">
            <button
              onClick={exportPreferences}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-all"
            >
              <Download size={18} />
              导出偏好设置
            </button>
            
            <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-bg-tertiary border border-border-color rounded-lg hover:border-neon-cyan cursor-pointer transition-all">
              <Archive size={18} />
              导入偏好设置
              <input
                type="file"
                accept=".json"
                onChange={importPreferences}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                if (confirm('确定要重置所有偏好设置吗？')) {
                  localStorage.removeItem('shadowBeesPreferences');
                  window.location.reload();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-neon-red hover:bg-neon-red/20 rounded-lg transition-all"
            >
              <RotateCcw size={18} />
              重置为默认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// 数据管理组件
// ============================================

function DataManagement({ stats }: { stats: any }) {
  const toast = useToast();
  const { transactions, contents, auditLogs, currentHotel } = useUnifiedStore();
  const [exporting, setExporting] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'all' | 'week' | 'month'>('all');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const exportData = (type: 'transactions' | 'contents' | 'logs' | 'all') => {
    setExporting(true);
    
    setTimeout(() => {
      let data: any = {};
      const timestamp = new Date().toISOString().split('T')[0];
      
      // 根据时间范围过滤
      const now = new Date();
      const filterByDate = (items: any[]) => {
        if (selectedRange === 'all') return items;
        const days = selectedRange === 'week' ? 7 : 30;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return items.filter((item: any) => {
          const date = new Date(item.timestamp || item.createdAt || item.time);
          return date >= cutoff;
        });
      };

      switch (type) {
        case 'transactions':
          data = { transactions: filterByDate(transactions) };
          break;
        case 'contents':
          data = { contents: filterByDate(contents) };
          break;
        case 'logs':
          data = { auditLogs: filterByDate(auditLogs) };
          break;
        case 'all':
          data = {
            hotel: currentHotel,
            transactions: filterByDate(transactions),
            contents: filterByDate(contents),
            auditLogs: filterByDate(auditLogs),
            exportedAt: new Date().toISOString(),
          };
          break;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shadow-bees-${type}-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 500);
  };

  const clearCache = () => {
    if (confirm('确定要清理本地缓存吗？不会删除重要数据。')) {
      const keys = Object.keys(localStorage);
      let cleared = 0;
      keys.forEach(key => {
        if (key !== 'shadowBeesPreferences' && !key.includes('auth')) {
          localStorage.removeItem(key);
          cleared++;
        }
      });
      toast.success(`已清理 ${cleared} 项缓存`);
    }
  };

  const dataStats = [
    { label: '交易数据', count: transactions.length, size: transactions.length * 0.5, icon: ShoppingCart, color: 'text-neon-cyan' },
    { label: '内容数据', count: contents.length, size: contents.length * 2, icon: FileText, color: 'text-neon-green' },
    { label: '日志数据', count: auditLogs.length, size: auditLogs.length * 0.3, icon: Clock, color: 'text-neon-amber' },
  ];

  return (
    <div className="space-y-6">
      {/* 数据概览 */}
      <div className="grid grid-cols-3 gap-4">
        {dataStats.map((stat, idx) => (
          <div key={idx} className="bg-bg-secondary rounded-xl border border-border-color p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono">{stat.count.toLocaleString()}</div>
                <div className="text-xs text-text-secondary">{stat.label}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>预估大小</span>
              <span className="font-mono">{formatBytes(stat.size * 1024)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 导出设置 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download size={20} className="text-neon-cyan" />
          数据导出
        </h3>
        
        <div className="mb-6">
          <label className="block text-sm text-text-secondary mb-2">时间范围</label>
          <div className="flex gap-2">
            {[
              { key: 'all', label: '全部数据' },
              { key: 'month', label: '最近30天' },
              { key: 'week', label: '最近7天' },
            ].map((range) => (
              <button
                key={range.key}
                onClick={() => setSelectedRange(range.key as any)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedRange === range.key
                    ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                    : 'bg-bg-tertiary border-border-color hover:border-text-secondary'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'transactions', label: '导出交易数据', desc: '包含所有订单记录', icon: ShoppingCart },
            { key: 'contents', label: '导出内容数据', desc: '包含内容发布记录', icon: FileText },
            { key: 'logs', label: '导出审计日志', desc: '包含操作记录', icon: Clock },
            { key: 'all', label: '导出全部数据', desc: '完整系统备份', icon: Archive },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => exportData(item.key as any)}
              disabled={exporting}
              className="flex items-start gap-3 p-4 bg-bg-tertiary rounded-lg border border-border-color hover:border-neon-cyan transition-all text-left group disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors">
                <item.icon size={20} className="text-text-secondary group-hover:text-neon-cyan" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-text-secondary mt-0.5">{item.desc}</div>
              </div>
              {exporting && <div className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />}
            </button>
          ))}
        </div>
      </div>

      {/* 维护操作 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings size={20} className="text-neon-amber" />
          维护操作
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
                <Trash size={18} className="text-neon-amber" />
              </div>
              <div>
                <div className="font-medium text-sm">清理本地缓存</div>
                <div className="text-xs text-text-secondary">释放存储空间，提升性能</div>
              </div>
            </div>
            <button
              onClick={clearCache}
              className="px-4 py-2 bg-neon-amber/20 text-neon-amber rounded-lg hover:bg-neon-amber/30 transition-all"
            >
              立即清理
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
                <RotateCcw size={18} className="text-neon-red" />
              </div>
              <div>
                <div className="font-medium text-sm">重置演示数据</div>
                <div className="text-xs text-text-secondary">恢复到初始演示状态</div>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('确定要重置所有演示数据吗？此操作不可恢复。')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-neon-red/20 text-neon-red rounded-lg hover:bg-neon-red/30 transition-all"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 存储空间 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HardDrive size={20} className="text-neon-green" />
          存储空间
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">已使用</span>
              <span className="text-sm font-mono">{formatBytes(stats.storageUsed)} / {formatBytes(stats.storageTotal)}</span>
            </div>
            <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.storagePercent > 80 ? 'bg-neon-red' : 
                  stats.storagePercent > 50 ? 'bg-neon-amber' : 'bg-neon-green'
                }`}
                style={{ width: `${Math.min(stats.storagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {stats.storagePercent > 80 ? '存储空间不足，建议清理缓存' : 
               stats.storagePercent > 50 ? '存储空间使用正常' : '存储空间充足'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}




// ============================================
// 酒店初始化向导（优化版）
// ============================================

const DRAFT_KEY = 'hotelInitDraft';

function HotelInitWizard({ canInit, onComplete }: { 
  canInit: boolean; 
  onComplete: (data: any) => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [hotelData, setHotelData] = useState(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLastSaved(new Date(parsed.savedAt));
        return parsed.data;
      } catch {
        // ignore parse error
      }
    }
    return {
      name: '',
      brand: '',
      province: '',
      city: '',
      district: '',
      address: '',
      coordinates: { lat: 39.9042, lng: 116.4074 },
      hotelType: 'city' as 'city' | 'scenic' | 'suburb',
      star: 'mid' as 'luxury' | 'mid' | 'budget',
      basePrice: 300,
      roomTypes: [] as Array<{
        name: string;
        count: number;
        floorPrice: number;
        ceilingPrice: number;
        otaRate: number;
        images: string[];
        area: number;
        beds: string;
      }>,
      facilities: {
        hasParking: false,
        hasBreakfast: false,
        hasGym: false,
        hasPool: false,
        hasMeeting: false,
      },
      selectedImages: [] as string[],
      competitors: [] as string[],
    };
  });

  // 自动保存草稿
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        data: hotelData,
        savedAt: new Date().toISOString(),
      }));
      setLastSaved(new Date());
    }, 3000);
    return () => clearTimeout(timeout);
  }, [hotelData]);

  const steps = [
    { id: 1, title: '基础档案', icon: Building2, fields: ['name', 'province', 'city'] },
    { id: 2, title: '房型设置', icon: Bed, fields: ['roomTypes'] },
    { id: 3, title: '资产上传', icon: ImageIcon, fields: ['selectedImages'] },
    { id: 4, title: '位置&竞品', icon: MapPin, fields: ['coordinates', 'competitors'] },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!hotelData.name.trim()) newErrors.name = '请输入酒店名称';
        if (hotelData.name.length < 2) newErrors.name = '酒店名称至少需要2个字符';
        if (!hotelData.province) newErrors.province = '请选择省份';
        if (!hotelData.city) newErrors.city = '请选择城市';
        break;
      case 2:
        if (hotelData.roomTypes.length === 0) {
          newErrors.roomTypes = '请至少添加一个房型';
        } else {
          hotelData.roomTypes.forEach((room: { name: string; count: number; floorPrice: number; ceilingPrice: number }, idx: number) => {
            if (!room.name.trim()) newErrors[`roomType_${idx}_name`] = '请输入房型名称';
            if (room.count < 1) newErrors[`roomType_${idx}_count`] = '房间数至少为1';
            if (room.floorPrice < 1) newErrors[`roomType_${idx}_floorPrice`] = '底价必须大于0';
            if (room.ceilingPrice <= room.floorPrice) {
              newErrors[`roomType_${idx}_ceilingPrice`] = '天花板价必须大于底价';
            }
          });
        }
        break;
      case 3:
        if (hotelData.selectedImages.length < 3) {
          newErrors.selectedImages = '请至少选择3张图片';
        }
        break;
      case 4:
        if (hotelData.competitors.length === 0) {
          newErrors.competitors = '请至少选择一个竞品';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        setErrors({});
      } else {
        setShowPreview(true);
      }
    }
  };

  const handlePrev = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
    setErrors({});
  };

  const clearDraft = () => {
    if (confirm('确定要清除草稿吗？')) {
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    }
  };

  const applyTemplate = (template: typeof roomTypeTemplates[0]) => {
    setHotelData((prev: typeof hotelData) => ({
      ...prev,
      roomTypes: [...prev.roomTypes, { ...template, images: [], otaRate: 80 }],
    }));
  };

  if (!canInit) {
    return (
      <div className="bg-bg-secondary rounded-xl border border-border-color p-12 text-center">
        <Shield size={48} className="mx-auto mb-4 text-text-secondary" />
        <h3 className="text-lg font-medium mb-2">权限不足</h3>
        <p className="text-text-secondary">只有业主可以初始化新酒店</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">酒店初始化向导</h2>
          {lastSaved && (
            <p className="text-xs text-text-secondary mt-1">
              草稿自动保存于 {lastSaved.toLocaleTimeString()}
              <button onClick={clearDraft} className="text-neon-red ml-2 hover:underline">清除草稿</button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">步骤 {currentStep} / 4</span>
          <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-cyan transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const hasError = step.fields.some(f => errors[f] || Object.keys(errors).some(k => k.startsWith(f)));
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                disabled={step.id > currentStep}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all flex-1 ${
                  isActive ? 'bg-neon-cyan/20 border-neon-cyan' :
                  isCompleted ? hasError ? 'bg-neon-red/20 border-neon-red' : 'bg-neon-green/20 border-neon-green' :
                  'bg-bg-tertiary border-border-color opacity-50'
                } ${step.id < currentStep ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isActive ? 'bg-neon-cyan text-bg-primary' :
                  isCompleted ? hasError ? 'bg-neon-red text-text-primary' : 'bg-neon-green text-bg-primary' :
                  'bg-bg-secondary text-text-secondary'
                }`}>
                  {isCompleted && !hasError ? <Check size={16} /> : hasError ? <AlertCircle size={16} /> : step.id}
                </div>
                <span className={`hidden md:block ${isActive ? 'text-neon-cyan' : isCompleted ? hasError ? 'text-neon-red' : 'text-neon-green' : ''}`}>
                  {step.title}
                </span>
              </button>
              {idx < steps.length - 1 && <ChevronRight size={20} className="mx-2 text-text-secondary" />}
            </div>
          );
        })}
      </div>

      {/* 步骤内容 */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <Step1BasicInfo 
            data={hotelData} 
            onChange={(data) => setHotelData({ ...hotelData, ...data })}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <Step2RoomTypes 
            data={hotelData}
            onChange={(data) => setHotelData({ ...hotelData, ...data })}
            errors={errors}
            onApplyTemplate={applyTemplate}
          />
        )}
        {currentStep === 3 && (
          <Step3Assets 
            data={hotelData}
            onChange={(data) => setHotelData({ ...hotelData, ...data })}
            errors={errors}
          />
        )}
        {currentStep === 4 && (
          <Step4Location 
            data={hotelData}
            onChange={(data) => setHotelData({ ...hotelData, ...data })}
            errors={errors}
          />
        )}
      </div>

      {/* 导航按钮 */}
      <div className="flex justify-between mt-8 pt-6 border-t border-border-color">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-6 py-3 bg-bg-tertiary rounded-lg disabled:opacity-50 hover:bg-bg-secondary transition-all"
        >
          上一步
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-neon-cyan text-bg-primary rounded-lg font-medium hover:opacity-90 transition-all flex items-center gap-2"
        >
          {currentStep === 4 ? (
            <><Eye size={18} /> 预览并提交</>
          ) : (
            <>下一步 <ChevronRight size={18} /></>
          )}
        </button>
      </div>

      {/* 预览弹窗 */}
      {showPreview && (
        <HotelPreviewModal
          data={hotelData}
          onClose={() => setShowPreview(false)}
          onConfirm={() => {
            onComplete(hotelData);
            localStorage.removeItem(DRAFT_KEY);
            setShowPreview(false);
            setCurrentStep(1);
            setHotelData({
              name: '', brand: '', province: '', city: '', district: '', address: '',
              coordinates: { lat: 39.9042, lng: 116.4074 },
              hotelType: 'city', star: 'mid', basePrice: 300,
              roomTypes: [], facilities: { hasParking: false, hasBreakfast: false, hasGym: false, hasPool: false, hasMeeting: false },
              selectedImages: [], competitors: [],
            });
          }}
        />
      )}
    </div>
  );
}


// 步骤1：基础档案
function Step1BasicInfo({ data, onChange, errors }: { 
  data: any; 
  onChange: (d: any) => void;
  errors: Record<string, string>;
}) {
  const selectedProvince = chinaCities.find(c => c.province === data.province);
  const selectedCity = selectedProvince || chinaCities[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            酒店名称 <span className="text-neon-red">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="如：北京三里屯潮流酒店"
            className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg focus:border-neon-cyan focus:outline-none transition-colors ${
              errors.name ? 'border-neon-red' : 'border-border-color'
            }`}
          />
          {errors.name && <p className="text-neon-red text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-2">品牌</label>
          <input
            type="text"
            value={data.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
            placeholder="如：亚朵、全季（可选）"
            className="w-full px-4 py-3 bg-bg-tertiary border border-border-color rounded-lg focus:border-neon-cyan focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            省份 <span className="text-neon-red">*</span>
          </label>
          <select 
            value={data.province}
            onChange={(e) => onChange({ province: e.target.value, city: '', district: '' })}
            className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg ${
              errors.province ? 'border-neon-red' : 'border-border-color'
            }`}
          >
            <option value="">请选择</option>
            {[...new Set(chinaCities.map(c => c.province))].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.province && <p className="text-neon-red text-xs mt-1">{errors.province}</p>}
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            城市 <span className="text-neon-red">*</span>
          </label>
          <select 
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value, district: '' })}
            disabled={!data.province}
            className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg disabled:opacity-50 ${
              errors.city ? 'border-neon-red' : 'border-border-color'
            }`}
          >
            <option value="">请选择</option>
            {chinaCities.filter(c => c.province === data.province).map(c => (
              <option key={c.city} value={c.city}>{c.city}</option>
            ))}
          </select>
          {errors.city && <p className="text-neon-red text-xs mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-2">区域</label>
          <select 
            value={data.district}
            onChange={(e) => onChange({ district: e.target.value })}
            disabled={!data.city}
            className="w-full px-4 py-3 bg-bg-tertiary border border-border-color rounded-lg disabled:opacity-50"
          >
            <option value="">请选择</option>
            {selectedCity?.districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">详细地址</label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="街道、门牌号"
          className="w-full px-4 py-3 bg-bg-tertiary border border-border-color rounded-lg focus:border-neon-cyan focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">酒店类型</label>
          <div className="flex gap-2">
            {[
              { key: 'city', label: '城市型', desc: '3km监测' },
              { key: 'scenic', label: '景区型', desc: '5km监测' },
              { key: 'suburb', label: '郊野型', desc: '20km监测' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => onChange({ hotelType: t.key })}
                className={`flex-1 py-3 rounded-lg border transition-all ${
                  data.hotelType === t.key 
                    ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' 
                    : 'bg-bg-tertiary border-border-color hover:border-text-secondary'
                }`}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-xs opacity-70">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-2">档次定位</label>
          <div className="flex gap-2">
            {[
              { key: 'luxury', label: '高端', color: 'text-neon-purple', bg: 'bg-neon-purple/20', border: 'border-neon-purple' },
              { key: 'mid', label: '中端', color: 'text-neon-cyan', bg: 'bg-neon-cyan/20', border: 'border-neon-cyan' },
              { key: 'budget', label: '经济', color: 'text-neon-green', bg: 'bg-neon-green/20', border: 'border-neon-green' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => onChange({ star: t.key })}
                className={`flex-1 py-3 rounded-lg border transition-all ${
                  data.star === t.key 
                    ? `${t.bg} ${t.border} ${t.color}` 
                    : 'bg-bg-tertiary border-border-color'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">参考基础价</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={data.basePrice}
            onChange={(e) => onChange({ basePrice: Number(e.target.value) })}
            className="w-32 px-4 py-3 bg-bg-tertiary border border-border-color rounded-lg font-mono"
          />
          <span className="text-text-secondary">元/晚</span>
          <span className="text-xs text-text-secondary">用于自动生成底价和天花板价建议</span>
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">设施服务</label>
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'hasParking', label: '停车场', icon: '🅿️' },
            { key: 'hasBreakfast', label: '早餐', icon: '🍳' },
            { key: 'hasGym', label: '健身房', icon: '💪' },
            { key: 'hasPool', label: '游泳池', icon: '🏊' },
            { key: 'hasMeeting', label: '会议室', icon: '📊' },
          ].map(f => (
            <label key={f.key} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
              data.facilities[f.key] ? 'bg-neon-cyan/10 border-neon-cyan' : 'bg-bg-tertiary border-border-color'
            }`}>
              <input 
                type="checkbox" 
                checked={data.facilities[f.key]}
                onChange={(e) => onChange({ 
                  facilities: { ...data.facilities, [f.key]: e.target.checked } 
                })}
                className="hidden"
              />
              <span>{f.icon}</span>
              <span className="text-sm">{f.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}


// 步骤2：房型设置
function Step2RoomTypes({ data, onChange, errors, onApplyTemplate }: { 
  data: any; 
  onChange: (d: any) => void;
  errors: Record<string, string>;
  onApplyTemplate: (t: typeof roomTypeTemplates[0]) => void;
}) {
  const addRoomType = () => {
    onChange({
      roomTypes: [...data.roomTypes, {
        name: '',
        count: 10,
        floorPrice: 200,
        ceilingPrice: 400,
        otaRate: 80,
        images: [],
        area: 25,
        beds: '标准床型',
      }]
    });
  };

  const updateRoomType = (idx: number, updates: any) => {
    const newRoomTypes = [...data.roomTypes];
    newRoomTypes[idx] = { ...newRoomTypes[idx], ...updates };
    onChange({ roomTypes: newRoomTypes });
  };

  const removeRoomType = (idx: number) => {
    onChange({ roomTypes: data.roomTypes.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      {/* 快捷模板 */}
      <div className="bg-bg-tertiary rounded-lg p-4 border border-border-color">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">快速添加房型模板</span>
          <span className="text-xs text-text-secondary">点击一键添加预设房型</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {roomTypeTemplates.map((template, idx) => (
            <button
              key={idx}
              onClick={() => onApplyTemplate(template)}
              className="px-3 py-1.5 bg-bg-secondary border border-border-color rounded text-sm hover:border-neon-cyan hover:text-neon-cyan transition-all"
            >
              + {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {errors.roomTypes && (
        <div className="flex items-center gap-2 text-neon-red text-sm">
          <AlertCircle size={16} />
          {errors.roomTypes}
        </div>
      )}

      {/* 添加按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">已配置房型 ({data.roomTypes.length})</h3>
        <button
          onClick={addRoomType}
          className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg hover:bg-neon-cyan/30 transition-all"
        >
          <Plus size={16} />
          添加房型
        </button>
      </div>

      {data.roomTypes.length === 0 && (
        <div className="text-center py-12 text-text-secondary border-2 border-dashed border-border-color rounded-xl">
          <Bed size={48} className="mx-auto mb-4 opacity-30" />
          <p>暂无房型，点击上方按钮或选择模板添加</p>
          <p className="text-sm mt-2">建议添加3种以上价格差异明显的房型</p>
        </div>
      )}

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {data.roomTypes.map((room: { name: string; count: number; floorPrice: number; ceilingPrice: number; otaRate: number }, idx: number) => (
          <div key={idx} className="bg-bg-tertiary rounded-lg p-4 border border-border-color">
            <div className="flex items-start gap-4">
              <div className="flex-1 grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">房型名称 *</label>
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => updateRoomType(idx, { name: e.target.value })}
                    placeholder="如：豪华大床房"
                    className={`w-full px-3 py-2 bg-bg-secondary border rounded text-sm ${
                      errors[`roomType_${idx}_name`] ? 'border-neon-red' : 'border-border-color'
                    }`}
                  />
                  {errors[`roomType_${idx}_name`] && (
                    <p className="text-neon-red text-xs mt-1">{errors[`roomType_${idx}_name`]}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">房间数 *</label>
                  <input
                    type="number"
                    value={room.count}
                    onChange={(e) => updateRoomType(idx, { count: Number(e.target.value) })}
                    className={`w-full px-3 py-2 bg-bg-secondary border rounded text-sm ${
                      errors[`roomType_${idx}_count`] ? 'border-neon-red' : 'border-border-color'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">底价 *</label>
                  <input
                    type="number"
                    value={room.floorPrice}
                    onChange={(e) => updateRoomType(idx, { floorPrice: Number(e.target.value) })}
                    className={`w-full px-3 py-2 bg-bg-secondary border rounded text-sm font-mono ${
                      errors[`roomType_${idx}_floorPrice`] ? 'border-neon-red' : 'border-border-color'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">天花板价 *</label>
                  <input
                    type="number"
                    value={room.ceilingPrice}
                    onChange={(e) => updateRoomType(idx, { ceilingPrice: Number(e.target.value) })}
                    className={`w-full px-3 py-2 bg-bg-secondary border rounded text-sm font-mono ${
                      errors[`roomType_${idx}_ceilingPrice`] ? 'border-neon-red' : 'border-border-color'
                    }`}
                  />
                </div>
              </div>
              <button
                onClick={() => removeRoomType(idx)}
                className="p-2 text-neon-red hover:bg-neon-red/20 rounded mt-5"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            {/* OTA 分配 */}
            <div className="mt-4 pt-4 border-t border-border-color">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-text-secondary">OTA分配：</span>
                  <span className="font-mono text-neon-cyan">{Math.round(room.count * room.otaRate / 100)}间</span>
                  <span className="text-text-secondary mx-2">/</span>
                  <span className="text-text-secondary">灵活库存：</span>
                  <span className="font-mono text-neon-green">{room.count - Math.round(room.count * room.otaRate / 100)}间</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">OTA占比</span>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={room.otaRate}
                    onChange={(e) => updateRoomType(idx, { otaRate: Number(e.target.value) })}
                    className="w-24"
                  />
                  <span className="text-xs font-mono w-8">{room.otaRate}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// 步骤3：资产上传
function Step3Assets({ data, onChange, errors }: { 
  data: any; 
  onChange: (d: any) => void;
  errors: Record<string, string>;
}) {
  const toggleImage = (url: string) => {
    const newImages = data.selectedImages.includes(url)
      ? data.selectedImages.filter((u: string) => u !== url)
      : [...data.selectedImages, url];
    onChange({ selectedImages: newImages });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            选择酒店图片 <span className="text-neon-red">*</span>
          </h3>
          <span className={`text-sm ${data.selectedImages.length < 3 ? 'text-neon-amber' : 'text-neon-green'}`}>
            已选择 {data.selectedImages.length} / 至少3张
          </span>
        </div>
        
        {errors.selectedImages && (
          <div className="flex items-center gap-2 text-neon-red text-sm mb-3">
            <AlertCircle size={16} />
            {errors.selectedImages}
          </div>
        )}
        
        <p className="text-sm text-text-secondary mb-4">
          选择能代表酒店形象的图片，建议包含外观、大堂和客房照片
        </p>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {presetImages.map((img) => {
          const isSelected = data.selectedImages.includes(img.url);
          return (
            <div
              key={img.id}
              onClick={() => toggleImage(img.url)}
              className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                isSelected ? 'border-neon-cyan' : 'border-transparent hover:border-text-secondary'
              }`}
            >
              <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
              {isSelected && (
                <div className="absolute inset-0 bg-neon-cyan/20 flex items-center justify-center">
                  <Check className="text-neon-cyan" size={32} />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                <span className="text-xs text-text-primary">{img.label}</span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-neon-cyan rounded-full flex items-center justify-center">
                  <span className="text-xs text-bg-primary font-bold">
                    {data.selectedImages.indexOf(img.url) + 1}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-2 border-dashed border-border-color rounded-lg p-8 text-center hover:border-neon-cyan transition-colors">
        <ImageIcon size={32} className="mx-auto mb-2 text-text-secondary" />
        <p className="text-text-secondary">拖拽图片到此处或点击上传</p>
        <p className="text-xs text-text-muted mt-1">支持 JPG、PNG，单张不超过 5MB</p>
        <button className="mt-4 px-4 py-2 bg-bg-tertiary rounded-lg text-sm hover:bg-bg-secondary transition-all">
          选择文件
        </button>
      </div>

      {/* 已选图片预览 */}
      {data.selectedImages.length > 0 && (
        <div className="bg-bg-tertiary rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">已选图片预览</h4>
          <div className="flex gap-3 flex-wrap">
            {data.selectedImages.map((url: string, idx: number) => (
                <div key={idx} className="relative w-24 h-16 rounded overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => toggleImage(url)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} className="text-text-primary" />
                  </button>
                  <span className="absolute top-1 left-1 w-5 h-5 bg-neon-cyan rounded-full flex items-center justify-center text-xs text-bg-primary font-bold">
                    {idx + 1}
                  </span>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 步骤4：位置和竞品
function Step4Location({ data, onChange, errors }: { 
  data: any; 
  onChange: (d: any) => void;
  errors: Record<string, string>;
}) {
  const toggleCompetitor = (name: string) => {
    const newCompetitors = data.competitors.includes(name)
      ? data.competitors.filter((c: string) => c !== name)
      : [...data.competitors, name];
    onChange({ competitors: newCompetitors });
  };

  const monitoringRadius = data.hotelType === 'city' ? 3 : data.hotelType === 'scenic' ? 5 : 20;

  return (
    <div className="space-y-6">
      {/* 地图位置 */}
      <div className="bg-bg-tertiary rounded-lg border border-border-color overflow-hidden">
        <div className="aspect-video bg-bg-secondary flex items-center justify-center">
          <div className="text-center text-text-secondary">
            <MapPin size={48} className="mx-auto mb-4" />
            <p>地图选点组件</p>
            <p className="text-sm mt-2 font-mono">
              lat: {data.coordinates.lat.toFixed(4)}, lng: {data.coordinates.lng.toFixed(4)}
            </p>
            <button 
              onClick={() => onChange({ 
                coordinates: { 
                  lat: 39.9042 + (Math.random() - 0.5) * 0.1, 
                  lng: 116.4074 + (Math.random() - 0.5) * 0.1 
                } 
              })}
              className="mt-4 px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/30"
            >
              随机生成坐标
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text-secondary">监测半径</span>
              <p className="text-lg font-medium">{monitoringRadius} km</p>
            </div>
            <div className="flex gap-2">
              {[
                { key: 'city', label: '城市型', radius: 3 },
                { key: 'scenic', label: '景区型', radius: 5 },
                { key: 'suburb', label: '郊野型', radius: 20 },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => onChange({ hotelType: t.key })}
                  className={`px-3 py-1.5 rounded text-sm border transition-all ${
                    data.hotelType === t.key 
                      ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' 
                      : 'bg-bg-secondary border-border-color'
                  }`}
                >
                  {t.label} ({t.radius}km)
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 竞品选择 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            选择竞品酒店 <span className="text-neon-red">*</span>
          </h3>
          <span className={`text-sm ${data.competitors.length === 0 ? 'text-neon-amber' : 'text-neon-green'}`}>
            已选择 {data.competitors.length} 家
          </span>
        </div>
        
        {errors.competitors && (
          <div className="flex items-center gap-2 text-neon-red text-sm mb-3">
            <AlertCircle size={16} />
            {errors.competitors}
          </div>
        )}
        
        <p className="text-sm text-text-secondary mb-4">
          选择{monitoringRadius}km范围内的主要竞争对手，用于价格监测和竞争分析
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {presetCompetitors.map((comp) => {
            const isSelected = data.competitors.includes(comp.name);
            return (
              <button
                key={comp.name}
                onClick={() => toggleCompetitor(comp.name)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  isSelected 
                    ? 'bg-neon-cyan/10 border-neon-cyan' 
                    : 'bg-bg-tertiary border-border-color hover:border-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{comp.name}</span>
                  {isSelected && <Check size={16} className="text-neon-cyan" />}
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  品牌：{comp.brand} · 评分：{comp.rating} · 参考价：¥{comp.basePrice}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// 预览弹窗
function HotelPreviewModal({ data, onClose, onConfirm }: { 
  data: any; 
  onClose: () => void;
  onConfirm: () => void;
}) {
  const totalRooms = data.roomTypes.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
  const avgFloorPrice = data.roomTypes.length > 0 
    ? Math.round(data.roomTypes.reduce((sum: number, r: { floorPrice: number }) => sum + r.floorPrice, 0) / data.roomTypes.length)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-secondary rounded-xl border border-border-color max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-border-color">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Eye size={24} className="text-neon-cyan" />
              酒店信息预览
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-bg-tertiary rounded-lg">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-text-secondary mt-1">请确认以下信息无误后提交</p>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-tertiary rounded-lg p-4">
              <div className="text-xs text-text-secondary mb-1">酒店名称</div>
              <div className="font-medium">{data.name}</div>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-4">
              <div className="text-xs text-text-secondary mb-1">品牌</div>
              <div className="font-medium">{data.brand || '无'}</div>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-4">
              <div className="text-xs text-text-secondary mb-1">位置</div>
              <div className="font-medium">{data.province} {data.city} {data.district}</div>
            </div>
            <div className="bg-bg-tertiary rounded-lg p-4">
              <div className="text-xs text-text-secondary mb-1">类型 / 档次</div>
              <div className="font-medium">
                {data.hotelType === 'city' ? '城市型' : data.hotelType === 'scenic' ? '景区型' : '郊野型'} / 
                {data.star === 'luxury' ? '高端' : data.star === 'mid' ? '中端' : '经济'}
              </div>
            </div>
          </div>

          {/* 统计 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-neon-cyan/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-neon-cyan">{data.roomTypes.length}</div>
              <div className="text-xs text-text-secondary">房型数量</div>
            </div>
            <div className="bg-neon-green/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-neon-green">{totalRooms}</div>
              <div className="text-xs text-text-secondary">总房间数</div>
            </div>
            <div className="bg-neon-amber/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-neon-amber">¥{avgFloorPrice}</div>
              <div className="text-xs text-text-secondary">平均底价</div>
            </div>
          </div>

          {/* 房型列表 */}
          <div>
            <h4 className="font-medium mb-3">房型配置</h4>
            <div className="space-y-2">
              {data.roomTypes.map((room: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                  <div>
                    <span className="font-medium">{room.name}</span>
                    <span className="text-xs text-text-secondary ml-2">{room.count}间</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-text-secondary">底价 ¥{room.floorPrice}</span>
                    <span className="text-text-secondary mx-2">→</span>
                    <span className="text-neon-cyan">天花板 ¥{room.ceilingPrice}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 图片 */}
          <div>
            <h4 className="font-medium mb-3">已选图片 ({data.selectedImages.length}张)</h4>
            <div className="flex gap-2 flex-wrap">
              {data.selectedImages.slice(0, 6).map((url: string, idx: number) => (
                <img key={idx} src={url} alt="" className="w-16 h-12 rounded object-cover" />
              ))}
              {data.selectedImages.length > 6 && (
                <div className="w-16 h-12 rounded bg-bg-tertiary flex items-center justify-center text-sm text-text-secondary">
                  +{data.selectedImages.length - 6}
                </div>
              )}
            </div>
          </div>

          {/* 竞品 */}
          <div>
            <h4 className="font-medium mb-3">监测竞品 ({data.competitors.length}家)</h4>
            <div className="flex flex-wrap gap-2">
              {data.competitors.map((name: string) => (
                <span key={name} className="px-3 py-1 bg-bg-tertiary rounded-full text-sm">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border-color flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-bg-tertiary rounded-lg hover:bg-bg-primary transition-all"
          >
            返回修改
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-neon-cyan text-bg-primary rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} />
            确认提交
          </button>
        </div>
      </motion.div>
    </div>
  );
}


// ============================================
// 账号切换与退出面板（优化版）
// ============================================

function UserSwitcherPanel({ currentUser }: { currentUser: { role: UserRole; name: string } }) {
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  const roles: { id: UserRole; name: string; desc: string; color: string; permissions: string[] }[] = [
    { 
      id: 'owner', 
      name: '业主', 
      desc: '拥有所有权限，可修改底价和审批', 
      color: '#A855F7',
      permissions: ['修改底价', '审批突破', '初始化酒店', '查看财务', '管理用户']
    },
    { 
      id: 'manager', 
      name: '店长', 
      desc: '可管理日常运营，需申请底价突破', 
      color: '#00F0FF',
      permissions: ['调价(≥底价)', '审批申请', '查看财务', '库存管理']
    },
    { 
      id: 'staff', 
      name: '员工', 
      desc: '基础操作权限，可改价但需审批', 
      color: '#94A3B8',
      permissions: ['查看数据', '基础调价', '库存管理']
    },
  ];

  return (
    <div className="space-y-6">
      {/* 当前用户 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <UserCircle className="text-neon-cyan" size={20} />
          当前用户
        </h3>
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ 
              background: `${roles.find(r => r.id === currentUser.role)?.color}20`,
              color: roles.find(r => r.id === currentUser.role)?.color 
            }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <p className="text-xl font-medium">{currentUser.name}</p>
            <p className="text-text-secondary">
              角色: <span style={{ color: roles.find(r => r.id === currentUser.role)?.color }}>
                {roles.find(r => r.id === currentUser.role)?.name}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 切换账号 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-medium mb-4">切换账号</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => (
            <motion.button
              key={role.id}
              onClick={() => {
                if (currentUser.role === role.id) return; // 已是当前角色，无需切换
                
                // 设置目标角色，让 App.tsx 自动登录
                try {
                  sessionStorage.removeItem('sb_hotel_logged_in');
                  sessionStorage.setItem('sb_hotel_switch_target', role.id);
                } catch (e) {
                  console.warn('Storage not available');
                }
                // 刷新页面自动登录新角色
                window.location.reload();
              }}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                currentUser.role === role.id
                  ? 'border-[var(--role-color)]'
                  : 'border-transparent hover:border-border-color'
              }`}
              style={{ '--role-color': role.color } as any}
            >
              {/* 背景装饰 */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
                style={{ background: role.color }}
              />
              
              <div className="flex items-center gap-3 mb-3 relative">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: `${role.color}20`, color: role.color }}
                >
                  {role.id === 'owner' && <Crown size={24} />}
                  {role.id === 'manager' && <Briefcase size={24} />}
                  {role.id === 'staff' && <UserIcon size={24} />}
                </div>
                <div>
                  <span className="font-medium text-lg">{role.name}</span>
                  {currentUser.role === role.id && (
                    <span className="block text-xs" style={{ color: role.color }}>
                      当前角色
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-text-secondary relative">{role.desc}</p>
              
              {/* 权限预览 */}
              <AnimatePresence>
                {hoveredRole === role.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-border-color"
                  >
                    <p className="text-xs text-text-secondary mb-2">权限范围:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map(p => (
                        <span key={p} className="text-xs px-2 py-0.5 bg-bg-tertiary rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 权限对比表 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary">
            <tr className="text-left">
              <th className="px-4 py-3 text-text-secondary">功能权限</th>
              {roles.map(role => (
                <th key={role.id} className="px-4 py-3" style={{ color: role.color }}>{role.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: '修改底价', owner: 'allow', manager: 'request', staff: 'deny' },
              { name: '价格调整(≥底价)', owner: 'allow', manager: 'allow', staff: 'request' },
              { name: '审批底价突破', owner: 'allow', manager: 'allow', staff: 'deny' },
              { name: '库存管理', owner: 'allow', manager: 'allow', staff: 'allow' },
              { name: '查看财务数据', owner: 'allow', manager: 'allow', staff: 'deny' },
              { name: '初始化酒店', owner: 'allow', manager: 'deny', staff: 'deny' },
              { name: '管理用户权限', owner: 'allow', manager: 'deny', staff: 'deny' },
            ].map((row, i) => {
              const getIcon = (type: string) => {
                if (type === 'allow') return <span className="inline-flex items-center gap-1 text-neon-green"><Check size={14} /> 允许</span>;
                if (type === 'request') return <span className="inline-flex items-center gap-1 text-neon-amber"><AlertTriangle size={14} /> 需申请</span>;
                return <span className="inline-flex items-center gap-1 text-neon-red"><X size={14} /> 禁止</span>;
              };
              return (
                <tr key={i} className="border-t border-border-color">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{getIcon(row.owner)}</td>
                  <td className="px-4 py-3">{getIcon(row.manager)}</td>
                  <td className="px-4 py-3">{getIcon(row.staff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 退出登录 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Lock className="text-neon-red" size={20} />
          账户安全
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary font-medium">退出登录</p>
            <p className="text-sm text-text-secondary">清除当前会话并返回登录界面</p>
          </div>
          <motion.button
            onClick={() => {
              // 清除登录状态
              try {
                sessionStorage.removeItem('sb_hotel_logged_in');
                sessionStorage.removeItem('sb_hotel_user_id');
                sessionStorage.removeItem('sb_hotel_user_role');
              } catch (e) {
                console.warn('Storage not available');
              }
              // 刷新页面重新进入登录流程
              window.location.reload();
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2.5 bg-neon-red/10 text-neon-red border border-neon-red/50 rounded-lg hover:bg-neon-red/20 hover:border-neon-red transition-all flex items-center gap-2"
          >
            <span>退出登录</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}


// ============================================
// 权限管理组件（优化版）
// ============================================

function PermissionsManager({ currentRole }: { currentRole: UserRole }) {
  const { user, updateUserPermissions } = useUnifiedStore();
  const [selectedUser, setSelectedUser] = useState<typeof demoUsers[0] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPermissions, setEditPermissions] = useState<User['permissions'] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const manageableUsers = demoUsers.filter(u => u.id !== user.id && u.role !== 'owner');
  
  const filteredUsers = manageableUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const canEditPermissions = currentRole === 'owner';
  
  const permissionLabels: Record<string, { label: string; desc: string; icon: any }> = {
    canChangeFloorPrice: { label: '修改底价', desc: '调整房间底价', icon: Lock },
    canChangePrice: { label: '修改价格', desc: '在底价之上调价', icon: Edit3 },
    canSwitchHotel: { label: '切换酒店', desc: '切换管理酒店', icon: Building2 },
    canSwitchTimeMode: { label: '切换时间态', desc: '修改系统时间模式', icon: Clock },
    canInitHotel: { label: '初始化酒店', desc: '创建新酒店档案', icon: Plus },
    canApprove: { label: '审批权限', desc: '审批价格突破申请', icon: CheckCircle2 },
    canViewAudit: { label: '查看审计日志', desc: '查看操作记录', icon: FileText },
    canViewFinance: { label: '查看财务数据', desc: '查看财务报表', icon: Briefcase },
  };
  
  const startEdit = (targetUser: typeof demoUsers[0]) => {
    setSelectedUser(targetUser);
    setEditPermissions({ ...targetUser.permissions });
    setIsEditing(true);
  };
  
  const savePermissions = () => {
    if (!selectedUser || !editPermissions) return;
    updateUserPermissions(selectedUser.id, editPermissions);
    setIsEditing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  const cancelEdit = () => {
    setIsEditing(false);
    setEditPermissions(null);
    setSelectedUser(null);
  };
  
  const togglePermission = (key: keyof User['permissions']) => {
    if (!editPermissions) return;
    setEditPermissions({
      ...editPermissions,
      [key]: !editPermissions[key],
    });
  };

  const getPermissionCount = (perms: User['permissions']) => {
    return Object.values(perms).filter(v => v === true).length;
  };

  return (
    <div className="space-y-6">
      {/* 成功提示 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-2 px-4 py-3 bg-neon-green/20 text-neon-green rounded-lg"
          >
            <CheckCircle2 size={18} />
            <span>权限更新成功</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 当前用户信息 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <h3 className="text-lg font-semibold mb-4">当前用户</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center">
            {user.role === 'owner' && <Crown size={32} className="text-neon-purple" />}
            {user.role === 'manager' && <Briefcase size={32} className="text-neon-cyan" />}
            {user.role === 'staff' && <UserIcon size={32} className="text-text-secondary" />}
          </div>
          <div>
            <div className="text-xl font-medium">{user.name}</div>
            <div className="text-text-secondary">
              角色：{user.role === 'owner' ? '业主' : user.role === 'manager' ? '店长' : '员工'}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              拥有 {getPermissionCount(user.permissions)} / {Object.keys(user.permissions).length} 项权限
            </div>
          </div>
          {canEditPermissions && (
            <span className="ml-auto px-3 py-1 bg-neon-green/20 text-neon-green rounded-full text-sm">
              <Unlock size={14} className="inline mr-1" />
              可管理其他用户
            </span>
          )}
        </div>
      </div>

      {/* 用户列表 + 权限编辑 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">用户权限管理</h3>
          {!isEditing && (
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索用户..."
                className="px-4 py-2 bg-bg-tertiary border border-border-color rounded-lg text-sm w-48 focus:border-neon-cyan focus:outline-none"
              />
            </div>
          )}
        </div>
        
        {manageableUsers.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            暂无其他用户可管理
          </div>
        ) : !isEditing ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredUsers.map((u) => (
              <motion.div
                key={u.id}
                layoutId={u.id}
                className="p-4 bg-bg-tertiary rounded-xl border border-border-color hover:border-neon-cyan transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center text-xl">
                    {u.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-text-secondary">
                      {u.role === 'manager' ? '店长' : '员工'}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-lg font-bold text-neon-cyan">{getPermissionCount(u.permissions)}</div>
                    <div className="text-xs text-text-secondary">项权限</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(u.permissions)
                    .filter(([_, v]) => v === true)
                    .slice(0, 4)
                    .map(([k]) => (
                      <span key={k} className="px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan rounded text-xs">
                        {permissionLabels[k]?.label}
                      </span>
                    ))}
                  {getPermissionCount(u.permissions) > 4 && (
                    <span className="px-2 py-0.5 bg-bg-primary rounded text-xs text-text-secondary">
                      +{getPermissionCount(u.permissions) - 4}
                    </span>
                  )}
                </div>
                
                {canEditPermissions && (
                  <button
                    onClick={() => startEdit(u)}
                    className="w-full py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg text-sm hover:bg-neon-cyan/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} />
                    修改权限
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* 编辑头部 */}
            <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedUser?.avatar}</span>
                <div>
                  <div className="font-medium text-lg">{selectedUser?.name}</div>
                  <div className="text-xs text-text-secondary">
                    {selectedUser?.role === 'manager' ? '店长' : '员工'}
                  </div>
                </div>
              </div>
              <button
                onClick={cancelEdit}
                className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* 权限网格 */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(permissionLabels).map(([key, { label, desc, icon: Icon }]) => {
                const isEnabled = editPermissions?.[key as keyof User['permissions']] ?? false;
                return (
                  <motion.button
                    key={key}
                    onClick={() => togglePermission(key as keyof User['permissions'])}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
                      isEnabled
                        ? 'bg-neon-cyan/10 border-neon-cyan'
                        : 'bg-bg-tertiary border-border-color hover:border-text-secondary'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isEnabled ? 'bg-neon-cyan/20' : 'bg-bg-secondary'
                    }`}>
                      <Icon size={18} className={isEnabled ? 'text-neon-cyan' : 'text-text-secondary'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{label}</span>
                        {isEnabled && <Check size={14} className="text-neon-cyan" />}
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            
            {/* 操作按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={savePermissions}
                className="flex-1 py-3 bg-neon-cyan text-bg-primary rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                保存修改
              </button>
              <button
                onClick={cancelEdit}
                className="flex-1 py-3 bg-bg-tertiary border border-border-color rounded-lg hover:border-neon-cyan transition-all"
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


// ============================================
// 审计日志组件（优化版）
// ============================================

function AuditLogViewer({ logs, userRole }: { logs: any[]; userRole: UserRole }) {
  const { pendingPriceApproval } = useUnifiedStore();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week'>('all');
  
  // 过滤日志
  const visibleLogs = useMemo(() => {
    let filtered = userRole === 'owner' ? logs : 
      logs.filter((l: any) => l.level !== 'critical' || l.user === '当前用户');
    
    // 级别过滤
    if (filter !== 'all') {
      filtered = filtered.filter((l: any) => l.level === filter);
    }
    
    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter((l: any) => 
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.detail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 时间过滤
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date(now.getTime() - (dateRange === 'today' ? 1 : 7) * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((l: any) => new Date(l.time) >= cutoff);
    }
    
    return filtered;
  }, [logs, userRole, filter, searchTerm, dateRange]);

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'critical':
        return { label: '高危', bg: 'bg-neon-red/20', text: 'text-neon-red', icon: AlertTriangle };
      case 'warning':
        return { label: '警告', bg: 'bg-neon-amber/20', text: 'text-neon-amber', icon: AlertCircle };
      default:
        return { label: '普通', bg: 'bg-bg-tertiary', text: 'text-text-secondary', icon: Info };
    }
  };

  const stats = useMemo(() => ({
    total: logs.length,
    critical: logs.filter((l: any) => l.level === 'critical').length,
    warning: logs.filter((l: any) => l.level === 'warning').length,
    normal: logs.filter((l: any) => !l.level || l.level === 'normal').length,
  }), [logs]);

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部日志', value: stats.total, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
          { label: '高危操作', value: stats.critical, color: 'text-neon-red', bg: 'bg-neon-red/10' },
          { label: '警告记录', value: stats.warning, color: 'text-neon-amber', bg: 'bg-neon-amber/10' },
          { label: '普通操作', value: stats.normal, color: 'text-text-secondary', bg: 'bg-bg-tertiary' },
        ].map((stat, idx) => (
          <button
            key={idx}
            onClick={() => setFilter(idx === 0 ? 'all' : idx === 1 ? 'critical' : idx === 2 ? 'warning' : 'normal')}
            className={`p-4 rounded-xl border transition-all text-left ${
              (idx === 0 && filter === 'all') ||
              (idx === 1 && filter === 'critical') ||
              (idx === 2 && filter === 'warning') ||
              (idx === 3 && filter === 'normal')
                ? 'border-neon-cyan bg-neon-cyan/5'
                : 'border-border-color bg-bg-secondary'
            }`}
          >
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* 待办审批 */}
      {pendingPriceApproval && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neon-amber/10 border border-neon-amber rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-neon-amber mb-2">
            <AlertTriangle size={18} />
            <span className="font-medium">待办审批</span>
            <span className="ml-auto text-xs bg-neon-amber text-bg-primary px-2 py-0.5 rounded-full">
              1
            </span>
          </div>
          <p className="text-sm">
            <span className="font-medium">{pendingPriceApproval.requestedBy}</span> 申请底价突破：
            <span className="font-mono mx-1">¥{pendingPriceApproval.currentPrice}</span>
            →
            <span className="font-mono mx-1 text-neon-amber">¥{pendingPriceApproval.requestedPrice}</span>
          </p>
          <div className="flex gap-2 mt-3">
            <button className="px-4 py-1.5 bg-neon-green/20 text-neon-green rounded text-sm hover:bg-neon-green/30">
              批准
            </button>
            <button className="px-4 py-1.5 bg-neon-red/20 text-neon-red rounded text-sm hover:bg-neon-red/30">
              拒绝
            </button>
            <button className="px-4 py-1.5 bg-bg-tertiary rounded text-sm hover:bg-bg-secondary">
              查看详情
            </button>
          </div>
        </motion.div>
      )}

      {/* 过滤工具栏 */}
      <div className="flex items-center gap-4 bg-bg-secondary rounded-xl border border-border-color p-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索操作、用户或详情..."
            className="w-full px-4 py-2 bg-bg-tertiary border border-border-color rounded-lg text-sm focus:border-neon-cyan focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全部时间' },
            { key: 'today', label: '今日' },
            { key: 'week', label: '近7天' },
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setDateRange(range.key as any)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                dateRange === range.key
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'bg-bg-tertiary hover:bg-bg-primary'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setFilter('all'); setSearchTerm(''); setDateRange('all'); }}
          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          title="重置筛选"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* 日志列表 */}
      <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-tertiary">
            <tr className="text-left text-sm">
              <th className="px-4 py-3 text-text-secondary font-medium">时间</th>
              <th className="px-4 py-3 text-text-secondary font-medium">操作人</th>
              <th className="px-4 py-3 text-text-secondary font-medium">操作</th>
              <th className="px-4 py-3 text-text-secondary font-medium">详情</th>
              <th className="px-4 py-3 text-text-secondary font-medium">级别</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {visibleLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-text-secondary">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p>暂无符合条件的审计日志</p>
                </td>
              </tr>
            ) : (
              visibleLogs.map((log, idx) => {
                const config = getLevelConfig(log.level);
                const Icon = config.icon;
                return (
                  <motion.tr 
                    key={idx} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-t border-border-color hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{log.time}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-bg-tertiary rounded text-xs">
                        {log.user}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                      {log.detail}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}>
                        <Icon size={12} />
                        {config.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>显示 {visibleLogs.length} 条记录</span>
        <span>日志保留期限: 90天</span>
      </div>
    </div>
  );
}
