package com.shadowbees.client;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * PMS（酒店管理系统）客户端
 * 对接：绿云、中软等PMS系统
 */
@Slf4j
@Component
public class PMSClient extends AbstractExternalClient {
    
    public PMSClient(WebClient.Builder webClientBuilder,
                     StringRedisTemplate redisTemplate) {
        super(webClientBuilder.baseUrl("https://api.pms.example.com").build(), 
              redisTemplate, "PMS");
    }
    
    /**
     * 获取实时房态
     * 缓存5分钟
     */
    @CircuitBreaker(name = "pmsClient", fallbackMethod = "fallback")
    public RoomStatusResponse getRoomStatus(String hotelId) {
        String cacheKey = String.format("pms:roomstatus:%s", hotelId);
        
        return getWithCache(cacheKey, Duration.ofMinutes(5), 
                           RoomStatusResponse.class, () -> {
            log.info("[PMS] Fetching room status for hotel: {}", hotelId);
            
            // TODO: 实际调用PMS API
            return null;
        });
    }
    
    private RoomStatusResponse fallback(String hotelId, Throwable throwable) {
        log.error("[PMS] Fallback for hotel {}: {}", hotelId, throwable.getMessage());
        return null;
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
    public static class RoomStatusResponse {
        private String hotelId;
        private Integer availableRooms;
        private Integer occupiedRooms;
    }
}
