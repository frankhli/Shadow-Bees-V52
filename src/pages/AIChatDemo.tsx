import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, BarChart3, UserCircle, MessageSquare, Brain } from 'lucide-react';
import { useUnifiedStore } from '@/stores/unifiedStore';
import { aiService, AIServiceFactory, type ConversationContext as AIContext } from '@/services/ai';
import { modeDetails } from '@/utils/helpers';
import type { PricingMode } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  intent?: string;
  emotion?: 'neutral' | 'frustrated' | 'interested' | 'angry';
  confidence?: number;
}

// 对话上下文状态（UI层）
interface UIContext {
  stage: 'greeting' | 'inquiry' | 'bargain' | 'objection' | 'closing' | 'escalated';
  userEmotion: 'neutral' | 'interested' | 'frustrated' | 'angry';
  bargainCount: number;
  topicsDiscussed: Set<string>;
  lastTopic: string;
  pressureApplied: number;
  rapportBuilt: boolean;
  sessionId: string;
}

// 真实对话场景 - 模拟完整的客户咨询流程
const conversationScenarios: Record<PricingMode, {
  name: string;
  style: string;
  personality: string;
  scenarios: Array<{
    name: string;
    description: string;
    flow: Array<{
      user: string;
      emotion?: 'neutral' | 'interested' | 'frustrated' | 'angry';
    }>;
  }>;
}> = {
  scalper: {
    name: '黄牛模式',
    style: '制造稀缺、强势引导、不议价',
    personality: '经验老道、话术犀利、心理战高手',
    scenarios: [
      {
        name: '演唱会门票黄牛场景',
        description: '利用演唱会热度制造稀缺',
        flow: [
          { user: '你好，这个周末还有房吗？', emotion: 'interested' },
          { user: '多少钱一晚？', emotion: 'interested' },
          { user: '380有点贵啊，能便宜点吗？', emotion: 'frustrated' },
          { user: '300我就订了', emotion: 'frustrated' },
          { user: '那我再看看吧...', emotion: 'neutral' },
        ]
      },
      {
        name: '马拉松赛事',
        description: '运动员订房，强调位置优势',
        flow: [
          { user: '下周六有马拉松，你们这离起点近吗？', emotion: 'interested' },
          { user: '步行要多久？', emotion: 'interested' },
          { user: '价格比平时贵了一倍啊', emotion: 'frustrated' },
          { user: '别家好像没这么贵', emotion: 'frustrated' },
          { user: '行行行，给我留着，我这就下单', emotion: 'interested' },
        ]
      }
    ]
  },
  dynamic: {
    name: '动态定价模式',
    style: '数据驱动、价值解释、适度弹性',
    personality: '专业理性、数据说话、善于说服',
    scenarios: [
      {
        name: '商务出差咨询',
        description: '商务客对价格敏感但看重服务',
        flow: [
          { user: '下周三晚还有房吗？', emotion: 'neutral' },
          { user: '标准间多少钱？', emotion: 'neutral' },
          { user: '320？上周我看还是280', emotion: 'frustrated' },
          { user: '你们这价格怎么还涨了', emotion: 'frustrated' },
          { user: '能开发票吗？公司报销', emotion: 'neutral' },
          { user: '好吧，给我订一间', emotion: 'interested' },
        ]
      },
      {
        name: '情侣周末出行',
        description: '看重体验，价格敏感度中等',
        flow: [
          { user: '这周末想订个浪漫一点的房间', emotion: 'interested' },
          { user: '有推荐吗？', emotion: 'interested' },
          { user: '480有点超预算了', emotion: 'frustrated' },
          { user: '有什么优惠吗？', emotion: 'neutral' },
          { user: '免费早餐+延迟退房？听起来不错', emotion: 'interested' },
          { user: '那订这个吧', emotion: 'interested' },
        ]
      }
    ]
  },
  clearance: {
    name: '清仓模式',
    style: '促销氛围、让步空间、促成转化',
    personality: '热情主动、善于让步、促单高手',
    scenarios: [
      {
        name: '捡漏型客户',
        description: '专门找便宜的客户',
        flow: [
          { user: '你们这现在最便宜多少？', emotion: 'interested' },
          { user: '180？还能再少吗？', emotion: 'interested' },
          { user: '我看别家有150的', emotion: 'frustrated' },
          { user: '你们这房间不会有什么问题吧？', emotion: 'frustrated' },
          { user: '再送个早餐我就订', emotion: 'interested' },
          { user: '成交！', emotion: 'interested' },
        ]
      },
      {
        name: '犹豫型客户',
        description: '一直在比较，需要临门一脚',
        flow: [
          { user: '这个房型有窗吗？', emotion: 'neutral' },
          { user: '能看到江景吗？', emotion: 'neutral' },
          { user: '价格还能再便宜吗？', emotion: 'frustrated' },
          { user: '我再考虑一下...', emotion: 'neutral' },
          { user: '现在订的话还有什么优惠？', emotion: 'interested' },
          { user: '好的我这就下单', emotion: 'interested' },
        ]
      }
    ]
  }
};

