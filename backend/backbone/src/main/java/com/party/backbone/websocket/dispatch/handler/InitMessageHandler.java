package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.broadcast.Broadcaster;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.admin.InitMessage;
import com.party.backbone.websocket.message.server.WaitMessage;
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
		Broadcaster broadcaster) {
		super(idempotencyRedisRepository);
		this.roomRepository = roomRepository;
		this.objectMapper = objectMapper;
		this.sessionRegistry = sessionRegistry;
		this.broadcaster = broadcaster;
	}

	@Override
	public void doHandle(InitMessage message, String roomCode, WebSocketSession session) throws IOException {
		Set<GameType> playedGames = roomRepository.getPlayedGames(roomCode);
		GameType nextGameType = GameType.randomExcluding(playedGames);
		roomRepository.initializeRoom(roomCode, nextGameType, message.getTotalRound());
		var waitMessage = new WaitMessage(nextGameType);
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
		return AdminMessageType.INIT;
	}
}
