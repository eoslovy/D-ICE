package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.admin.AdminJoinMessage;
import com.party.backbone.websocket.message.server.AdminJoinedMessage;
import com.party.backbone.websocket.model.AdminMessageType;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AdminJoinMessageHandler implements AdminMessageHandler<AdminJoinMessage> {
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;
	private final SessionRegistry sessionRegistry;

	@Override
	public void handle(AdminJoinMessage message, String roomCode, WebSocketSession session) throws IOException {
		String administratorId = roomRepository.getAdministratorIdOfRoom(roomCode);
		if (!message.getAdministratorId().equals(administratorId)) {
			throw new IllegalArgumentException("Invalid administratorId");
		}
		AdminJoinedMessage response = new AdminJoinedMessage(message.getRequestId());
		sessionRegistry.register(administratorId, session);
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
	}

	@Override
	public AdminMessageType getMessageType() {
		return AdminMessageType.ADMIN_JOIN;
	}
}
