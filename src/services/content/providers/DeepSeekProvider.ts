/**
 * DeepSeek Provider
 * 基于 DeepSeek 大模型的内容生成
 * 
 * 使用方式：
 * 1. 获取 API Key: https://platform.deepseek.com/
 * 2. 设置环境变量: VITE_DEEPSEEK_API_KEY=your_key
 * 3. 启用: ContentGenerationService.setProvider('deepseek')
 */

import { BaseProvider } from './BaseProvider';
import type {
  ContentGenerationRequest,
  GeneratedContent,
  LLMProviderConfig,
} from '../types';

interface DeepSeekConfig extends LLMProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
}

export class DeepSeekProvider extends BaseProvider {
  readonly name = 'deepseek';
  readonly version = '1.0.0';
  private apiKey: string;
  private model: string;

  constructor(config: DeepSeekConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      return false;
    }
    
    try {
      // 简单的健康检查调用
      const response = await this.fetchWithTimeout(
        'https://api.deepseek.com/models',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async generate(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const startTime = Date.now();
    
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      throw new Error('DeepSeek API Key not configured. Please set VITE_DEEPSEEK_API_KEY');
    }

    const prompt = this.buildPrompt(request);
    
    try {
      const response = await this.fetchWithTimeout(
        'https://api.deepseek.com/chat/completions',
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
                content: '你是一位资深的酒店营销文案专家，擅长创作吸引人的社交媒体内容。',
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
        throw new Error(`DeepSeek API error: ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from DeepSeek');
      }

      const parsed = this.safeParseJSON(content);
      if (!parsed) {
        throw new Error('Failed to parse DeepSeek response');
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
      console.error('DeepSeek generation failed:', error);
      throw error;
    }
  }

  /**
   * 流式生成（实验性）
   */
  async *generateStream(request: ContentGenerationRequest): AsyncGenerator<string> {
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      throw new Error('DeepSeek API Key not configured');
    }

    const prompt = this.buildPrompt(request);
    
    const response = await this.fetchWithTimeout(
      'https://api.deepseek.com/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: '你是一位资深的酒店营销文案专家。' },
            { role: 'user', content: prompt },
          ],
          temperature: this.config.temperature ?? 0.8,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`DeepSeek stream error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
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
export const DeepSeekConfigHelp = {
  website: 'https://platform.deepseek.com/',
  pricing: 'https://platform.deepseek.com/pricing',
  models: ['deepseek-chat', 'deepseek-coder'],
  defaultModel: 'deepseek-chat',
  estimatedCost: {
    perGeneration: '约 0.002 元',
    monthlyEstimate: '500元/月（10万次生成）',
  },
};
