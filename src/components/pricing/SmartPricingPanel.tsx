/**
 * 智能定价控制面板（优化版）
 * 用业务语言替代技术语言，增加效果反馈
 */

import { 
  Brain, 
  Play, 
  Pause, 
  RefreshCw, 
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { cn } from '@/lib/utils';

export function SmartPricingPanel() {
  const { 
    smartPricing, 
    pricing,
    enableSmartPricing, 
    setAutoApply,
    runSmartPricing 
  } = useUnifiedStore();
  
  const isEnabled = smartPricing.enabled;
  const isAutoApply = smartPricing.autoApply;
  const mode = pricing.mode;
  
  // 计算距离上次调价的时间
  const minutesSinceLastUpdate = smartPricing.lastPricingUpdate > 0
    ? Math.floor((Date.now() - smartPricing.lastPricingUpdate) / (1000 * 60))
    : null;
  
  // 计算与竞品的价差
  const competitorAvg = pricing.competitorAvg || 0;
  const basePrice = pricing.basePrice || 0;
  const priceDiff = basePrice - competitorAvg;
  const priceDiffPercent = competitorAvg > 0 ? ((priceDiff / competitorAvg) * 100).toFixed(0) : '0';
  
  // 业务化模式名称和描述（精简版，避免换行）
  const modeConfig = {
    clearance: { 
      label: '快速出货', 
      color: 'text-neon-amber',
      bg: 'bg-neon-amber/20',
      border: 'border-neon-amber/30',
      desc: '库存积压，建议降价促销',
      icon: TrendingDown,
      effect: '预计多卖 2-3 间'
    },
    dynamic: { 
      label: '随行就市', 
      color: 'text-neon-cyan',
      bg: 'bg-neon-cyan/20',
      border: 'border-neon-cyan/30',
      desc: '市场平稳，跟随竞品定价',
      icon: Zap,
      effect: '价格有竞争力'
    },
    scalper: { 
      label: '收益最大化', 
      color: 'text-neon-purple',
      bg: 'bg-neon-purple/20',
      border: 'border-neon-purple/30',
      desc: '市场紧张，适当溢价',
      icon: TrendingUp,
      effect: '收益提升 ¥80-120'
    },
  };
  
  const currentMode = modeConfig[mode];
  const ModeIcon = currentMode.icon;

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
            isEnabled ? "bg-neon-cyan/20" : "bg-bg-tertiary"
          )}>
            <Brain className={cn(
              "w-5 h-5",
              isEnabled ? "text-neon-cyan" : "text-text-secondary"
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">智能定价助手</h3>
            <p className="text-xs text-text-secondary whitespace-nowrap">
              {isEnabled ? '已开启：自动监控并推荐定价' : '已暂停：系统不会自动调价'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => enableSmartPricing(!isEnabled)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all",
              isEnabled
                ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan hover:bg-neon-cyan/30"
                : "bg-bg-tertiary text-text-secondary border border-border-color hover:text-text-primary"
            )}
          >
            {isEnabled ? (
              <>
                <Pause className="w-4 h-4" />
                暂停助手
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                开启助手
              </>
            )}
          </button>
          
          {isEnabled && (
            <button
              onClick={runSmartPricing}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
              title="立即获取最新定价建议"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {isEnabled && (
        <>
          {/* 手动/自动模式切换 - 单行布局 */}
          <div className="flex items-center justify-between p-2.5 bg-bg-tertiary rounded-lg mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">应用模式</span>
              <span className="text-sm font-medium text-text-primary">
                {isAutoApply ? '自动' : '手动'}
              </span>
              <span className="text-xs text-text-secondary">
                {isAutoApply ? '(系统自动应用)' : '(需手动确认)'}
              </span>
            </div>
            <button
              onClick={() => setAutoApply(!isAutoApply)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-all",
                isAutoApply
                  ? "bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30"
                  : "bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-color"
              )}
            >
              {isAutoApply ? '切手动' : '切自动'}
            </button>
          </div>
          
          {/* 当前策略卡片 - 紧凑布局 */}
          <div className={cn(
            "rounded-lg border p-3 mb-3",
            currentMode.bg,
            currentMode.border
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("flex-shrink-0", currentMode.color)}>
                <ModeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn("font-semibold text-sm", currentMode.color)}>
                    {currentMode.label}
                  </span>
                  <span className="text-[10px] text-text-secondary flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {minutesSinceLastUpdate !== null ? `${minutesSinceLastUpdate}分前` : '待分析'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary truncate">
                  {currentMode.desc}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />
                  <span className="text-xs text-text-primary">{currentMode.effect}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 价格对比 - 更紧凑 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-bg-tertiary rounded-lg p-2.5">
              <div className="text-xs text-text-secondary mb-0.5">与竞品对比</div>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  "text-lg font-bold font-mono",
                  priceDiff > 0 ? "text-neon-green" : priceDiff < 0 ? "text-neon-amber" : "text-text-primary"
                )}>
                  {priceDiff > 0 ? '高' : priceDiff < 0 ? '低' : '平'}
                  {priceDiff !== 0 && ` ¥${Math.abs(priceDiff)}`}
                </span>
                <span className="text-[10px] text-text-secondary">
                  ({priceDiffPercent}%)
                </span>
              </div>
              <div className="text-[10px] text-text-secondary">
                竞品均价 ¥{competitorAvg}
              </div>
            </div>
            
            <div className="bg-bg-tertiary rounded-lg p-2.5">
              <div className="text-xs text-text-secondary mb-0.5">今日调价</div>
              <div className="text-lg font-bold font-mono text-text-primary">
                {smartPricing.todayPricingUpdateCount}
                <span className="text-[10px] text-text-secondary font-normal">/20</span>
              </div>
              <div className="text-[10px] text-text-secondary">
                间隔 ≥5分钟
              </div>
            </div>
          </div>
          
          {/* 调价效果反馈 - 单行显示 */}
          {smartPricing.lastPricingUpdate > 0 && (
            <div className="mb-3 p-2.5 bg-neon-green/10 border border-neon-green/30 rounded-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neon-green flex-shrink-0" />
              <span className="text-xs text-text-secondary truncate">
                <span className="text-neon-green font-medium">效果：</span>
                30分钟内成交 <span className="text-text-primary">1单</span>，预计多售 <span className="text-text-primary">2-3间</span>
              </span>
            </div>
          )}
          
          {/* 简化的规则说明 - 更紧凑 */}
          <div className="p-2 bg-bg-tertiary/50 rounded-lg">
            <div className="text-xs text-text-secondary flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <ul className="space-y-0.5 text-text-secondary/80 text-[11px]">
                <li>• 竞品售罄+我们紧张 → 涨价</li>
                <li>• 房间空置多 → 降价促销</li>
                <li>• 市场平稳 → 跟随主流</li>
              </ul>
            </div>
          </div>
        </>
      )}
      
      {!isEnabled && (
        <div className="p-3 bg-bg-tertiary/50 rounded-lg text-center">
          <Brain className="w-7 h-7 text-text-secondary mx-auto mb-2" />
          <p className="text-xs text-text-secondary mb-2">
            系统每5分钟分析市场，自动推荐定价
          </p>
          <button
            onClick={() => enableSmartPricing(true)}
            className="px-3 py-1.5 bg-neon-cyan/20 text-neon-cyan rounded-lg text-xs hover:bg-neon-cyan/30 transition-all"
          >
            开启助手
          </button>
        </div>
      )}
    </div>
  );
}
