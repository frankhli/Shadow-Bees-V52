package com.shadowbees.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ 队列配置
 */
@Configuration
public class RabbitConfig {
    
    // ==========================================
    // 定价相关队列
    // ==========================================
    public static final String QUEUE_PRICING_ANALYSIS = "pricing.analysis";
    public static final String QUEUE_PRICING_UPDATE = "pricing.update";
    public static final String EXCHANGE_PRICING = "pricing.exchange";
    
    // ==========================================
    // OTA 抓取队列
    // ==========================================
    public static final String QUEUE_OTA_SCRAPE = "ota.scrape";
    public static final String QUEUE_OTA_PRICE_UPDATE = "ota.price.update";
    public static final String EXCHANGE_OTA = "ota.exchange";
    
    // ==========================================
    // 大模型任务队列
    // ==========================================
    public static final String QUEUE_LLM_PRICING = "llm.pricing";
    public static final String QUEUE_LLM_CONTENT = "llm.content";
    public static final String EXCHANGE_LLM = "llm.exchange";
    
    // ==========================================
    // 订单处理队列
    // ==========================================
    public static final String QUEUE_ORDER_CREATE = "order.create";
    public static final String QUEUE_ORDER_STATUS_UPDATE = "order.status.update";
    public static final String EXCHANGE_ORDER = "order.exchange";
    
    // ==========================================
    // 死信队列（处理失败消息）
    // ==========================================
    public static final String QUEUE_DLX = "dlx.queue";
    public static final String EXCHANGE_DLX = "dlx.exchange";
    
    // ==========================================
    // Bean 定义
    // ==========================================
    
    @Bean
    public DirectExchange pricingExchange() {
        return new DirectExchange(EXCHANGE_PRICING);
    }
    
    @Bean
    public Queue pricingAnalysisQueue() {
        return QueueBuilder.durable(QUEUE_PRICING_ANALYSIS)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DLX)
                .withArgument("x-dead-letter-routing-key", QUEUE_DLX)
                .build();
    }
    
    @Bean
    public Binding pricingAnalysisBinding() {
        return BindingBuilder.bind(pricingAnalysisQueue())
                .to(pricingExchange())
                .with(QUEUE_PRICING_ANALYSIS);
    }
    
    @Bean
    public DirectExchange otaExchange() {
        return new DirectExchange(EXCHANGE_OTA);
    }
    
    @Bean
    public Queue otaScrapeQueue() {
        return QueueBuilder.durable(QUEUE_OTA_SCRAPE)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DLX)
                .build();
    }
    
    @Bean
    public Binding otaScrapeBinding() {
        return BindingBuilder.bind(otaScrapeQueue())
                .to(otaExchange())
                .with(QUEUE_OTA_SCRAPE);
    }
    
    @Bean
    public DirectExchange llmExchange() {
        return new DirectExchange(EXCHANGE_LLM);
    }
    
    @Bean
    public Queue llmPricingQueue() {
        return QueueBuilder.durable(QUEUE_LLM_PRICING)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DLX)
                .build();
    }
    
    @Bean
    public Binding llmPricingBinding() {
        return BindingBuilder.bind(llmPricingQueue())
                .to(llmExchange())
                .with(QUEUE_LLM_PRICING);
    }
    
    @Bean
    public DirectExchange orderExchange() {
        return new DirectExchange(EXCHANGE_ORDER);
    }
    
    @Bean
    public Queue orderCreateQueue() {
        return QueueBuilder.durable(QUEUE_ORDER_CREATE)
                .withArgument("x-dead-letter-exchange", EXCHANGE_DLX)
                .build();
    }
    
    @Bean
    public Binding orderCreateBinding() {
        return BindingBuilder.bind(orderCreateQueue())
                .to(orderExchange())
                .with(QUEUE_ORDER_CREATE);
    }
    
    // 死信队列
    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange(EXCHANGE_DLX);
    }
    
    @Bean
    public Queue dlxQueue() {
        return new Queue(QUEUE_DLX);
    }
    
    @Bean
    public Binding dlxBinding() {
        return BindingBuilder.bind(dlxQueue())
                .to(dlxExchange())
                .with(QUEUE_DLX);
    }
}
