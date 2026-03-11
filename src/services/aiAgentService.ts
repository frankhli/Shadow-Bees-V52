/**
 * AI Agent Service - 智能客服代理
 * 减少人工介入，提升AI拟人化程度
 */

import type { Platform } from '@/types';

// 对话上下文
interface ConversationContext {
  messages: Array<{
    role: 'customer' | 'ai' | 'human';
    content: string;
    timestamp: number;
    sentiment?: number; // -1到1，情绪分数
  }>;
  customerProfile: {
    name: string;
    platform: Platform;
    visitCount: number;
    inquiryCount: number; // 咨询次数（议价次数）
    priceSensitivity: 'high' | 'medium' | 'low';
    bookingHistory: 'none' | 'once' | 'repeat';
  };
  sessionMetrics: {
    duration: number;
    topicSwitches: number; // 话题跳转次数
    resistancePoints: string[]; // 客户抗拒点
  };
}

// 意图识别结果
interface IntentResult {
  type: 'price_inquiry' | 'bargain' | 'complaint' | 'booking' | 'refund' | 'small_talk' | 'escalation_request';
  confidence: number;
  entities: Record<string, string>;
  sentiment: {
    score: number; // -1 到 1
    label: 'angry' | 'frustrated' | 'neutral' | 'positive' | 'excited';
  };
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

class AIAgentService {
  private static instance: AIAgentService;
  private conversationMemory: Map<string, ConversationContext> = new Map();

  private constructor() {}

  static getInstance(): AIAgentService {
    if (!AIAgentService.instance) {
      AIAgentService.instance = new AIAgentService();
    }
    return AIAgentService.instance;
  }

  /**
   * 智能意图识别（替代简单关键词匹配）
   */
  async analyzeIntent(message: string, context: ConversationContext): Promise<IntentResult> {
    const lowerMsg = message.toLowerCase();
    
    // 多维度意图分析
    const intentScores: Record<string, number> = {
      bargain: 0,
      complaint: 0,
      booking: 0,
      refund: 0,
      escalation_request: 0,
    };

    // 议价检测（更智能）
    const bargainSignals = [
      { pattern: /便宜|优惠|折扣|少点|让价|便宜点|能少吗/, weight: 0.8 },
      { pattern: /别家|其他|携程|美团|去哪|飞猪/, weight: 0.7 },
      { pattern: /诚心|真心|诚心要|真心订/, weight: 0.6 },
      { pattern: /太贵|价格贵|不值|预算/, weight: 0.5 },
      { pattern: /都是老客户|经常住|推荐朋友/, weight: 0.9 }, // 高权重
    ];
    
    bargainSignals.forEach(({ pattern, weight }) => {
      if (pattern.test(lowerMsg)) intentScores.bargain += weight;
    });

    // 投诉检测
    const complaintSignals = [
      { pattern: /投诉|举报|315|工商局|媒体|曝光/, weight: 1.0 },
      { pattern: /欺诈|骗子|虚假宣传|货不对板/, weight: 0.9 },
      { pattern: /太差|恶心|垃圾|后悔/, weight: 0.7 },
      { pattern: /退款|赔钱|赔偿|道歉/, weight: 0.6 },
    ];
    
    complaintSignals.forEach(({ pattern, weight }) => {
      if (pattern.test(lowerMsg)) intentScores.complaint += weight;
    });

    // 情绪分析
    const sentiment = this.analyzeSentiment(message, context);
    
    // 升级请求检测
    const escalationSignals = [
      /找经理|找主管|找领导|要投诉|转人工/,
      /你不配|你没有权限|你解决不了/,
    ];
    
    escalationSignals.forEach(pattern => {
      if (pattern.test(lowerMsg)) intentScores.escalation_request += 0.9;
    });

    // 确定主导意图
    const sortedIntents = Object.entries(intentScores)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score > 0.3);

    const primaryIntent = sortedIntents[0] || ['inquiry', 0.5];
    
    return {
      type: primaryIntent[0] as IntentResult['type'],
      confidence: primaryIntent[1],
      entities: this.extractEntities(message),
      sentiment,
      urgency: this.calculateUrgency(sentiment, context),
    };
  }

