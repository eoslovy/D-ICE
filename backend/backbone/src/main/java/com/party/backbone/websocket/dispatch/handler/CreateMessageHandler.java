package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.uuid.Generators;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.admin.CreateMessage;
import com.party.backbone.websocket.message.server.CreatedMessage;
import com.party.backbone.websocket.model.AdminMessageType;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class CreateMessageHandler implements AdminMessageHandler<CreateMessage> {
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;
	private final SessionRegistry sessionRegistry;

	@Override
	public void handle(CreateMessage message, WebSocketSession session) throws IOException {
		String administratorId = Generators.timeBasedEpochRandomGenerator().generate().toString();
		String roomCode = roomRepository.generateUniqueRoomCode();
		roomRepository.createRoom(roomCode, administratorId);
		CreatedMessage response = new CreatedMessage(message.getRequestId(), roomCode, administratorId);
		sessionRegistry.register(administratorId, session);
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
	}

	@Override
	public AdminMessageType getMessageType() {
		return AdminMessageType.CREATE;
	}
}
