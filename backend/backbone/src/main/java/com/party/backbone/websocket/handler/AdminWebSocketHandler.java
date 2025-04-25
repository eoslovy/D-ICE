package com.party.backbone.websocket.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.websocket.dispatch.registry.AdminMessageHandlerRegistry;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.AdminMessageType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminWebSocketHandler extends TextWebSocketHandler {
	private final ObjectMapper objectMapper;
	private final AdminMessageHandlerRegistry registry;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) {
		log.info("[ADMIN_WEBSOCKET] connection established : {}", session.getId());
	}

	@Override
	public void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws IOException {
		GameMessage message = objectMapper.readValue(textMessage.getPayload(), GameMessage.class);
		log.info("[ADMIN_WEBSOCKET] message : {}", message);
		AdminMessageType type = AdminMessageType.fromMessage(message);
		registry.getHandler(type).handle(message, session);
	}

	@Override
	public void handleTransportError(WebSocketSession session, Throwable exception) {
		log.error("[ADMIN_WEBSOCKET] error occurred: {}", exception.getMessage());
	}
}
