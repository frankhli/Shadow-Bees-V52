package com.shadowbees.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI (Swagger) 文档配置
 * 访问: http://localhost:8080/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Shadow-Bees API")
                        .version("1.0.0")
                        .description("智能收益管理系统 API 文档")
                        .contact(new Contact()
                                .name("DOOMESEE Tech")
                                .email("support@shadowbees.com"))
                        .license(new License()
                                .name("Private License")))
                .servers(List.of(
                        new Server().url("http://localhost:8080/api/v1").description("本地环境"),
                        new Server().url("https://api.shadowbees.com/api/v1").description("生产环境")
                ));
    }
}