  /**
   * 情绪分析
   */
  private analyzeSentiment(message: string, context: ConversationContext): IntentResult['sentiment'] {
    const angryWords = ['骗子', '垃圾', '恶心', '投诉', '欺诈', '曝光', '曝光', 'tm', '他妈'];
    const positiveWords = ['谢谢', '感谢', '不错', '很好', '满意', '推荐'];
    const frustratedWords = ['等好久', '太慢', '总是', '又', '还是'];
    
    let score = 0;
    
    angryWords.forEach(word => {
      if (message.includes(word)) score -= 0.3;
    });
    
    positiveWords.forEach(word => {
      if (message.includes(word)) score += 0.2;
    });
    
    frustratedWords.forEach(word => {
      if (message.includes(word)) score -= 0.15;
    });

    // 上下文情绪累积
    const recentMessages = context.messages.slice(-3);
    const contextSentiment = recentMessages.reduce((sum, m) => {
      return sum + (m.sentiment || 0);
    }, 0) / (recentMessages.length || 1);
    
    score = score * 0.7 + contextSentiment * 0.3;
    score = Math.max(-1, Math.min(1, score));

    let label: IntentResult['sentiment']['label'] = 'neutral';
    if (score < -0.6) label = 'angry';
    else if (score < -0.3) label = 'frustrated';
    else if (score > 0.5) label = 'excited';
    else if (score > 0.1) label = 'positive';

    return { score, label };
  }

  /**
   * 提取实体
   */
  private extractEntities(message: string): Record<string, string> {
    const entities: Record<string, string> = {};
    
    // 日期提取
    const dateMatch = message.match(/(\d{1,2})月(\d{1,2})日?|明天|后天|周末|下周/);
    if (dateMatch) entities.date = dateMatch[0];
    
    // 人数提取
    const peopleMatch = message.match(/(\d+)个人|(\d+)人|(\d+)位/);
    if (peopleMatch) entities.people = peopleMatch[1] || peopleMatch[2] || peopleMatch[3];
    
    // 价格提取
    const priceMatch = message.match(/(\d+)块|(\d+)元|价格|多少钱/);
    if (priceMatch) entities.price = priceMatch[1] || priceMatch[2];
    
    // 房型提取
    const roomMatch = message.match(/大床|双床|套房|亲子|标间/);
    if (roomMatch) entities.roomType = roomMatch[0];
    
    return entities;
  }

