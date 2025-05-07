package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.user.SubmitMessage;
import com.party.backbone.websocket.model.UserMessageType;

@Component
public class SubmitMessageHandler extends GameMessageHandler<SubmitMessage> implements UserMessageHandler {
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;
	private final SessionRegistry sessionRegistry;

	protected SubmitMessageHandler(IdempotencyRedisRepository idempotencyRedisRepository, ObjectMapper objectMapper,
		RoomRedisRepository roomRepository, SessionRegistry sessionRegistry) {
		super(idempotencyRedisRepository);
		this.roomRepository = roomRepository;
		this.objectMapper = objectMapper;
		this.sessionRegistry = sessionRegistry;
	}

	@Override
	protected void doHandle(SubmitMessage message, String roomCode, WebSocketSession session) throws IOException {
		roomRepository.updateScore(roomCode, message.getUserId(), message.getScore());
	}

	@Override
	public UserMessageType getMessageType() {
		return UserMessageType.SUBMIT;
	}
}
