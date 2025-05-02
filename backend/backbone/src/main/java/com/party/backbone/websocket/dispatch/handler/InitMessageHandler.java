package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;
import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.broadcast.Broadcaster;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.admin.InitMessage;
import com.party.backbone.websocket.message.server.EnterGameMessage;
import com.party.backbone.websocket.message.server.NextGameMessage;
import com.party.backbone.websocket.model.AdminMessageType;
import com.party.backbone.websocket.model.GameType;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class InitMessageHandler extends GameMessageHandler<InitMessage> implements AdminMessageHandler {
	private final RoomRedisRepository roomRepository;
	private final ObjectMapper objectMapper;
	private final SessionRegistry sessionRegistry;
	private final Broadcaster broadcaster;

	InitMessageHandler(
		RoomRedisRepository roomRepository,
		ObjectMapper objectMapper,
		SessionRegistry sessionRegistry,
		IdempotencyRedisRepository idempotencyRedisRepository,
		Broadcaster broadcaster
	) {
		super(idempotencyRedisRepository);
		this.roomRepository = roomRepository;
		this.objectMapper = objectMapper;
		this.sessionRegistry = sessionRegistry;
		this.broadcaster = broadcaster;
	}

	@Override
	public void doHandle(InitMessage message, String roomCode, WebSocketSession session) throws IOException {
		List<GameType> pickedGames = GameType.pickRandomList(message.getTotalRound());
		roomRepository.initializeRoom(roomCode, pickedGames, message.getTotalRound());
		var firstGameMessage = new NextGameMessage(pickedGames.get(0), 1);
		try {
			String payload = objectMapper.writeValueAsString(firstGameMessage);
			sessionRegistry.get(message.getAdministratorId()).sendMessage(new TextMessage(payload));
		} catch (Exception e) {
			log.error("[InitMessageHandler] json parsing failed. payload={}", firstGameMessage, e);
		}

		var enterGameMessage = new EnterGameMessage();
		try {
			String payload = objectMapper.writeValueAsString(enterGameMessage);
			List<String> userIds = roomRepository.getUserIds(roomCode);
			List<WebSocketSession> sessions = sessionRegistry.getOpenSessions(userIds);
			broadcaster.broadcast(sessions, payload, roomCode);
		} catch (Exception e) {
			log.error("[InitMessageHandler] json parsing failed. payload={}", enterGameMessage, e);
		}
	}

	@Override
	public AdminMessageType getMessageType() {
		return AdminMessageType.INIT;
	}
}
