/**
 * Shadow-Bees V52 - 时间态三模式控制面板
 * 完整联动版本 - 真正影响全局数据
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Shuffle, RotateCcw, Clock, History, Gamepad2, PartyPopper, Activity } from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { snapshots } from '@/data/snapshots';

// 平台名称中文映射
const platformNames: Record<string, string> = {
  xianyu: '闲鱼',
  xiaohongshu: '小红书',
  wechat: '微信',
  ota: 'OTA',
};

export function TimeModeControl() {
  const {
    timeMode,
    switchTimeMode,
    realtimeSimulation,
    historyPlayback,
    sandboxState,
    startRealtimeSimulation,
    stopRealtimeSimulation,
    loadSnapshot,
    playHistory,
    pauseHistory,
    seekHistory,
    updateSandboxVariable,
    transactions,
  } = useUnifiedStore();
  
  // 启动实时模拟
  useEffect(() => {
    if (timeMode === 'realtime' && !realtimeSimulation.isRunning) {
      startRealtimeSimulation();
    }
    return () => {
      if (timeMode !== 'realtime') {
        stopRealtimeSimulation();
      }
    };
  }, [timeMode]);
  
  // 格式化播放时间
  const formatPlaybackTime = (position: number, totalEvents: number): string => {
    if (totalEvents === 0) return '14:00';
    const currentIndex = Math.floor((position / 100) * totalEvents);
    const hour = 14 + Math.floor(currentIndex / 2);
    const minute = (currentIndex % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
      {/* 模式切换标签 */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { id: 'realtime', icon: Clock, label: '实时推演', color: '#00F0FF', desc: '真实时间流动，随机事件' },
          { id: 'history', icon: History, label: '历史回放', color: '#A855F7', desc: '加载快照，控制播放' },
          { id: 'sandbox', icon: Gamepad2, label: '沙盘模拟', color: '#FFB800', desc: '冻结状态，调整变量' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = timeMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => switchTimeMode(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
              style={{
                background: isActive ? `${item.color}20` : 'transparent',
                border: `1px solid ${isActive ? item.color : 'var(--border-color)'}`,
              }}
              title={item.desc}
            >
              <Icon size={16} style={{ color: item.color }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* 模式说明 */}
      <div className="text-xs text-text-secondary mb-4 flex items-center gap-1.5">
        {timeMode === 'realtime' && <><Activity size={12} className="text-neon-green" /> 真实时间流动，数据实时变化，不可控</>}
        {timeMode === 'history' && <><History size={12} className="text-neon-purple" /> 加载预录快照，可播放/暂停/拖拽时间轴</>}
        {timeMode === 'sandbox' && <><Gamepad2 size={12} className="text-neon-amber" /> 冻结当前状态，调整变量看系统响应</>}
      </div>
      
      {/* ===== 实时推演模式 ===== */}
      {timeMode === 'realtime' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">实时成交模拟</span>
            <span className={`px-2 py-1 rounded text-xs ${
              realtimeSimulation.isRunning 
                ? 'bg-neon-green/20 text-neon-green animate-pulse' 
                : 'bg-neon-red/20 text-neon-red'
            }`}>
              {realtimeSimulation.isRunning ? '● 运行中' : '● 已暂停'}
            </span>
          </div>
          
          {/* 实时成交列表 - 只显示实时模拟生成的订单 */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <div className="text-xs text-text-secondary">最近成交（平均约50秒一单）</div>
            {transactions
              .filter(t => t.isRealtimeGenerated) // 只显示实时模拟生成的订单
              .slice(0, 5)
              .map((txn, idx) => {
                // 计算相对时间
                const now = Date.now();
                const txnTime = new Date(txn.timestamp).getTime();
                const diffSec = Math.floor((now - txnTime) / 1000);
                const diffMin = Math.floor(diffSec / 60);
                
                // 根据时间差显示不同文案
                let timeLabel: string;
                if (diffSec < 0) {
                  // 未来时间（异常情况），显示具体时间
                  timeLabel = new Date(txn.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
                } else if (diffSec < 60) {
                  timeLabel = '刚刚成交';
                } else if (diffMin < 60) {
                  timeLabel = `${diffMin}分钟前`;
                } else {
                  timeLabel = new Date(txn.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
                }
                
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between p-2.5 bg-bg-tertiary rounded-lg text-sm"
                  >
                    <PartyPopper size={14} className="text-neon-green flex-shrink-0" />
                    <span className="flex-1 ml-2 truncate">{timeLabel} {txn.roomType}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neon-green">¥{txn.price}</span>
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-white/5">
                        <img 
                          src={`/logos/${txn.platform}.jpg`} 
                          alt={platformNames[txn.platform]}
                          className="w-4 h-4 object-contain rounded-sm"
                        />
                        <span className="text-xs text-text-secondary whitespace-nowrap">{platformNames[txn.platform] || txn.platform}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            {transactions.filter(t => t.isRealtimeGenerated).length === 0 && (
              <div className="text-center text-text-secondary py-8">等待成交...</div>
            )}
          </div>
          
          {/* 控制按钮 */}
          <div className="flex gap-2">
            {realtimeSimulation.isRunning ? (
              <button
                onClick={stopRealtimeSimulation}
                className="flex items-center gap-2 px-4 py-2 bg-neon-red/20 border border-neon-red rounded-lg text-neon-red hover:bg-neon-red/30 transition-all"
              >
                <Pause size={16} />
                暂停模拟
              </button>
            ) : (
              <button
                onClick={startRealtimeSimulation}
                className="flex items-center gap-2 px-4 py-2 bg-neon-green/20 border border-neon-green rounded-lg text-neon-green hover:bg-neon-green/30 transition-all"
              >
                <Play size={16} />
                继续模拟
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* ===== 历史回放模式 ===== */}
      {timeMode === 'history' && (
        <div className="space-y-4">
          {/* 快照选择 */}
          <div className="space-y-2">
            <div className="text-xs text-text-secondary">选择历史快照</div>
            <div className="grid grid-cols-1 gap-2">
              {snapshots.map((snapshot) => (
                <button
                  key={snapshot.id}
                  onClick={() => loadSnapshot(snapshot.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-all ${
                    historyPlayback.currentSnapshot?.id === snapshot.id
                      ? 'border-neon-purple bg-neon-purple/10'
                      : 'border-border-color hover:border-neon-purple/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{snapshot.id.includes('concert') ? '🎤' : '🚄'}</span>
                    <div>
                      <div className="font-medium">{snapshot.name}</div>
                      <div className="text-xs text-text-secondary">{snapshot.timeline.length}个事件</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* 播放控制 */}
          {historyPlayback.currentSnapshot && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => historyPlayback.isPlaying ? pauseHistory() : playHistory()}
                  className="flex items-center gap-2 px-4 py-2 bg-neon-purple/20 border border-neon-purple rounded-lg text-neon-purple hover:bg-neon-purple/30 transition-all"
                >
                  {historyPlayback.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {historyPlayback.isPlaying ? '暂停' : '播放'}
                </button>
                <button
                  onClick={() => {
                    const shuffled = { ...historyPlayback.currentSnapshot! };
                    shuffled.timeline = [...shuffled.timeline].sort(() => Math.random() - 0.5);
                    useUnifiedStore.setState({
                      historyPlayback: { ...historyPlayback, currentSnapshot: shuffled, appliedEvents: new Set() }
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary border border-border-color rounded-lg hover:border-neon-amber transition-all"
                >
                  <Shuffle size={16} />
                  随机扰动
                </button>
              </div>
              
              {/* 时间轴 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-text-secondary font-mono">
                  <span>14:00</span>
                  <span className="text-neon-purple">
                    {formatPlaybackTime(historyPlayback.playbackPosition, historyPlayback.currentSnapshot?.timeline.length || 0)}
                  </span>
                  <span>22:00</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={historyPlayback.playbackPosition}
                  onChange={(e) => seekHistory(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* 事件进度 */}
              <div className="text-xs text-text-secondary">
                已应用 {historyPlayback.appliedEvents.size} / {historyPlayback.currentSnapshot.timeline.length} 个事件
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* ===== 沙盘模拟模式 ===== */}
      {timeMode === 'sandbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">变量调整</span>
            <button
              onClick={() => {
                useUnifiedStore.setState({
                  sandboxState: {
                    frozenBaseState: null,
                    variables: { competitorPriceAdjustment: 0, inventoryAdjustment: 0, eventIntensity: 'none', demandMultiplier: 1 },
                    simulatedResult: null,
                  }
                });
              }}
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-all"
            >
              <RotateCcw size={12} />
              重置
            </button>
          </div>
          
          {/* 竞品价格调整 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>竞品价格调整</span>
              <span className="font-mono" style={{ 
                color: sandboxState.variables.competitorPriceAdjustment >= 0 ? '#00E396' : '#FF4757' 
              }}>
                {sandboxState.variables.competitorPriceAdjustment >= 0 ? '+' : ''}
                {sandboxState.variables.competitorPriceAdjustment}%
              </span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              value={sandboxState.variables.competitorPriceAdjustment}
              onChange={(e) => updateSandboxVariable('competitorPriceAdjustment', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>-20%</span>
              <span>0%</span>
              <span>+20%</span>
            </div>
          </div>
          
          {/* 事件强度 */}
          <div className="space-y-2">
            <div className="text-sm">事件强度</div>
            <div className="flex gap-2">
              {[
                { key: 'none', label: '无', color: '#4A5568' },
                { key: 'low', label: '低', color: '#00E396' },
                { key: 'medium', label: '中', color: '#FFB800' },
                { key: 'high', label: '高', color: '#FF4757' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => updateSandboxVariable('eventIntensity', key)}
                  className="flex-1 py-2 rounded text-xs transition-all"
                  style={{
                    background: sandboxState.variables.eventIntensity === key ? `${color}20` : 'var(--bg-tertiary)',
                    border: `1px solid ${sandboxState.variables.eventIntensity === key ? color : 'var(--border-color)'}`,
                    color: sandboxState.variables.eventIntensity === key ? color : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 需求倍数 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>需求倍数</span>
              <span className="font-mono" style={{ 
                color: sandboxState.variables.demandMultiplier >= 1 ? '#00E396' : '#FFB800' 
              }}>
                {sandboxState.variables.demandMultiplier}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={sandboxState.variables.demandMultiplier}
              onChange={(e) => updateSandboxVariable('demandMultiplier', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>0.5x (冷淡)</span>
              <span>1.0x (正常)</span>
              <span>2.0x (火爆)</span>
            </div>
          </div>
          
          {/* 库存调整 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>库存调整</span>
              <span className="font-mono" style={{ 
                color: sandboxState.variables.inventoryAdjustment >= 0 ? '#00E396' : '#FF4757' 
              }}>
                {sandboxState.variables.inventoryAdjustment >= 0 ? '+' : ''}
                {sandboxState.variables.inventoryAdjustment}间
              </span>
            </div>
            <input
              type="range"
              min={-5}
              max={5}
              value={sandboxState.variables.inventoryAdjustment}
              onChange={(e) => updateSandboxVariable('inventoryAdjustment', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>-5间</span>
              <span>0</span>
              <span>+5间</span>
            </div>
          </div>
          
          {/* 模拟结果 */}
          {sandboxState.simulatedResult && sandboxState.simulatedResult.metrics && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-neon-cyan/10 border border-neon-cyan rounded-lg"
            >
              <div className="text-xs text-neon-cyan mb-2">📊 推演结果</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">建议售价</span>
                  <span className="font-mono text-neon-cyan">¥{sandboxState.simulatedResult.pricing.basePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">预期成交</span>
                  <span className="font-mono">{sandboxState.simulatedResult.metrics.expectedVolume}单</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">预期收益</span>
                  <span className="font-mono">¥{sandboxState.simulatedResult.metrics.expectedRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">收益变化</span>
                  <span className="font-mono" style={{
                    color: Number(sandboxState.simulatedResult.metrics.revenueChange) >= 0 ? '#00E396' : '#FF4757'
                  }}>
                    {Number(sandboxState.simulatedResult.metrics.revenueChange) >= 0 ? '+' : ''}
                    {sandboxState.simulatedResult.metrics.revenueChange}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">库存压力</span>
                  <span className="font-mono" style={{
                    color: Number(sandboxState.simulatedResult.metrics.inventoryPressure) > 80 ? '#FF4757' : 
                           Number(sandboxState.simulatedResult.metrics.inventoryPressure) > 50 ? '#FFB800' : '#00E396'
                  }}>
                    {sandboxState.simulatedResult.metrics.inventoryPressure}%
                  </span>
                </div>
                <div className="pt-2 border-t border-neon-cyan/30">
                  <div className="text-xs text-text-secondary mb-1">💡 推荐策略</div>
                  <div className="text-sm">{sandboxState.simulatedResult.metrics.recommendedStrategy}</div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* 冻结提示 */}
          {!sandboxState.frozenBaseState && (
            <div className="p-3 bg-neon-amber/10 border border-neon-amber rounded-lg text-sm text-neon-amber">
              ⚠️ 切换到沙盘模式时已自动冻结当前状态作为基准
            </div>
          )}
        </div>
      )}
    </div>
  );
}
