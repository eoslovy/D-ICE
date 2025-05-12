package com.gameydg.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.WebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameydg.numberSurvivor.handler.NumberSurvivorWebSocketHandler;
import com.gameydg.numberSurvivor.service.NumberSurvivorService;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class WebSocketHandlerConfig {

    private final ObjectMapper objectMapper;
    private final NumberSurvivorService numberSurvivorService;

    @Bean(name = "/ws/number-survivor")
    public WebSocketHandler numberSurvivorHandler() {
        return new NumberSurvivorWebSocketHandler(objectMapper, numberSurvivorService);
    }
} 