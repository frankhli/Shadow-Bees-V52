# AI客服大模型接入方案

## 一、架构演进路线

### Phase 1: 当前（规则引擎）✅
- 基于正则的意图识别
- 固定话术模板
- 适合：80%标准化场景

### Phase 2: 混合架构（推荐）🎯
```
用户消息
   ↓
【意图分类器】(轻量级BERT)
   ├─ 简单查询 → 规则引擎（快速响应）
   ├─ 复杂对话 → 大模型（深度理解）
   └─ 敏感问题 → 人工兜底
```

### Phase 3: 纯大模型（未来）🚀
- 端到端大模型
- RAG知识库增强
- 持续微调优化

---

## 二、技术方案选型

### 方案A：云端API（快速上线）

| 供应商 | 模型 | 成本 | 延迟 | 推荐度 |
|--------|------|------|------|--------|
| **OpenAI** | GPT-4o | 高 | 中 | ⭐⭐⭐ |
| **Anthropic** | Claude 3.5 | 高 | 中 | ⭐⭐⭐⭐ |
| **百度** | 文心一言 | 中 | 低 | ⭐⭐⭐ |
| **阿里** | 通义千问 | 中 | 低 | ⭐⭐⭐⭐ |
| **智谱** | GLM-4 | 低 | 低 | ⭐⭐⭐⭐⭐ |
| **DeepSeek** | DeepSeek-V3 | 低 | 低 | ⭐⭐⭐⭐⭐ |

**推荐**：DeepSeek-V3 或 GLM-4
- 成本低（1元/百万token）
- 中文场景优秀
- 支持长上下文

### 方案B：本地部署（数据安全）

```
模型选择：
- Qwen2.5-14B（阿里开源）
- ChatGLM3-6B（智谱开源）
- Llama3.1-8B-Chinese（社区微调）

硬件需求：
- 14B模型 → RTX 4090 24G显存
- 6B模型 → RTX 3090 12G显存
- 量化版 → 消费级显卡即可
```

### 方案C：混合部署（推荐）

```typescript
// 服务层设计
class LLMService {
  // 简单问题 → 本地小模型（0成本、0延迟）
  async localInference(message: string): Promise<string> {
    return localModel.generate(message);
  }
  
  // 复杂问题 → 云端大模型
  async cloudInference(message: string, context: Context): Promise<string> {
    const prompt = this.buildPrompt(message, context);
    return deepseekClient.chat(prompt);
  }
  
  // 路由决策
  async route(message: string): Promise<string> {
    const complexity = await this.assessComplexity(message);
    if (complexity < 0.5) {
      return this.localInference(message);
    }
    return this.cloudInference(message, context);
  }
}
```

---

## 三、Prompt工程模板

### 系统Prompt（核心）

```typescript
const SYSTEM_PROMPT = `你是一位专业的酒店预订顾问，名叫"小蜜"。

【身份设定】
- 你是北京三里屯精品酒店的智能客服
- 语气亲切专业，像朋友一样聊天
- 适度使用emoji，不要太正式

【平台风格适配】
- 小红书用户：用"宝子"、"种草"、"安利"等词
- 闲鱼用户：用"亲"、"包邮"、"刀"等词
- 微信用户：正式一些，多用表情

【核心能力】
1. 房价咨询：根据日期、房型给出实时价格
2. 房型推荐：根据人数、需求推荐合适房型
3. 议价处理：最多让步2次，第3次要坚定
4. 投诉处理：先道歉，再给补偿方案

【回复规则】
- 首次回复控制在50字以内
- 议价时先强调价值，再说价格
- 客户犹豫时制造稀缺感
- 绝对不说"不知道"，要引导到能回答的问题

【禁止事项】
- 不承诺无法兑现的优惠
- 不说"最低价"等绝对化用语
- 不透露其他客户信息

【转人工条件】
- 客户明确要求人工
- 情绪非常激动
- 涉及退款>1000元
- 团体预订>5间

当前酒店信息：
- 地址：北京朝阳区三里屯XX号
- 价格：大床房380起，双床房420起
- 特色：智能马桶、乳胶床垫、蓝牙音箱
- 周边：步行5分钟到三里屯太古里
`;
```

### 对话Prompt示例

```typescript
interface ChatPrompt {
  system: string;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  current: string;
  tools?: Array<{
    name: string;
    description: string;
  }>;
}

// 构建Prompt
function buildPrompt(context: ConversationContext, userMessage: string): ChatPrompt {
  return {
    system: SYSTEM_PROMPT,
    history: context.messages.slice(-5).map(m => ({  // 保留最近5轮
      role: m.role === 'customer' ? 'user' : 'assistant',
      content: m.content,
    })),
    current: userMessage,
    tools: [
      {
        name: 'query_price',
        description: '查询指定日期的房价',
      },
      {
        name: 'check_availability',
        description: '查询房态',
      },
      {
        name: 'transfer_to_human',
        description: '转人工客服',
      },
    ],
  };
}
```

