package com.shadowbees.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * 外部API客户端抽象基类
 * 统一处理：熔断、限流、缓存、日志
 */
@Slf4j
public abstract class AbstractExternalClient {
    
    protected final WebClient webClient;
    protected final StringRedisTemplate redisTemplate;
    protected final String clientName;
    
    protected AbstractExternalClient(WebClient webClient, 
                                     StringRedisTemplate redisTemplate,
                                     String clientName) {
        this.webClient = webClient;
        this.redisTemplate = redisTemplate;
        this.clientName = clientName;
    }
    
    /**
     * 带缓存的GET请求
     */
    protected <T> T getWithCache(String cacheKey, 
                                  Duration ttl, 
                                  Class<T> responseType,
                                  RequestExecutor<T> executor) {
        // 1. 尝试从缓存获取
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.debug("[{}] Cache hit: {}", clientName, cacheKey);
            return parseResponse(cached, responseType);
        }
        
        // 2. 缓存未命中，调用API
        T response = executor.execute();
        
        // 3. 写入缓存
        if (response != null) {
            redisTemplate.opsForValue().set(cacheKey, serializeResponse(response), 
                                           ttl.getSeconds(), TimeUnit.SECONDS);
        }
        
        return response;
    }
    
    protected abstract <T> T parseResponse(String cached, Class<T> responseType);
    protected abstract <T> String serializeResponse(T response);
    
    @FunctionalInterface
    protected interface RequestExecutor<T> {
        T execute();
    }
}
