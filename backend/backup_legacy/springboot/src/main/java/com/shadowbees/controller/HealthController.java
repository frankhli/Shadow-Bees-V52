package com.shadowbees.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 健康检查接口
 * 用于：负载均衡健康检查、监控告警、K8s探针
 */
@Slf4j
@RestController
@RequestMapping("/actuator")
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;
    private final StringRedisTemplate redisTemplate;
    private final RabbitTemplate rabbitTemplate;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health/detail")
    public ResponseEntity<Map<String, Object>> healthDetail() {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> components = new HashMap<>();
        
        components.put("database", checkDatabase());
        components.put("redis", checkRedis());
        components.put("rabbitmq", checkRabbitMQ());
        components.put("diskSpace", checkDiskSpace());

        boolean allUp = components.values().stream()
            .allMap<String, Object> comp -> "UP".equals(comp.get("status"));
        
        response.put("status", allUp ? "UP" : "DOWN");
        response.put("components", components);
        response.put("timestamp", LocalDateTime.now().toString());

        return allUp 
            ? ResponseEntity.ok(response)
            : ResponseEntity.status(503).body(response);
    }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        Map<String, Object> response = new HashMap<>();
        boolean dbReady = isDatabaseReady();
        boolean redisReady = isRedisReady();
        
        if (dbReady && redisReady) {
            response.put("status", "READY");
            return ResponseEntity.ok(response);
        } else {
            response.put("status", "NOT_READY");
            return ResponseEntity.status(503).body(response);
        }
    }

    @GetMapping("/live")
    public ResponseEntity<Map<String, Object>> live() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ALIVE");
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> checkDatabase() {
        Map<String, Object> status = new HashMap<>();
        try (Connection conn = dataSource.getConnection()) {
            if (conn.isValid(5)) {
                status.put("status", "UP");
                String version = jdbcTemplate.queryForObject("SELECT version()", String.class);
                status.put("details", Map.of("database", "PostgreSQL", "version", version));
            } else {
                status.put("status", "DOWN");
            }
        } catch (SQLException e) {
            status.put("status", "DOWN");
            status.put("error", e.getMessage());
        }
        return status;
    }

    private Map<String, Object> checkRedis() {
        Map<String, Object> status = new HashMap<>();
        try {
            String pong = redisTemplate.getConnectionFactory().getConnection().ping();
            status.put("status", "PONG".equals(pong) ? "UP" : "DOWN");
        } catch (Exception e) {
            status.put("status", "DOWN");
        }
        return status;
    }

    private Map<String, Object> checkRabbitMQ() {
        Map<String, Object> status = new HashMap<>();
        try {
            rabbitTemplate.execute(channel -> channel.isOpen());
            status.put("status", "UP");
        } catch (Exception e) {
            status.put("status", "DOWN");
        }
        return status;
    }

    private Map<String, Object> checkDiskSpace() {
        Map<String, Object> status = new HashMap<>();
        java.io.File root = new java.io.File("/");
        long usagePercent = (root.getTotalSpace() - root.getFreeSpace()) * 100 / root.getTotalSpace();
        status.put("status", usagePercent > 90 ? "DOWN" : "UP");
        status.put("usage", usagePercent + "%");
        return status;
    }

    private boolean isDatabaseReady() {
        try (Connection conn = dataSource.getConnection()) {
            return conn.isValid(3);
        } catch (SQLException e) {
            return false;
        }
    }

    private boolean isRedisReady() {
        try {
            return "PONG".equals(redisTemplate.getConnectionFactory().getConnection().ping());
        } catch (Exception e) {
            return false;
        }
    }
}