---

## 四、Function Calling（工具调用）

大模型不只是聊天，还要能操作业务：

```typescript
// 工具定义
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_price',
      description: '查询指定日期的房价',
      parameters: {
        type: 'object',
        properties: {
          checkIn: { type: 'string', format: 'date' },
          checkOut: { type: 'string', format: 'date' },
          roomType: { 
            type: 'string', 
            enum: ['大床房', '双床房', '套房'],
          },
        },
        required: ['checkIn', 'checkOut'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: '创建预订订单',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          roomType: { type: 'string' },
          dates: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'phone', 'roomType', 'dates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_to_human',
      description: '转人工客服',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['reason'],
      },
    },
  },
];

// 执行工具
async function executeTool(functionName: string, args: any) {
  switch (functionName) {
    case 'query_price':
      return await pricingService.query(args.checkIn, args.checkOut, args.roomType);
    case 'create_order':
      return await orderService.create(args);
    case 'transfer_to_human':
      return await handoverService.transfer(args.reason, args.urgency);
  }
}
```

---

## 五、数据回流与优化

### 数据闭环

```
用户对话 → 大模型处理 → 用户反馈
                ↓
            优质对话
                ↓
            人工标注
                ↓
            模型微调
                ↓
            效果提升
```

### 关键指标监控

```typescript
interface LLMMetrics {
  // 业务指标
  conversionRate: number;      // 转化率
  handoverRate: number;        // 转人工率
  avgResponseTime: number;     // 平均响应时间
  
  // 模型指标
  tokenUsage: number;          // Token消耗
  apiCost: number;             // API成本
  errorRate: number;           // 错误率
  
  // 质量指标
  userSatisfaction: number;    // 用户满意度（1-5星）
  humanOverrideRate: number;   // 人工接管率
  conversationQuality: number; // 对话质量分
}
```

---

## 六、实施路线图

### 第一阶段（2周）：MVP验证
- [ ] 接入DeepSeek API
- [ ] 实现基础对话
- [ ] A/B测试（规则AI vs 大模型）

### 第二阶段（1个月）：功能完善
- [ ] Function Calling实现
- [ ] RAG知识库接入
- [ ] 多轮对话优化

### 第三阶段（2个月）：生产就绪
- [ ] 缓存优化降低成本
- [ ] 模型微调（领域数据）
- [ ] 监控告警体系

---

## 七、成本对比

| 方案 | 月对话量 | 成本/月 | 备注 |
|------|----------|---------|------|
| 规则引擎 | 不限 | 0元 | 开发维护成本高 |
| DeepSeek-V3 | 10万次 | 500元 | 性价比高 |
| GPT-4o | 10万次 | 3000元 | 效果最好 |
| 本地14B模型 | 不限 | 2000元(电+硬件) | 一次性投入 |

**推荐**：先用DeepSeek验证效果，满意后再考虑本地部署。

---

## 八、风险与应对

| 风险 | 应对策略 |
|------|----------|
| **数据泄露** | 本地部署或私有化API |
| **模型幻觉** | RAG知识库 + 人工兜底 |
| **成本爆炸** | 缓存 + 分级路由 |
| **响应延迟** | 流式输出 + 预加载 |

---

## 九、代码示例：接入DeepSeek

```typescript
// services/llmService.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

export async function chatWithLLM(
  messages: Array<{ role: string; content: string }>,
  tools?: any[]
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',  // DeepSeek-V3
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    tools,
    temperature: 0.7,
    max_tokens: 500,
    stream: true,  // 流式输出，减少等待感
  });
  
  // 处理流式响应
  let fullResponse = '';
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    
    // 实时推送到前端
    emitToClient('stream', content);
  }
  
  return fullResponse;
}
```

---

## 十、结论

**建议立即接入大模型**，理由：

1. **成本低**：DeepSeek 1元/百万token，10万对话仅500元/月
2. **效果好**：转化率预计提升30%+，转人工率降低50%
3. **竞争需要**：同行都在用，不用就是劣势
4. **技术成熟**：方案已验证，风险可控

**下一步行动**：
1. 注册DeepSeek API账号
2. 写个Demo验证效果
3. A/B测试对比数据
4. 全量上线

> 时间就是金钱，越早接入越早享受红利。
