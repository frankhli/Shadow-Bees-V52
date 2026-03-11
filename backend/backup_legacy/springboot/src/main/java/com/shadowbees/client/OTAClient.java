package com.shadowbees.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

/**
 * OTA（在线旅行社）客户端
 * 对接：携程、美团、飞猪等
 */
@Slf4j
@Component
public class OTAClient extends AbstractExternalClient {
    
    public OTAClient(WebClient.Builder webClientBuilder,
                     StringRedisTemplate redisTemplate) {
        super(webClientBuilder.build(), redisTemplate, "OTA");
    }
    
    /**
     * 抓取携程价格
     * 限流：100次/小时
     * 缓存：10分钟
     */
    @CircuitBreaker(name = "otaClient", fallbackMethod = "fallback")
    @RateLimiter(name = "otaXiecheng")
    public List<PriceInfo> scrapeXiecheng(String hotelName, LocalDate date) {
        String cacheKey = String.format("ota:xiecheng:%s:%s", hotelName, date);
        
        return getWithCache(cacheKey, Duration.ofMinutes(10), 
                           List.class, () -> {
            log.info("[OTA] Scraping Xiecheng for {} on {}", hotelName, date);
            
            // TODO: 实际调用携程API
            return null;
        });
    }
    
    /**
     * 抓取美团价格
     */
    @CircuitBreaker(name = "otaClient", fallbackMethod = "fallback")
    public List<PriceInfo> scrapeMeituan(String hotelName, LocalDate date) {
        String cacheKey = String.format("ota:meituan:%s:%s", hotelName, date);
        
        return getWithCache(cacheKey, Duration.ofMinutes(10), 
                           List.class, () -> {
            log.info("[OTA] Scraping Meituan for {} on {}", hotelName, date);
            return null;
        });
    }
    
    private List<PriceInfo> fallback(String hotelName, LocalDate date, Throwable throwable) {
        log.error("[OTA] Fallback for {} on {}: {}", hotelName, date, throwable.getMessage());
        return List.of();
    }
    
    @Override
    protected <T> T parseResponse(String cached, Class<T> responseType) {
        return null;
    }
    
    @Override
    protected <T> String serializeResponse(T response) {
        return "";
    }
    
    // DTO
    @Data
    public static class PriceInfo {
        private String hotelName;
        private String roomType;
        private BigDecimal price;
        private LocalDate date;
        private String platform;  // xiecheng/meituan/feizhu
    }
}
