package com.party.backbone.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import com.party.backbone.websocket.handler.AdminWebSocketHandler;
import com.party.backbone.websocket.handler.UserWebSocketHandler;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {
	private final AdminWebSocketHandler adminHandler;
	private final UserWebSocketHandler gameHandler;

	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(adminHandler, "/ws/game/admin")
			.setAllowedOrigins("*");
		registry.addHandler(gameHandler, "/ws/game/user/{roomCode}")
			.setAllowedOrigins("*");
	}
}