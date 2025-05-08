package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.uuid.Generators;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.server.ErrorMessage;
import com.party.backbone.websocket.message.server.JoinedAdminMessage;
import com.party.backbone.websocket.message.server.JoinedUserMessage;
import com.party.backbone.websocket.message.user.UserJoinMessage;
import com.party.backbone.websocket.model.UserMessageType;

@Component
public class JoinMessageHandler extends GameMessageHandler<UserJoinMessage>
	implements UserMessageHandler {
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;
	private final SessionRegistry sessionRegistry;

	JoinMessageHandler(
		RoomRedisRepository roomRepository,
		ObjectMapper objectMapper,
		SessionRegistry sessionRegistry,
		IdempotencyRedisRepository idempotencyRedisRepository) {
		super(idempotencyRedisRepository, roomRepository);
		this.roomRepository = roomRepository;
		this.objectMapper = objectMapper;
		this.sessionRegistry = sessionRegistry;
	}

	@Override
	public void doHandle(UserJoinMessage message, String roomCode, WebSocketSession session) throws IOException {
		String userId = Generators.timeBasedEpochRandomGenerator().generate().toString();
		roomRepository.addPlayer(roomCode, userId, message.getNickname());
		sessionRegistry.register(userId, session);
		String administratorId = roomRepository.getAdministratorIdOfRoom(roomCode);
		WebSocketSession administratorSession = sessionRegistry.get(administratorId);
		if (administratorSession == null) {
			session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
				new ErrorMessage("administrator does not exist"))));
			return;
		}
		int userCount = roomRepository.getUserCount(roomCode);
		administratorSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(new JoinedAdminMessage(
			message.getRequestId(), roomCode, userId, message.getNickname(), userCount))));
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
			new JoinedUserMessage(message.getRequestId(), roomCode, userId, message.getNickname()))));
	}

	@Override
	public UserMessageType getMessageType() {
		return UserMessageType.JOIN;
	}
}
