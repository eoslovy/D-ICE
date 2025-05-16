package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.message.server.CheckEndedAckMessage;
import com.party.backbone.websocket.message.user.CheckEndedMessage;
import com.party.backbone.websocket.model.UserMessageType;

@Component
public class CheckEndedMessageHandler extends GameMessageHandler<CheckEndedMessage> implements UserMessageHandler {
	private ObjectMapper objectMapper;

	protected CheckEndedMessageHandler(
		IdempotencyRedisRepository idempotencyRedisRepository,
		RoomRedisRepository roomRepository,
		ObjectMapper objectMapper) {
		super(idempotencyRedisRepository, roomRepository);
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doHandle(CheckEndedMessage message, String roomCode, WebSocketSession session) throws IOException {
		CheckEndedAckMessage ackMessage = roomRepository.checkEnded(roomCode, message.getUserId());
		session.sendMessage(new TextMessage(objectMapper.writeValueAsString(ackMessage)));
	}

	@Override
	public UserMessageType getMessageType() {
		return UserMessageType.CHECK_ENDED;
	}
}
