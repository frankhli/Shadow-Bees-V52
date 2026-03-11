package com.shadowbees.service;

import com.shadowbees.client.LLMClient;
import com.shadowbees.config.RabbitConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * 定价服务
 * 处理：智能定价计算、价格更新
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PricingService {
    
    private final RabbitTemplate rabbitTemplate;
    private final LLMClient llmClient;
    
    /**
     * 触发智能定价分析
     * 异步发送到队列，由消费者处理
     */
    public void triggerPricingAnalysis(String hotelId, String roomTypeId) {
        PricingMessage message = new PricingMessage();
        message.setId(UUID.randomUUID().toString());
        message.setHotelId(hotelId);
        message.setRoomTypeId(roomTypeId);
        message.setTimestamp(System.currentTimeMillis());
        
        rabbitTemplate.convertAndSend(
            RabbitConfig.EXCHANGE_PRICING,
            RabbitConfig.QUEUE_PRICING_ANALYSIS,
            message
        );
        
        log.info("[Pricing] Triggered analysis for hotel:{}, room:{}", 
                hotelId, roomTypeId);
    }
    
    /**
     * 定价分析消费者
     * 调用大模型进行定价分析
     */
    @RabbitListener(queues = RabbitConfig.QUEUE_PRICING_ANALYSIS)
    public void handlePricingAnalysis(PricingMessage message) {
        log.info("[Pricing] Processing analysis for message: {}", message.getId());
        
        try {
            // 1. 构建上下文
            LLMClient.PricingContext context = buildContext(message);
            
            // 2. 调用大模型
            LLMClient.PricingSuggestion suggestion = llmClient.analyzePricing(context);
            
            // 3. 发送价格更新消息
            if (suggestion != null) {
                sendPriceUpdate(message, suggestion);
            }
            
        } catch (Exception e) {
            log.error("[Pricing] Analysis failed: {}", e.getMessage(), e);
            // 消息会自动进入死信队列，后续重试
        }
    }
    
    /**
     * 价格更新消费者
     * 更新数据库价格日历
     */
    @RabbitListener(queues = RabbitConfig.QUEUE_PRICING_UPDATE)
    public void handlePriceUpdate(PriceUpdateMessage message) {
        log.info("[Pricing] Updating price for hotel:{}, price:{}", 
                message.getHotelId(), message.getSuggestedPrice());
        
        // TODO: 更新 price_calendar 表
    }
    
    private LLMClient.PricingContext buildContext(PricingMessage message) {
        LLMClient.PricingContext context = new LLMClient.PricingContext();
        context.setHotelId(message.getHotelId());
        context.setRoomTypeId(message.getRoomTypeId());
        // TODO: 查询实时入住率、竞品价格等
        return context;
    }
    
    private void sendPriceUpdate(PricingMessage message, LLMClient.PricingSuggestion suggestion) {
        PriceUpdateMessage update = new PriceUpdateMessage();
        update.setHotelId(message.getHotelId());
        update.setRoomTypeId(message.getRoomTypeId());
        update.setSuggestedPrice(suggestion.getSuggestedPrice());
        update.setReason(suggestion.getReason());
        
        rabbitTemplate.convertAndSend(
            RabbitConfig.EXCHANGE_PRICING,
            RabbitConfig.QUEUE_PRICING_UPDATE,
            update
        );
    }
    
    // DTOs
    public static class PricingMessage {
        private String id;
        private String hotelId;
        private String roomTypeId;
        private Long timestamp;
        
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getHotelId() { return hotelId; }
        public void setHotelId(String hotelId) { this.hotelId = hotelId; }
        public String getRoomTypeId() { return roomTypeId; }
        public void setRoomTypeId(String roomTypeId) { this.roomTypeId = roomTypeId; }
        public Long getTimestamp() { return timestamp; }
        public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
    }
    
    public static class PriceUpdateMessage {
        private String hotelId;
        private String roomTypeId;
        private Double suggestedPrice;
        private String reason;
        
        public String getHotelId() { return hotelId; }
        public void setHotelId(String hotelId) { this.hotelId = hotelId; }
        public String getRoomTypeId() { return roomTypeId; }
        public void setRoomTypeId(String roomTypeId) { this.roomTypeId = roomTypeId; }
        public Double getSuggestedPrice() { return suggestedPrice; }
        public void setSuggestedPrice(Double suggestedPrice) { this.suggestedPrice = suggestedPrice; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
