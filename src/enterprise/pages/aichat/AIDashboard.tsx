/**
 * Shadow-Bees V52 - AI客服中心 - 数据看板（企业版完整版）
 * 
 * 核心功能：
 * 1. 与顶部酒店选择器关联（单酒店/多酒店模式）
 * 2. 实时SLA监控与超时预警
 * 3. AI效果分析（采纳率、准确率）
 * 4. 客服人效统计
 * 5. 渠道对比分析
 * 
 * 主题：企业版浅色主题
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Users,
  Bot,
  Target,
  Zap,
  Filter,
  Building2,
  RefreshCw,
  Phone,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useEnterpriseStore } from '../../stores/enterpriseStore';
import { BatchOperationBar } from '../../components/BatchOperationBar';
import { aichatApi } from '../../api';

// ==================== 类型定义 ====================

interface SLAStats {
  totalRequests: number;
  withinSLA: number;
  breachedSLA: number;
  avgResponseTime: number; // 分钟
  slaComplianceRate: number; // 百分比
}

interface AIEffectiveness {
  totalSuggestions: number;
  acceptedSuggestions: number;
  editedSuggestions: number;
  rejectedSuggestions: number;
  acceptRate: number;
  avgConfidence: number;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  handledRequests: number;
  avgResponseTime: number;
  satisfaction: number;
  aiAdoptionRate: number;
  onlineHours: number;
}

interface ChannelStats {
  channel: string;
  totalMessages: number;
  aiHandled: number;
  humanHandled: number;
  avgResponseTime: number;
  conversionRate: number;
}

interface TimeSeriesData {
  date: string;
  totalMessages: number;
  aiHandled: number;
  humanHandled: number;
  slaBreaches: number;
}

// ==================== 子组件 ====================

// ==================== 主组件 ====================

export function AIChatDashboard() {
  const navigate = useNavigate();
  const { hotels, selectedHotelIds } = useEnterpriseStore();
  const selectedHotels = useMemo(() => 
    hotels.filter(h => selectedHotelIds.includes(h.id)),
    [hotels, selectedHotelIds]
  );

  const [dateRange, setDateRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  // 数据状态
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [aiEffectiveness, setAiEffectiveness] = useState<AIEffectiveness | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);

  // 加载数据 - 当酒店选择或时间范围变化时重新加载
  useEffect(() => {
    const loadData = async () => {
      if (selectedHotels.length === 0) {
        setSlaStats(null);
        setAiEffectiveness(null);
        setAgentPerformance([]);
        setChannelStats([]);
        setTimeSeries([]);
        return;
      }
      try {
        const hotelIds = selectedHotels.map(h => h.id);
        // 根据时间范围调整数据（模拟不同时间范围返回不同数据）
        const daysMap: Record<string, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[dateRange] || 7;
        
        const summaryRes = await aichatApi.getAIDashboardSummary(hotelIds, days);
        if (summaryRes.success) {
          setSlaStats(summaryRes.data.sla);
          setAiEffectiveness(summaryRes.data.aiEffectiveness);
          setAgentPerformance(summaryRes.data.agentPerformance);
          setChannelStats(summaryRes.data.channelStats);
          setTimeSeries(summaryRes.data.timeSeries);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };
    loadData();
  }, [selectedHotels, dateRange]);

  // 模拟刷新数据
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // 空状态
  if (selectedHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">请选择酒店查看数据看板</h3>
        <p className="text-gray-500 text-center max-w-md mb-6">
          AI客服数据看板需要选择至少一家酒店才能查看。<br/>
          支持多酒店数据汇总对比分析。
        </p>
        <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 px-4 py-2 rounded-lg">
          <Building2 className="w-4 h-4" />
          <span>请从顶部酒店选择器中选择酒店</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 批量操作提示条 */}
      <BatchOperationBar />

      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI客服数据看板</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedHotels.length === 1 
              ? `查看 ${selectedHotels[0].name} 的客服数据`
              : `汇总 ${selectedHotels.length} 家酒店的数据`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="today">今日</option>
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
            <option value="90d">近90天</option>
          </select>
          <button
            onClick={handleRefresh}
            className={`p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 核心指标卡片 - 使用统一的灰色主题 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-xs text-gray-400">总咨询量</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{slaStats?.totalRequests?.toLocaleString() ?? '-'}</div>
          <div className="text-sm text-gray-500">近7天数据</div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-400">AI解决率</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{aiEffectiveness?.acceptRate ? `${aiEffectiveness.acceptRate}%` : '-'}</div>
          <div className="text-sm text-gray-500">建议采纳率</div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs text-gray-400">平均响应</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{slaStats?.avgResponseTime ? `${slaStats.avgResponseTime}min` : '-'}</div>
          <div className="text-sm text-gray-500">平均响应时间</div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs text-gray-400">SLA合规</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{slaStats?.slaComplianceRate ? `${slaStats.slaComplianceRate}%` : '-'}</div>
          <div className="text-sm text-gray-500">服务等级达成</div>
        </div>
      </div>

      {/* SLA监控区域 */}
      <div className="grid grid-cols-3 gap-6">
        {/* SLA合规率 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">SLA合规率</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              slaStats && slaStats.slaComplianceRate >= 95 
                ? 'bg-green-100 text-green-700'
                : slaStats && slaStats.slaComplianceRate >= 90
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              {slaStats ? (slaStats.slaComplianceRate >= 95 ? '优秀' : slaStats.slaComplianceRate >= 90 ? '良好' : '需改进') : '-'}
            </span>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className={`${
                    slaStats && slaStats.slaComplianceRate >= 95 
                      ? 'text-green-500'
                      : slaStats && slaStats.slaComplianceRate >= 90
                        ? 'text-yellow-500'
                        : 'text-red-500'
                  }`}
                  strokeDasharray={`${slaStats?.slaComplianceRate ?? 0}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{slaStats?.slaComplianceRate ?? '-'}%</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">按时响应</span>
              <span className="font-medium text-gray-900">{slaStats?.withinSLA ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">超时响应</span>
              <span className="font-medium text-red-600">{slaStats?.breachedSLA ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">平均响应</span>
              <span className="font-medium text-gray-900">{slaStats?.avgResponseTime ?? '-'}分钟</span>
            </div>
          </div>
        </div>

        {/* AI效果分析 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AI效果分析</h3>
            <Sparkles className="w-5 h-5 text-violet-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-violet-50 rounded-lg">
              <div className="text-2xl font-bold text-violet-700">{aiEffectiveness?.acceptRate ?? '-'}%</div>
              <div className="text-xs text-violet-600">采纳率</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{aiEffectiveness?.avgConfidence ?? '-'}%</div>
              <div className="text-xs text-blue-600">平均置信度</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">直接采纳</span>
              </div>
              <span className="font-medium">{aiEffectiveness?.acceptedSuggestions ?? '-'}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: `${aiEffectiveness ? (aiEffectiveness.acceptedSuggestions / aiEffectiveness.totalSuggestions) * 100 : 0}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm pt-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">编辑后采纳</span>
              </div>
              <span className="font-medium">{aiEffectiveness?.editedSuggestions ?? '-'}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full" 
                style={{ width: `${aiEffectiveness ? (aiEffectiveness.editedSuggestions / aiEffectiveness.totalSuggestions) * 100 : 0}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm pt-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-gray-600">未采纳</span>
              </div>
              <span className="font-medium">{aiEffectiveness?.rejectedSuggestions ?? '-'}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div 
                className="bg-orange-500 h-1.5 rounded-full" 
                style={{ width: `${aiEffectiveness ? (aiEffectiveness.rejectedSuggestions / aiEffectiveness.totalSuggestions) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* 预警提醒 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">实时监控</h3>
            <div className="flex items-center gap-1 text-green-600 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              实时
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-700">3个会话即将超时</span>
              </div>
              <p className="text-xs text-red-600">请尽快分配给客服处理</p>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-700">平均等待时间上升</span>
              </div>
              <p className="text-xs text-amber-600">较昨日 +0.8分钟</p>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700">AI准确率创新高</span>
              </div>
              <p className="text-xs text-green-600">今日平均 89.5%</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/aichat/handoff')}
            className="w-full mt-3 py-2 text-sm text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
          >
            查看全部预警
          </button>
        </div>
      </div>

      {/* 客服人效排行 */}
      <div className="bg-white p-5 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">客服人效排行</h3>
          <button 
            onClick={() => navigate('/aichat/collab')}
            className="text-sm text-violet-600 hover:underline"
          >
            查看全部
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">排名</th>
                <th className="pb-3 font-medium">客服</th>
                <th className="pb-3 font-medium">处理量</th>
                <th className="pb-3 font-medium">平均响应</th>
                <th className="pb-3 font-medium">满意度</th>
                <th className="pb-3 font-medium">AI采纳率</th>
                <th className="pb-3 font-medium">在线时长</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {agentPerformance.map((agent, index) => (
                <tr key={agent.agentId} className="border-b border-gray-50 last:border-0">
                  <td className="py-3">
                    {index < 3 ? (
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {index + 1}
                      </span>
                    ) : (
                      <span className="text-gray-400 w-6 text-center inline-block">{index + 1}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-violet-600" />
                      </div>
                      <span className="font-medium text-gray-900">{agent.agentName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-900">{agent.handledRequests}</td>
                  <td className="py-3">
                    <span className={agent.avgResponseTime <= 3 ? 'text-green-600' : 'text-amber-600'}>
                      {agent.avgResponseTime}min
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-gray-900">{agent.satisfaction}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div 
                          className="bg-violet-500 h-1.5 rounded-full" 
                          style={{ width: `${agent.aiAdoptionRate}%` }}
                        />
                      </div>
                      <span className="text-gray-600">{agent.aiAdoptionRate}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">{agent.onlineHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 渠道对比 & 趋势图 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 渠道对比 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">渠道表现对比</h3>
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {channelStats.map((channel) => (
              <div key={channel.channel} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{channel.channel}</span>
                  <span className="text-sm text-gray-500">{channel.totalMessages} 消息</span>
                </div>
                
                <div className="flex items-center gap-4 text-xs mb-2">
                  <div className="flex items-center gap-1">
                    <Bot className="w-3 h-3 text-violet-500" />
                    <span className="text-gray-600">AI: {channel.aiHandled}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span className="text-gray-600">人工: {channel.humanHandled}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-green-500" />
                    <span className="text-gray-600">转化: {channel.conversionRate}%</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full" 
                    style={{ width: `${(channel.aiHandled / channel.totalMessages) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>AI占比: {Math.round((channel.aiHandled / channel.totalMessages) * 100)}%</span>
                  <span>平均响应: {channel.avgResponseTime}min</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 趋势图 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">7日趋势</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-violet-500 rounded" />
                <span className="text-gray-600">AI处理</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-gray-600">人工处理</span>
              </div>
            </div>
          </div>
          
          <div className="h-48 flex items-end gap-2">
            {timeSeries.map((day) => {
              const maxMessages = timeSeries.length > 0 ? Math.max(...timeSeries.map(d => d.totalMessages)) : 1;
              const aiHeight = (day.aiHandled / maxMessages) * 100;
              const humanHeight = (day.humanHandled / maxMessages) * 100;
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5 h-36">
                    <div 
                      className="flex-1 bg-violet-500 rounded-t hover:bg-violet-600 transition-colors"
                      style={{ height: `${aiHeight}%` }}
                      title={`AI: ${day.aiHandled}`}
                    />
                    <div 
                      className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                      style={{ height: `${humanHeight}%` }}
                      title={`人工: ${day.humanHandled}`}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{day.date}</span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {timeSeries.reduce((sum, d) => sum + d.totalMessages, 0)}
              </div>
              <div className="text-xs text-gray-500">7日总量</div>
            </div>
            <div>
              <div className="text-lg font-bold text-violet-600">
                {timeSeries.length > 0 ? Math.round(timeSeries.reduce((sum, d) => sum + d.aiHandled, 0) / timeSeries.reduce((sum, d) => sum + d.totalMessages, 0) * 100) : '-'}%
              </div>
              <div className="text-xs text-gray-500">AI平均占比</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {timeSeries.reduce((sum, d) => sum + d.slaBreaches, 0)}
              </div>
              <div className="text-xs text-gray-500">SLA超时</div>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="flex gap-4">
        <button 
          onClick={() => navigate('/aichat/dispatch')}
          className="flex-1 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Timer className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">SLA设置</h4>
              <p className="text-sm text-gray-500">调整响应时间标准</p>
            </div>
          </div>
        </button>
        
        <button 
          onClick={() => navigate('/aichat/scripts')}
          className="flex-1 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">AI话术库</h4>
              <p className="text-sm text-gray-500">优化建议准确率</p>
            </div>
          </div>
        </button>
        
        <button 
          onClick={() => navigate('/aichat/collab')}
          className="flex-1 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">人机协作</h4>
              <p className="text-sm text-gray-500">管理人工客服在线</p>
            </div>
          </div>
        </button>
        
        <button 
          onClick={handleRefresh}
          className="flex-1 p-4 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">刷新数据</h4>
              <p className="text-sm text-gray-500">更新看板数据</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default AIChatDashboard;
