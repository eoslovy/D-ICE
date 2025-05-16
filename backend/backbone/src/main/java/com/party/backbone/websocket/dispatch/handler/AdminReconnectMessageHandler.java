package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.admin.AdminReconnectMessage;
import com.party.backbone.websocket.message.server.AdminReconnectedMessage;
import com.party.backbone.websocket.model.AdminMessageType;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class AdminReconnectMessageHandler extends GameMessageHandler<AdminReconnectMessage>
	implements AdminMessageHandler {
	private final SessionRegistry sessionRegistry;
	private final ObjectMapper objectMapper;

	protected AdminReconnectMessageHandler(
		IdempotencyRedisRepository idempotencyRedisRepository,
		RoomRedisRepository roomRepository, SessionRegistry sessionRegistry, RoomRedisRepository roomRepository1,
		ObjectMapper objectMapper) {
		super(idempotencyRedisRepository, roomRepository);
		this.sessionRegistry = sessionRegistry;
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doHandle(AdminReconnectMessage message, String roomCode, WebSocketSession session) throws
		IOException {
		String administratorId = message.getAdministratorId();
		var existingSession = sessionRegistry.get(administratorId);
		if (existingSession != null && existingSession.isOpen()) {
			throw new IllegalStateException(
				"[AdminReconnect] existing session is still active administratorId: " + administratorId);
		}
		sessionRegistry.register(administratorId, session);
		var adminReconnectedMessage = new AdminReconnectedMessage(message.getRequestId(), administratorId);
		log.info("[AdminReconnected] admin reconnected for roomCode: {} id: {}", roomCode, administratorId);
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(adminReconnectedMessage)));
	}

	@Override
	public AdminMessageType getMessageType() {
		return AdminMessageType.ADMIN_RECONNECT;
	}
}
