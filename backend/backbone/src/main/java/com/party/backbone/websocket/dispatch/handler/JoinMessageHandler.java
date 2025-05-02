package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.uuid.Generators;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.server.JoinedAdminMessage;
import com.party.backbone.websocket.message.server.JoinedClientMessage;
import com.party.backbone.websocket.message.user.JoinMessage;
import com.party.backbone.websocket.model.UserMessageType;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JoinMessageHandler implements UserMessageHandler<JoinMessage> {
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;
	private final SessionRegistry sessionRegistry;

	@Override
	public void handle(JoinMessage message, String roomCode, WebSocketSession session) throws IOException {
		String userId = Generators.timeBasedEpochRandomGenerator().generate().toString();
		roomRepository.addPlayer(roomCode, userId, message.getNickname());
		sessionRegistry.register(userId, session);
		String administratorId = roomRepository.getAdministratorIdOfRoom(roomCode);
		WebSocketSession administratorSession = sessionRegistry.get(administratorId);
		int userCount = roomRepository.getUserCount(roomCode);
		administratorSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(new JoinedAdminMessage(
			message.getRequestId(), roomCode, userId, message.getNickname(), userCount))));
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
			new JoinedClientMessage(message.getRequestId(), roomCode, userId, message.getNickname()))));
	}

	@Override
	public UserMessageType getMessageType() {
		return UserMessageType.JOIN;
	}
}
