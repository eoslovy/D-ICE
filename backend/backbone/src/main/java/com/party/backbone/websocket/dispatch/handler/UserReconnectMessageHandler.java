package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.server.UserReconnectedMessage;
import com.party.backbone.websocket.message.user.UserReconnectMessage;
import com.party.backbone.websocket.model.UserMessageType;

@Component
public class UserReconnectMessageHandler extends GameMessageHandler<UserReconnectMessage>
	implements UserMessageHandler {
	private final SessionRegistry sessionRegistry;
	private final ObjectMapper objectMapper;

	protected UserReconnectMessageHandler(
		IdempotencyRedisRepository idempotencyRedisRepository,
		RoomRedisRepository roomRepository, SessionRegistry sessionRegistry, ObjectMapper objectMapper) {
		super(idempotencyRedisRepository, roomRepository);
		this.sessionRegistry = sessionRegistry;
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doHandle(UserReconnectMessage message, String roomCode, WebSocketSession session) throws
		IOException {
		String userId = message.getUserId();
		var existingSession = sessionRegistry.get(userId);
		if (existingSession != null && existingSession.isOpen()) {
			throw new IllegalStateException(
				"[UserReconnect] existing session is still active userId :" + userId);
		}
		sessionRegistry.register(userId, session);
		var userReconnectedMessage = new UserReconnectedMessage(message.getRequestId(), userId);
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(userReconnectedMessage)));
	}

	@Override
	public UserMessageType getMessageType() {
		return UserMessageType.USER_RECONNECT;
	}
}
