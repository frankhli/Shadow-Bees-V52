package com.shadowbees.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * 大模型客户端
 * 对接：OpenAI GPT-4、百度文心一言等
 */
@Slf4j
@Component
public class LLMClient extends AbstractExternalClient {
    
    public LLMClient(WebClient.Builder webClientBuilder,
                     StringRedisTemplate redisTemplate) {
        super(webClientBuilder.build(), redisTemplate, "LLM");
    }
    
    /**
     * 智能定价建议
     * 限流：20次/分钟（OpenAI限制）
     * 缓存：相同输入缓存30分钟（节省成本）
     */
    @CircuitBreaker(name = "llmClient", fallbackMethod = "fallback")
    @RateLimiter(name = "llmOpenAI")
    public PricingSuggestion analyzePricing(PricingContext context) {
        String cacheKey = String.format("llm:pricing:%s", context.hashCode());
        
        return getWithCache(cacheKey, Duration.ofMinutes(30), 
                           PricingSuggestion.class, () -> {
            log.info("[LLM] Analyzing pricing for hotel: {}", context.getHotelId());
            
            // TODO: 构造Prompt，调用大模型API
            // Prompt模板在 resources/prompts/pricing-analysis.txt
            
            return null;
        });
    }
    
    /**
     * 生成营销文案
     */
    @CircuitBreaker(name = "llmClient", fallbackMethod = "fallbackContent")
    @RateLimiter(name = "llmOpenAI")
    public ContentGeneration generateContent(ContentContext context) {
        log.info("[LLM] Generating content for platform: {}", context.getPlatform());
        
        // TODO: 调用大模型生成文案
        return null;
    }
    
    // 降级方法
    private PricingSuggestion fallback(PricingContext context, Throwable throwable) {
        log.error("[LLM] Fallback for pricing: {}", throwable.getMessage());
        // 返回基于规则的定价建议
        return PricingSuggestion.defaultSuggestion();
    }
    
    private ContentGeneration fallbackContent(ContentContext context, Throwable throwable) {
        log.error("[LLM] Fallback for content: {}", throwable.getMessage());
        return ContentGeneration.fail("服务暂不可用");
    }
    
    @Override
    protected <T> T parseResponse(String cached, Class<T> responseType) {
        return null;
    }
    
    @Override
    protected <T> String serializeResponse(T response) {
        return "";
    }
    
    // DTOs
    @Data
    public static class PricingContext {
        private String hotelId;
        private String roomTypeId;
        private Double occupancyRate;
        private Double competitorAvgPrice;
        private String events;  // 周边事件JSON
        
        public int hashCode() {
            return (hotelId + roomTypeId + occupancyRate).hashCode();
        }
    }
    
    @Data
    public static class PricingSuggestion {
        private Double suggestedPrice;
        private String reason;
        private String riskWarning;
        
        public static PricingSuggestion defaultSuggestion() {
            PricingSuggestion s = new PricingSuggestion();
            s.suggestedPrice = 350.0;
            s.reason = "基于历史数据";
            s.riskWarning = "AI服务暂不可用，建议人工复核";
            return s;
        }
    }
    
    @Data
    public static class ContentContext {
        private String platform;  // xianyu/xiaohongshu/wechat
        private String hotelName;
        private String roomType;
        private Double price;
    }
    
    @Data
    public static class ContentGeneration {
        private String title;
        private String content;
        private List<String> tags;
        private Boolean success;
        private String errorMessage;
        
        public static ContentGeneration fail(String error) {
            ContentGeneration g = new ContentGeneration();
            g.success = false;
            g.errorMessage = error;
            return g;
        }
    }
}
