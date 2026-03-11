# 内容生成服务

支持多 Provider 的内容生成服务，可无缝切换不同大模型。

## 快速开始

```typescript
import { contentGenerationService } from '@/services/content';

// 生成内容
const content = await contentGenerationService.generate({
  platform: 'xiaohongshu',
  contentType: 'promotion',
  hotelInfo: { ... },
  pricing: { ... },
});
```

## 架构设计

```
ContentGenerationService (统一入口)
    │
    ├── TemplateProvider (模板方案)
    │   └── ✅ 零成本，始终可用
    │
    ├── DeepSeekProvider (推荐)
    │   └── 🚧 需配置 API Key
    │
    ├── OpenAIProvider (备选)
    │   └── 🚧 需配置 API Key
    │
    └── [其他 Provider] (预留扩展)
        ├── ClaudeProvider
        ├── QwenProvider
        └── MoonshotProvider
```

## 使用模式

### 1. 自动模式（推荐）
```typescript
// 服务自动选择最佳可用 Provider
const content = await contentGenerationService.generate(request);
```

### 2. 指定 Provider
```typescript
const content = await contentGenerationService.generate(request, {
  provider: 'deepseek',
});
```

### 3. 强制降级
```typescript
const content = await contentGenerationService.generate(request, {
  provider: 'template', // 明确使用模板
});
```

## 配置方式

### 方式一：环境变量（推荐）

创建 `.env` 文件：
```bash
# DeepSeek
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key
```

### 方式二：运行时配置

```typescript
contentGenerationService.configure('deepseek', {
  apiKey: 'your_api_key',
  enabled: true,
});

// 设置为默认
contentGenerationService.setDefaultProvider('deepseek');
```

## Provider 接入指南

### 接入 DeepSeek

1. 注册账号：https://platform.deepseek.com/
2. 获取 API Key
3. 配置环境变量
4. 无需改代码，自动启用

```bash
# .env
VITE_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

**成本估算**：约 0.002 元/次，500元/月（10万次）

### 接入 OpenAI

1. 注册账号：https://platform.openai.com/
2. 获取 API Key
3. 配置环境变量

```bash
# .env
VITE_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

**成本估算**：约 0.01 元/次，2000元/月（10万次）

### 接入其他模型

只需三步：

1. 创建 Provider 类，继承 `BaseProvider`
2. 实现 `generate()` 方法
3. 注册到服务

```typescript
// providers/YourProvider.ts
export class YourProvider extends BaseProvider {
  readonly name = 'your_model';
  
  async generate(request: ContentGenerationRequest): Promise<GeneratedContent> {
    // 调用你的模型 API
    return { ... };
  }
}

// 注册
contentGenerationService.register('your_model', new YourProvider(config));
contentGenerationService.setDefaultProvider('your_model');
```

## API 参考

### ContentGenerationService

| 方法 | 说明 |
|------|------|
| `generate(request, options?)` | 生成内容 |
| `generateBatch(request, variants, options?)` | 批量生成（A/B测试） |
| `optimize(content, platform, options?)` | 优化现有内容 |
| `setDefaultProvider(name)` | 设置默认 Provider |
| `configure(name, config)` | 配置 Provider |
| `getAvailableProviders()` | 获取可用 Providers |
| `healthCheckAll()` | 健康检查 |

### 生成选项

```typescript
interface GenerationOptions {
  provider?: string;        // 指定 Provider
  variants?: number;        // 生成版本数
  stream?: boolean;         // 流式输出
  timeout?: number;         // 超时时间（毫秒）
  customSystemPrompt?: string; // 自定义系统提示词
}
```

## 降级策略

当指定 Provider 失败时，自动按优先级尝试：
1. 指定的 Provider（如果指定）
2. 按 priority 排序的其他可用 Providers
3. TemplateProvider（保底）

## 预留的 Provider

以下 Provider 已预留接口，可随时接入：

| Provider | 提供商 | 状态 |
|----------|--------|------|
| claude | Anthropic Claude | 预留 |
| qwen | 阿里云通义千问 | 预留 |
| moonshot | 月之暗面 Kimi | 预留 |
| wenxin | 百度文心一言 | 预留 |
| spark | 讯飞星火 | 预留 |

## 开发指南

### 本地开发

使用模板模式，无需 API Key：
```typescript
// 默认就是模板模式
const content = await contentGenerationService.generate(request);
```

### 测试 Provider

```typescript
// 检查服务状态
const status = await contentGenerationService.healthCheckAll();
console.log(status);
// [{ name: 'template', healthy: true }, { name: 'deepseek', healthy: false }]
```

### A/B 测试

```typescript
const variants = await contentGenerationService.generateBatch(request, 3);

// variants[0] - 情感风格
// variants[1] - 幽默风格
// variants[2] - 专业风格
```
