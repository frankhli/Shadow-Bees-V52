/**
 * Provider 基类
 * 所有内容生成 Provider 的抽象基类
 */

import type {
  ContentProvider,
  ContentGenerationRequest,
  GeneratedContent,
  LLMProviderConfig,
  Platform,
} from '../types';

export abstract class BaseProvider implements ContentProvider {
  abstract readonly name: string;
  abstract readonly version: string;
  
  protected config: LLMProviderConfig;
  protected abortController?: AbortController;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  /**
   * 健康检查 - 子类可覆盖
   */
  async healthCheck(): Promise<boolean> {
    return this.config.enabled;
  }

  /**
   * 生成内容 - 子类必须实现
   */
  abstract generate(request: ContentGenerationRequest): Promise<GeneratedContent>;

  /**
   * 批量生成 - 默认实现为多次调用 generate
   */
  async generateBatch(
    request: ContentGenerationRequest,
    variants: number
  ): Promise<GeneratedContent[]> {
    const results: GeneratedContent[] = [];
    
    for (let i = 0; i < variants; i++) {
      // 每次微调参数生成不同版本
      const variantRequest = {
        ...request,
        tone: this.getVariantTone(i),
      };
      
      const content = await this.generate(variantRequest);
      results.push({
        ...content,
        metadata: {
          ...content.metadata,
          provider: this.name,
        },
      });
    }
    
    return results;
  }

  /**
   * 优化现有内容 - 默认不实现
   */
  async optimize?(content: string, _platform: Platform): Promise<string> {
    return content;
  }

  /**
   * 取消正在进行的请求
   */
  cancel(): void {
    this.abortController?.abort();
  }

  /**
   * 构建基础 Prompt
   */
  protected buildPrompt(request: ContentGenerationRequest): string {
    const { platform, contentType, hotelInfo, pricing, hotEvent, targetAudience, tone } = request;
    
    return `你是一位资深的酒店营销文案专家。

【任务】
为${hotelInfo.name}生成一篇适合${platform}平台的${contentType}类型营销文案。

【酒店信息】
- 名称：${hotelInfo.name}
- 位置：${hotelInfo.location}
- 特色：${hotelInfo.uniqueSellingPoints.join('、')}
- 房型：${hotelInfo.roomTypes.map(r => r.name).join('、')}
- 周边：${hotelInfo.nearbyAttractions.join('、')}

【价格信息】
- 门市价：¥${pricing.basePrice}
- 平台价：¥${pricing.platformPrice}
- 比竞品低：¥${pricing.competitorAvg - pricing.platformPrice}

${hotEvent ? `【热点事件】
- 活动：${hotEvent.name}
- 地点：${hotEvent.venue}
- 时间：${hotEvent.dates.join(', ')}
- 热度：${hotEvent.popularity}` : ''}

【目标受众】
${targetAudience || '年轻旅客'}

【风格要求】
${tone || '亲切自然'}

【输出格式】
请按以下JSON格式输出：
{
  "title": "标题（20字以内，带emoji）",
  "content": "正文内容（含换行，小红书风格）",
  "hashtags": ["标签1", "标签2", "标签3"],
  "callToAction": "行动号召语",
  "imageSuggestions": ["建议配图1", "建议配图2"],
  "bestPublishTime": "最佳发布时间",
  "estimatedEngagement": "high/medium/low"
}`;
  }

  /**
   * 获取变体语气
   */
  private getVariantTone(index: number): import('../types').ToneType {
    const tones: import('../types').ToneType[] = ['emotional', 'humorous', 'professional', 'casual', 'urgent'];
    return tones[index % tones.length];
  }

  /**
   * 带超时的 fetch
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout = this.config.timeout || 30000
  ): Promise<Response> {
    this.abortController = new AbortController();
    
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: this.abortController.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 安全解析 JSON
   */
  protected safeParseJSON(text: string): Record<string, unknown> | null {
    try {
      // 尝试提取 JSON 块
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}
