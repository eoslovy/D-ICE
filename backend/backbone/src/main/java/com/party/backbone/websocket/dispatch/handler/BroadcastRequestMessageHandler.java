package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.broadcast.Broadcaster;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.server.BroadcastMessage;
import com.party.backbone.websocket.message.user.BroadcastRequestMessage;
import com.party.backbone.websocket.model.UserMessageType;

@Component
public class BroadcastRequestMessageHandler extends GameMessageHandler<BroadcastRequestMessage>
	implements UserMessageHandler {

	private final Broadcaster broadcaster;
	private final SessionRegistry sessionRegistry;
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;

	BroadcastRequestMessageHandler(
		IdempotencyRedisRepository idempotencyRedisRepository, Broadcaster broadcaster, SessionRegistry sessionRegistry,
		RoomRedisRepository roomRepository, ObjectMapper objectMapper) {
		super(idempotencyRedisRepository, roomRepository);
		this.broadcaster = broadcaster;
		this.sessionRegistry = sessionRegistry;
		this.roomRepository = roomRepository;
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doHandle(BroadcastRequestMessage message, String roomCode, WebSocketSession session) throws
		IOException {
		var userIds = roomRepository.getUserIds(roomCode);
		var sessions = sessionRegistry.getOpenSessions(userIds);

		BroadcastMessage broadcastMessage = new BroadcastMessage(message.getRequestId(), message.getUserId(),
			message.getPayload());

		String payload = objectMapper.writeValueAsString(broadcastMessage);
		broadcaster.broadcast(sessions, payload, roomCode);
		var administratorId = roomRepository.getAdministratorIdOfRoom(roomCode);
		var adminSession = sessionRegistry.get(administratorId);
		if (adminSession != null && adminSession.isOpen()) {
			adminSession.sendMessage(new TextMessage(payload));
		}
	}

	@Override
	public UserMessageType getMessageType() {
		return UserMessageType.BROADCAST_REQUEST;
	}
}