  /**
   * 计算紧急程度
   */
  private calculateUrgency(sentiment: IntentResult['sentiment'], context: ConversationContext): IntentResult['urgency'] {
    // 负面情绪+连续追问 = 高紧急
    if (sentiment.label === 'angry') return 'critical';
    if (sentiment.label === 'frustrated' && context.sessionMetrics.duration > 300) return 'high';
    
    // 深夜咨询（模拟）
    const hour = new Date().getHours();
    if (hour >= 23 || hour <= 6) return 'high';
    
    // 老客+紧急词
    if (context.customerProfile.bookingHistory === 'repeat' && sentiment.score < -0.3) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * 生成AI回复（策略化）
   */
  async generateReply(
    intent: IntentResult,
    context: ConversationContext
  ): Promise<{ content: string; shouldEscalate: boolean; reason?: string }> {
    
    // 判断是否需要转人工（策略升级点）
    const escalationCheck = this.shouldEscalateToHuman(intent, context);
    if (escalationCheck.shouldEscalate) {
      return {
        content: this.generateEscalationMessage(intent, context),
        shouldEscalate: true,
        reason: escalationCheck.reason,
      };
    }

    // 根据意图生成回复
    let content = '';
    
    switch (intent.type) {
      case 'bargain':
        content = await this.handleBargain(intent, context);
        break;
      case 'complaint':
        content = await this.handleComplaint(intent, context);
        break;
      case 'booking':
        content = await this.handleBooking(intent, context);
        break;
      case 'small_talk':
        content = await this.handleSmallTalk(intent, context);
        break;
      default:
        content = await this.handleGeneralInquiry(intent, context);
    }

    return { content, shouldEscalate: false };
  }

  /**
   * 判断是否需要转人工
   */
  private shouldEscalateToHuman(
    intent: IntentResult,
    context: ConversationContext
  ): { shouldEscalate: boolean; reason?: string } {
    
    // 1. 明确升级请求
    if (intent.type === 'escalation_request' && intent.confidence > 0.7) {
      return { shouldEscalate: true, reason: '客户明确要求人工' };
    }

    // 2. 情绪失控（升级阈值）
    if (intent.sentiment.label === 'angry' && intent.confidence > 0.8) {
      return { shouldEscalate: true, reason: '客户情绪激烈' };
    }

    // 3. 连续议价超过4轮（AI策略用尽）
    if (intent.type === 'bargain' && context.customerProfile.inquiryCount > 4) {
      return { shouldEscalate: true, reason: '议价轮次过多，需要人工灵活处理' };
    }

    // 4. 涉及退款金额大（假设>1000）
    if (intent.type === 'refund' && parseInt(intent.entities.price || '0') > 1000) {
      return { shouldEscalate: true, reason: '高额退款需人工审核' };
    }

    // 5. 复杂多房间预订
    if (intent.entities.people && parseInt(intent.entities.people) > 5) {
      return { shouldEscalate: true, reason: '团体预订需人工协调' };
    }

    // 6. 话题频繁跳转（客户思路混乱）
    if (context.sessionMetrics.topicSwitches > 3) {
      return { shouldEscalate: true, reason: '客户需求复杂，需人工梳理' };
    }

    return { shouldEscalate: false };
  }

  /**
   * 议价处理 - 更智能的价格谈判
   */
  private async handleBargain(_intent: IntentResult, context: ConversationContext): Promise<string> {
    const count = context.customerProfile.inquiryCount;
    
    // 第一轮：委婉拒绝+价值强调
    if (count === 1) {
      const responses = [
        `亲，这个价格已经是活动价了~ 咱们房间配有智能马桶和乳胶床垫，性价比真的很高呢 😊`,
        `您好呀，现在的价格比平时优惠了80块呢！而且周末可能就没房了，建议先锁定一下？`,
        `理解您想省点~ 但我们这价格对比周边同档次已经是最低了，某程上还要贵50块呢`,
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // 第二轮：情感共鸣+创造稀缺
    if (count === 2) {
      const responses = [
        `看到您诚心要，我也替您着急 😅 这样，我帮您看看有没有隐藏优惠券...（停顿）抱歉系统确实没有空间了。要不您今天先订，如果明天降价我帮您申请差价返还？`,
        `您这样我好为难呀~ 价格是真到底了。不过可以送您延迟退房到2点，这个福利价值也值30块了，您看行吗？`,
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // 第三轮：让步+关闭交易
    if (count === 3) {
      const responses = [
        `您都这么有诚意了... 我私下送您一份双人早餐吧（价值58元），这是我能做的最大努力了。您现在订吗？`,
        `好吧好吧，您稍等，我帮您申请一下会员价...（停顿10秒）申请下来了！可以再减20块，但仅限今天哦！`,
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // 第四轮：最后通牒
    return `亲，我真的尽力了 😭 这已经是底价+赠品了。要不您再考虑下？或者我帮您转给值班经理看看？`;
  }

  /**
   * 投诉处理 - 情绪优先
   */
  private async handleComplaint(intent: IntentResult, _context: ConversationContext): Promise<string> {
    const sentiment = intent.sentiment;
    
    if (sentiment.label === 'angry') {
      // 严重情绪：先道歉安抚
      return `非常抱歉让您有这样的体验！我完全理解您的心情 😔 这个问题我高度重视，已经记录了详细信息。为了更快帮您解决，我立即为您转接专属客服经理，您看可以吗？`;
    }

    if (sentiment.label === 'frustrated') {
      // 轻度不满：解释+补偿
      return `感谢您的反馈！确实是我们做得不够好 🙏 为了弥补，我为您申请了一份补偿方案：1.全额退款 2.赠送下次入住8折券。您倾向哪个方案呢？`;
    }

    // 一般询问
    return `感谢您的反馈，我们会认真改进的！还有其他可以帮您的吗？`;
  }

  /**
   * 闲聊/破冰
   */
  private async handleSmallTalk(_intent: IntentResult, _context: ConversationContext): Promise<string> {
    const responses = [
      `哈哈您真有眼光！我们店虽然不大，但细节做的很用心~ 比如每个房间都配了蓝牙音箱 🎵`,
      `是的呢，住过的客人都说比想象中好！您要是订了不会后悔的 😊`,
      `理解您的顾虑，第一次订民宿确实要谨慎。我们有免费取消政策，订了不满意可以随时退~`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * 预订引导
   */
  private async handleBooking(intent: IntentResult, _context: ConversationContext): Promise<string> {
    const entities = intent.entities;
    
    if (entities.date && entities.people) {
      return `好的！${entities.date} ${entities.people}位入住，我帮您查一下房态...（停顿2秒）还有${entities.roomType || '大床'}房，今天订可以享受早鸟价，要帮您锁定吗？`;
    }

    return `请问您计划什么时候入住呢？住几晚？我帮您推荐最合适的房型 😊`;
  }

  /**
   * 通用咨询
   */
  private async handleGeneralInquiry(_intent: IntentResult, _context: ConversationContext): Promise<string> {
    return `好的明白了！还有其他问题需要了解吗？我随时都在~`;
  }

  /**
   * 转人工话术
   */
  private generateEscalationMessage(intent: IntentResult, context: ConversationContext): string {
    const handoverReasons: Record<string, string> = {
      '客户明确要求人工': '我帮您转接人工客服，请稍等~',
      '客户情绪激烈': '这个问题需要更专业的人员处理，我立即为您转接',
      '议价轮次过多': '我请值班经理来跟您谈，他有更大的权限',
      '高额退款需人工审核': '退款金额较大，需要经理审批，我帮您转接',
      '团体预订需人工协调': '多间房预订我帮您转给预订部，他们能统一安排',
      '客户需求复杂': '您的情况比较特殊，我请专人来跟您对接',
    };

    const reason = (this.shouldEscalateToHuman(intent, context).reason || '') as string;
    return handoverReasons[reason] || '我帮您转接人工客服处理，请稍等~';
  }

  /**
   * 更新对话上下文
   */
  updateContext(sessionId: string, message: { role: 'customer' | 'ai'; content: string }): ConversationContext {
    let context = this.conversationMemory.get(sessionId);
    
    if (!context) {
      context = {
        messages: [],
        customerProfile: {
          name: '客户',
          platform: 'xiaohongshu',
          visitCount: 1,
          inquiryCount: 0,
          priceSensitivity: 'medium',
          bookingHistory: 'none',
        },
        sessionMetrics: {
          duration: 0,
          topicSwitches: 0,
          resistancePoints: [],
        },
      };
    }

    // 统计议价次数
    if (message.role === 'customer' && /便宜|优惠|折扣|少|让价/.test(message.content)) {
      context.customerProfile.inquiryCount++;
    }

    // 记录消息
    context.messages.push({
      role: message.role,
      content: message.content,
      timestamp: Date.now(),
    });

    this.conversationMemory.set(sessionId, context);
    return context;
  }

  /**
   * 清理会话缓存
   */
  clearCache(): void {
    this.conversationMemory.clear();
  }

  /**
   * 获取客户画像建议
   */
  getCustomerInsight(context: ConversationContext): string {
    const profile = context.customerProfile;
    
    if (profile.inquiryCount >= 3) {
      return '价格敏感型客户，建议给出最终优惠或转人工';
    }
    
    if (profile.bookingHistory === 'repeat') {
      return '老客户，可适当让步维护关系';
    }
    
    if (context.sessionMetrics.topicSwitches > 2) {
      return '决策犹豫型，需要推动下单';
    }
    
    return '常规咨询客户';
  }
}

export const aiAgentService = AIAgentService.getInstance();

// 使用示例：
// const intent = await aiAgentService.analyzeIntent(message, context);
// const reply = await aiAgentService.generateReply(intent, context);
