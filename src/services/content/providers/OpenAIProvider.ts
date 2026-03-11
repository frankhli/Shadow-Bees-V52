/**
 * OpenAI Provider
 * 基于 OpenAI GPT 的内容生成
 * 
 * 使用方式：
 * 1. 获取 API Key: https://platform.openai.com/
 * 2. 设置环境变量: VITE_OPENAI_API_KEY=your_key
 * 3. 启用: ContentGenerationService.setProvider('openai')
 */

import { BaseProvider } from './BaseProvider';
import type {
  ContentGenerationRequest,
  GeneratedContent,
  LLMProviderConfig,
} from '../types';

interface OpenAIConfig extends LLMProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string; // 支持自定义代理
}

export class OpenAIProvider extends BaseProvider {
  readonly name = 'openai';
  readonly version = '1.0.0';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o-mini';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      return false;
    }
    // OpenAI 不需要显式健康检查，直接调用即可
    return true;
  }

  async generate(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const startTime = Date.now();
    
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      throw new Error('OpenAI API Key not configured. Please set VITE_OPENAI_API_KEY');
    }

    const prompt = this.buildPrompt(request);
    
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert hotel marketing copywriter. Generate engaging social media content in Chinese.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: this.config.temperature ?? 0.8,
            max_tokens: this.config.maxTokens ?? 2000,
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = this.safeParseJSON(content);
      if (!parsed) {
        throw new Error('Failed to parse OpenAI response');
      }

      return {
        title: String(parsed.title || ''),
        content: String(parsed.content || ''),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
        callToAction: String(parsed.callToAction || ''),
        imageSuggestions: Array.isArray(parsed.imageSuggestions) 
          ? parsed.imageSuggestions.map(String) 
          : [],
        bestPublishTime: String(parsed.bestPublishTime || '19:00-21:00'),
        estimatedEngagement: this.parseEngagement(parsed.estimatedEngagement),
        metadata: {
          provider: this.name,
          model: this.model,
          tokensUsed: data.usage?.total_tokens,
          generationTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('OpenAI generation failed:', error);
      throw error;
    }
  }

  private parseEngagement(value: unknown): 'high' | 'medium' | 'low' {
    if (value === 'high' || value === 'medium' || value === 'low') {
      return value;
    }
    return 'medium';
  }
}

// 导出配置帮助
export const OpenAIConfigHelp = {
  website: 'https://platform.openai.com/',
  pricing: 'https://openai.com/pricing',
  models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  recommendedModel: 'gpt-4o-mini', // 性价比最佳
  estimatedCost: {
    perGeneration: '约 0.01 元',
    monthlyEstimate: '2000元/月（10万次生成）',
  },
};
