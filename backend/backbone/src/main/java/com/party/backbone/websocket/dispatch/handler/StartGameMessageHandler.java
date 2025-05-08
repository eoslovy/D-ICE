package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.room.dto.RoundInfo;
import com.party.backbone.websocket.broadcast.Broadcaster;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.admin.StartGameMessage;
import com.party.backbone.websocket.message.server.WaitMessage;
import com.party.backbone.websocket.model.AdminMessageType;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class StartGameMessageHandler extends GameMessageHandler<StartGameMessage> implements AdminMessageHandler {
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;
	private final SessionRegistry sessionRegistry;
	private final Broadcaster broadcaster;

	StartGameMessageHandler(
		RoomRedisRepository roomRepository,
		ObjectMapper objectMapper,
		SessionRegistry sessionRegistry,
		IdempotencyRedisRepository idempotencyRedisRepository,
		Broadcaster broadcaster) {
		super(idempotencyRedisRepository, roomRepository);
		this.roomRepository = roomRepository;
		this.objectMapper = objectMapper;
		this.sessionRegistry = sessionRegistry;
		this.broadcaster = broadcaster;
	}

	@Override
	public void doHandle(StartGameMessage message, String roomCode, WebSocketSession session) throws IOException {
		RoundInfo roundInfo = roomRepository.startGame(roomCode);
		var waitMessage = new WaitMessage(roundInfo);
		try {
			String payload = objectMapper.writeValueAsString(waitMessage);
			List<String> userIds = roomRepository.getUserIds(roomCode);
			List<WebSocketSession> sessions = sessionRegistry.getOpenSessions(userIds);
			broadcaster.broadcast(sessions, payload, roomCode);
		} catch (Exception e) {
			log.error("[Broadcast] json parsing failed. payload={}", waitMessage, e);
		}
	}

	@Override
	public AdminMessageType getMessageType() {
		return AdminMessageType.START_GAME;
	}
}
