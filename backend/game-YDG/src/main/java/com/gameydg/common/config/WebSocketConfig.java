package com.gameydg.common.config;

import java.util.Map;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

	// key: URI, value: WebSocketHandler
	private final Map<String, WebSocketHandler> handlerMap;

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		handlerMap.forEach((path, handler) -> {
			registry.addHandler(handler, path).setAllowedOrigins("*");
		});
	}
}