// 场景选择器
const ScenarioSelector = ({ 
  mode, 
  onSelect 
}: { 
  mode: PricingMode; 
  onSelect: (scenario: typeof conversationScenarios[PricingMode]['scenarios'][0]) => void;
}) => {
  const scenarios = conversationScenarios[mode];
  
  return (
    <div className="space-y-3">
      <div className="text-sm text-text-secondary mb-2">选择对话场景体验AI能力：</div>
      {scenarios.scenarios.map((scenario, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(scenario)}
          className="w-full text-left p-4 bg-bg-tertiary rounded-xl border border-border-color hover:border-neon-cyan transition-all group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium group-hover:text-neon-cyan transition-colors">
                {scenario.name}
              </div>
              <div className="text-xs text-text-secondary mt-1">{scenario.description}</div>
            </div>
            <div className="text-xs text-neon-cyan">点击开始 →</div>
          </div>
        </button>
      ))}
    </div>
  );
};

// AI意图分析展示组件
const IntentAnalysisPanel = ({ 
  lastIntent,
  context 
}: { 
  lastIntent: any;
  context: UIContext;
}) => {
  if (!lastIntent) return null;

  const intentLabels: Record<string, string> = {
    price_inquiry: '价格咨询',
    bargain: '议价',
    complaint: '投诉',
    booking: '预订',
    refund: '退款',
    small_talk: '闲聊',
    escalation_request: '要求人工',
  };

  const emotionLabels: Record<string, { label: string; color: string; emoji: string }> = {
    angry: { label: '愤怒', color: 'text-red-500', emoji: '😠' },
    frustrated: { label: '沮丧', color: 'text-yellow-500', emoji: '😤' },
    neutral: { label: '平静', color: 'text-blue-500', emoji: '😐' },
    positive: { label: '积极', color: 'text-green-500', emoji: '😊' },
    excited: { label: '兴奋', color: 'text-purple-500', emoji: '🤩' },
  };

  const sentiment = lastIntent.sentiment;
  const emotionInfo = emotionLabels[sentiment.label] || emotionLabels.neutral;

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-color p-4 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Brain size={16} className="text-neon-purple" />
        AI意图分析
      </h3>
      
      {/* 意图识别 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-bg-tertiary rounded-lg">
          <div className="text-xs text-text-secondary mb-1">识别意图</div>
          <div className="font-medium">{intentLabels[lastIntent.type] || lastIntent.type}</div>
          <div className="text-xs text-text-secondary mt-1">
            置信度: {Math.round(lastIntent.confidence * 100)}%
          </div>
        </div>
        <div className="p-3 bg-bg-tertiary rounded-lg">
          <div className="text-xs text-text-secondary mb-1">情绪状态</div>
          <div className={`font-medium flex items-center gap-1 ${emotionInfo.color}`}>
            <span>{emotionInfo.emoji}</span>
            <span>{emotionInfo.label}</span>
          </div>
          <div className="text-xs text-text-secondary mt-1">
            分数: {sentiment.score.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 紧急程度 */}
      <div className="p-3 bg-bg-tertiary rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary">紧急程度</span>
          <span className={`text-xs font-medium ${
            lastIntent.urgency === 'critical' ? 'text-red-500' :
            lastIntent.urgency === 'high' ? 'text-orange-500' :
            lastIntent.urgency === 'medium' ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            {lastIntent.urgency === 'critical' ? '紧急' :
             lastIntent.urgency === 'high' ? '高' :
             lastIntent.urgency === 'medium' ? '中' : '低'}
          </span>
        </div>
        <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              lastIntent.urgency === 'critical' ? 'bg-red-500' :
              lastIntent.urgency === 'high' ? 'bg-orange-500' :
              lastIntent.urgency === 'medium' ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${
              lastIntent.urgency === 'critical' ? 100 :
              lastIntent.urgency === 'high' ? 75 :
              lastIntent.urgency === 'medium' ? 50 : 25
            }%` }}
          />
        </div>
      </div>

      {/* 提取的实体 */}
      {Object.keys(lastIntent.entities).length > 0 && (
        <div>
          <div className="text-xs text-text-secondary mb-2">提取信息</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(lastIntent.entities).map(([key, value]) => (
              <span 
                key={key}
                className="px-2 py-1 bg-neon-cyan/10 text-neon-cyan rounded text-xs"
              >
                {key}: {value as string}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 议价次数 */}
      {context.bargainCount > 0 && (
        <div className="p-3 bg-neon-amber/10 border border-neon-amber/30 rounded-lg">
          <div className="flex items-center gap-2 text-neon-amber">
            <MessageSquare size={14} />
            <span className="text-sm">已议价 {context.bargainCount} 轮</span>
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {context.bargainCount >= 4 ? '已达到转人工阈值' : 
             context.bargainCount >= 2 ? 'AI还有策略空间' : '正常议价范围'}
          </div>
        </div>
      )}
    </div>
  );
};

// 会话统计组件
const ConversationStats = ({ 
  messages, 
  context,
  lastIntent
}: { 
  messages: Message[]; 
  context: UIContext;
  lastIntent: any;
}) => {
  const stats = useMemo(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    const aiMessages = messages.filter(m => m.role === 'ai');
    
    // 计算平均响应时间（模拟）
    const avgResponseTime = messages.length > 0 
      ? Math.round((800 + Math.random() * 600) / 1000 * 10) / 10 
      : 0;
    
    // 情绪分布
    const emotionStats = {
      neutral: userMessages.filter(m => m.emotion === 'neutral').length,
      interested: userMessages.filter(m => m.emotion === 'interested').length,
      frustrated: userMessages.filter(m => m.emotion === 'frustrated').length,
      angry: userMessages.filter(m => m.emotion === 'angry').length,
    };
    
    // 高频词提取
    const allText = userMessages.map(m => m.content).join('');
    const keywords = ['价格', '便宜', '优惠', '发票', '位置', '退房', '早餐', '押金'];
    const keywordCounts = keywords.map(k => ({
      word: k,
      count: (allText.match(new RegExp(k, 'g')) || []).length
    })).filter(k => k.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
    
    // 基于AI分析计算成交概率
    let conversionRate = context.stage === 'closing' ? 100 : 
                        context.stage === 'escalated' ? 0 : 
                        messages.length > 0 ? Math.round((messages.length / 10) * 100) : 0;
    
    // 根据意图调整
    if (lastIntent) {
      if (lastIntent.type === 'bargain' && context.bargainCount <= 2) conversionRate += 20;
      if (lastIntent.sentiment.label === 'angry') conversionRate -= 30;
      if (lastIntent.sentiment.label === 'interested' || lastIntent.sentiment.label === 'excited') conversionRate += 15;
    }
    
    conversionRate = Math.max(0, Math.min(100, conversionRate));
    
    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      avgResponseTime,
      emotionStats,
      keywordCounts,
      conversionRate,
    };
  }, [messages, context, lastIntent]);

  if (messages.length === 0) return null;

  return (
    <div className="bg-bg-secondary rounded-xl border border-border-color p-4 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <BarChart3 size={16} className="text-neon-cyan" />
        会话分析
      </h3>
      
      {/* 关键指标 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-bg-tertiary rounded-lg">
          <div className="text-xs text-text-secondary mb-1">消息数</div>
          <div className="text-lg font-mono font-bold">{stats.totalMessages}</div>
          <div className="text-xs text-text-secondary">
            用户{stats.userMessages} / AI{stats.aiMessages}
          </div>
        </div>
        <div className="p-3 bg-bg-tertiary rounded-lg">
          <div className="text-xs text-text-secondary mb-1">平均响应</div>
          <div className="text-lg font-mono font-bold">{stats.avgResponseTime}s</div>
          <div className="text-xs text-text-secondary">AI回复速度</div>
        </div>
      </div>

      {/* 情绪分布 */}
      <div>
        <div className="text-xs text-text-secondary mb-2">客户情绪分布</div>
        <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden">
          {stats.emotionStats.interested > 0 && (
            <div 
              className="h-full bg-green-500" 
              style={{ width: `${(stats.emotionStats.interested / stats.userMessages) * 100}%` }}
              title={`感兴趣: ${stats.emotionStats.interested}`}
            />
          )}
          {stats.emotionStats.neutral > 0 && (
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${(stats.emotionStats.neutral / stats.userMessages) * 100}%` }}
              title={`平静: ${stats.emotionStats.neutral}`}
            />
          )}
          {stats.emotionStats.frustrated > 0 && (
            <div 
              className="h-full bg-yellow-500" 
              style={{ width: `${(stats.emotionStats.frustrated / stats.userMessages) * 100}%` }}
              title={`犹豫: ${stats.emotionStats.frustrated}`}
            />
          )}
          {stats.emotionStats.angry > 0 && (
            <div 
              className="h-full bg-red-500" 
              style={{ width: `${(stats.emotionStats.angry / stats.userMessages) * 100}%` }}
              title={`生气: ${stats.emotionStats.angry}`}
            />
          )}
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs">
          {stats.emotionStats.interested > 0 && (
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />感兴趣 {stats.emotionStats.interested}</span>
          )}
          {stats.emotionStats.neutral > 0 && (
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />平静 {stats.emotionStats.neutral}</span>
          )}
          {stats.emotionStats.frustrated > 0 && (
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />犹豫 {stats.emotionStats.frustrated}</span>
          )}
          {stats.emotionStats.angry > 0 && (
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />生气 {stats.emotionStats.angry}</span>
          )}
        </div>
      </div>

      {/* 高频词云 */}
      {stats.keywordCounts.length > 0 && (
        <div>
          <div className="text-xs text-text-secondary mb-2">客户关注热点</div>
          <div className="flex flex-wrap gap-2">
            {stats.keywordCounts.map((k, i) => (
              <span 
                key={k.word}
                className={`px-2 py-1 rounded-full text-xs ${
                  i === 0 ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' :
                  i === 1 ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' :
                  'bg-bg-tertiary text-text-secondary border border-border-color'
                }`}
              >
                {k.word} ({k.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 转化概率 */}
      <div className="p-3 bg-bg-tertiary rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary">成交概率预估</span>
          <span className={`text-sm font-bold ${
            stats.conversionRate > 70 ? 'text-green-500' :
            stats.conversionRate > 40 ? 'text-yellow-500' :
            'text-red-500'
          }`}>{stats.conversionRate}%</span>
        </div>
        <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              stats.conversionRate > 70 ? 'bg-green-500' :
              stats.conversionRate > 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${stats.conversionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default function AIChatDemo() {
  const { currentMode } = useUnifiedStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showHandover, setShowHandover] = useState(false);
  const [handoverReason, setHandoverReason] = useState('');
  const [activeScenario, setActiveScenario] = useState<typeof conversationScenarios[PricingMode]['scenarios'][0] | null>(null);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [lastIntent, setLastIntent] = useState<any>(null);
  const [context, setContext] = useState<UIContext>({
    stage: 'greeting',
    userEmotion: 'neutral',
    bargainCount: 0,
    topicsDiscussed: new Set(),
    lastTopic: '',
    pressureApplied: 0,
    rapportBuilt: false,
    sessionId: `session-${Date.now()}`,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mode = modeDetails[currentMode];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 场景自动播放
  useEffect(() => {
    if (!activeScenario || scenarioStep >= activeScenario.flow.length) return;

    const step = activeScenario.flow[scenarioStep];
    const timer = setTimeout(() => {
      handleUserMessage(step.user, step.emotion || 'neutral');
      setScenarioStep(prev => prev + 1);
    }, 1500 + Math.random() * 1000);

    return () => clearTimeout(timer);
  }, [activeScenario, scenarioStep]);

  const handleUserMessage = async (content: string, emotion: 'neutral' | 'interested' | 'frustrated' | 'angry' = 'neutral') => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      emotion,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // AI回复
    setTimeout(async () => {
      // 使用新的AI服务架构
      const aiContext: AIContext = {
        sessionId: context.sessionId,
        messages: newMessages.map(m => ({
          role: (m.role === 'user' ? 'customer' : m.role === 'ai' ? 'ai' : 'human') as 'customer' | 'ai' | 'human',
          content: m.content,
          timestamp: m.timestamp.getTime(),
        })),
        customerProfile: {
          name: '客户',
          platform: 'xiaohongshu' as const,
          visitCount: 1,
          inquiryCount: context.bargainCount,
          priceSensitivity: (context.bargainCount > 2 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
          bookingHistory: 'none' as const,
        },
        sessionMetrics: {
          duration: Date.now() - (messages[0]?.timestamp.getTime() || Date.now()),
          topicSwitches: context.topicsDiscussed.size,
          resistancePoints: [],
        },
      };

      // 调用AI服务（当前是规则引擎，未来可无缝切换大模型）
      const reply = await aiService.chat(content, aiContext);
      
      // 更新意图分析
      if (reply.intent) {
        setLastIntent(reply.intent);
      }

      // 更新UI上下文
      const newContext = { ...context };
      if (reply.intent?.type === 'bargain') {
        newContext.bargainCount++;
        newContext.stage = 'bargain';
      } else if (reply.intent?.type === 'complaint') {
        newContext.stage = 'escalated';
      } else if (reply.intent?.type === 'booking') {
        newContext.stage = 'closing';
      }
      setContext(newContext);

      // 检查是否需要转人工
      if (reply.shouldEscalate) {
        setShowHandover(true);
        setHandoverReason(reply.reason || '需要人工处理');
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: reply.content,
        timestamp: new Date(),
        intent: reply.intent?.type,
        confidence: reply.intent?.confidence,
      };
      setMessages(prev => [...prev, aiResponse]);
      
      // ===== 发送客服回复事件到知识库 =====
      try {
        const { sendServiceReplyEvent } = await import('@/admin/services/aiKnowledgeCollector');
        const { currentHotel } = useUnifiedStore.getState();
        
        sendServiceReplyEvent({
          eventId: aiResponse.id,
          hotelId: currentHotel.id,
          hotelName: currentHotel.name,
          timestamp: new Date().toISOString(),
          input: {
            features: [
              reply.intent?.confidence || 0.5,
              emotion === 'frustrated' || emotion === 'angry' ? 1 : 0,
              context.bargainCount / 5,
            ],
            context: {
              intent: reply.intent?.type || 'general',
              customerMessage: content,
              emotion,
              bargainCount: context.bargainCount,
            },
          },
          aiOutput: {
            model: 'rule-based-v1',
            suggestion: {
              reply: reply.content,
              intent: reply.intent?.type,
            },
            confidence: reply.intent?.confidence || 0.7,
            reasoning: reply.reason || '基于对话上下文生成回复',
          },
        });
        console.log('[AIChatDemo] Service reply event sent to knowledge base');
      } catch (error) {
        console.error('[AIChatDemo] Failed to send event:', error);
      }
    }, 800 + Math.random() * 600);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    handleUserMessage(input);
    setInput('');
  };

  const resetChat = () => {
    setMessages([]);
    setActiveScenario(null);
    setScenarioStep(0);
    setShowHandover(false);
    setHandoverReason('');
    setLastIntent(null);
    const newSessionId = `session-${Date.now()}`;
    setContext({
      stage: 'greeting',
      userEmotion: 'neutral',
      bargainCount: 0,
      topicsDiscussed: new Set(),
      lastTopic: '',
      pressureApplied: 0,
      rapportBuilt: false,
      sessionId: newSessionId,
    });
    // 清理AI Agent缓存
    // 清理AI服务缓存
    AIServiceFactory.dispose();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-din">AI能力演示</h1>
        <button
          onClick={resetChat}
          className="px-4 py-2 bg-bg-tertiary border border-border-color rounded-lg text-sm hover:border-neon-cyan transition-all"
        >
          重置对话
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：策略面板 + 场景选择 */}
        <div className="col-span-4 space-y-6">
          <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
            <h2 className="text-lg font-semibold mb-4">当前策略模式</h2>
            <div
              className="p-4 rounded-lg mb-4"
              style={{ background: `${mode.color}20`, border: `1px solid ${mode.color}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <mode.icon size={20} style={{ color: mode.color }} />
                <span className="font-medium" style={{ color: mode.color }}>{mode.label}</span>
              </div>
              <div className="text-sm text-text-secondary">{mode.description}</div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border-color">
                <span className="text-text-secondary">AI人格</span>
                <span>{conversationScenarios[currentMode].personality}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-color">
                <span className="text-text-secondary">策略重点</span>
                <span>{conversationScenarios[currentMode].style}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border-color">
                <span className="text-text-secondary">议价容忍</span>
                <span>最多4轮（智能递减）</span>
              </div>
            </div>
          </div>

          {/* 场景选择 */}
          {!activeScenario && (
            <div className="bg-bg-secondary rounded-xl border border-border-color p-6">
              <h2 className="text-lg font-semibold mb-4">选择场景</h2>
              <ScenarioSelector mode={currentMode} onSelect={setActiveScenario} />
            </div>
          )}

          {/* AI意图分析面板 */}
          {lastIntent && (
            <IntentAnalysisPanel lastIntent={lastIntent} context={context} />
          )}

          {/* 转人工提示 */}
          <AnimatePresence>
            {showHandover && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <UserCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="font-medium text-red-500 mb-1">建议转人工</div>
                    <p className="text-sm text-text-secondary">
                      {handoverReason}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 会话统计分析 */}
          <ConversationStats messages={messages} context={context} lastIntent={lastIntent} />
        </div>

        {/* 右侧：对话区域 */}
        <div className="col-span-8 bg-bg-secondary rounded-xl border border-border-color flex flex-col h-[600px]">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <div className="text-4xl mb-4">👆</div>
                <div>从左侧选择一个场景开始演示</div>
                <div className="text-sm mt-2">或直接在下方输入框发送消息</div>
              </div>
            )}
            
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-neon-purple' : 'bg-bg-tertiary border border-border-color'
                }`}>
                  {msg.role === 'user' ? (
                    <span className="text-lg">
                      {msg.emotion === 'angry' ? '😠' : msg.emotion === 'frustrated' ? '😤' : msg.emotion === 'interested' ? '😊' : '😐'}
                    </span>
                  ) : (
                    <Bot size={20} className="text-neon-cyan" />
                  )}
                </div>
                <div className={`max-w-[70%] p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-neon-purple text-text-primary rounded-tr-sm'
                    : 'bg-bg-tertiary border border-border-color rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-text-primary/60' : 'text-text-secondary'}`}>
                    {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    {msg.intent && (
                      <span className="ml-2 text-neon-cyan">[{msg.intent}]</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区 */}
          <div className="p-4 border-t border-border-color">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="模拟客户输入消息..."
                className="flex-1 px-4 py-3 bg-bg-tertiary border border-border-color rounded-lg focus:border-neon-cyan focus:outline-none transition-all"
              />
              <button
                onClick={handleSend}
                className="px-6 py-3 bg-neon-cyan text-bg-primary rounded-lg font-medium hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Send size={18} />
                发送
              </button>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Brain size={12} />
                AI Agent已启用
              </span>
              <span>议价次数: {context.bargainCount}/4</span>
              <span>情绪状态: {context.userEmotion === 'neutral' ? '平静' : context.userEmotion === 'interested' ? '感兴趣' : context.userEmotion === 'frustrated' ? '犹豫' : '生气'}</span>
              {lastIntent && (
                <span className="text-neon-cyan">
                  意图: {lastIntent.type}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
