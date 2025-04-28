// package com.party.backbone.room;
//
// import java.time.Duration;
// import java.time.Instant;
// import java.util.Map;
// import java.util.Random;
// import java.util.UUID;
//
// import org.springframework.data.redis.core.BoundHashOperations;
// import org.springframework.data.redis.core.RedisTemplate;
// import org.springframework.stereotype.Component;
// import org.springframework.web.socket.TextMessage;
// import org.springframework.web.socket.WebSocketSession;
//
// import com.fasterxml.jackson.databind.ObjectMapper;
// import com.fasterxml.uuid.Generators;
// import com.party.backbone.websocket.message.admin.CreateMessage;
// import com.party.backbone.websocket.message.server.CreatedMessage;
// import com.party.backbone.websocket.message.GameMessage;
// import com.party.backbone.websocket.model.MessageType;
//
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
//
// @Component
// @RequiredArgsConstructor
// @Slf4j
// public class RoomManager {
// 	private final RedisTemplate<String, String> redis;
// 	private static final Duration TTL_BASE = Duration.ofMinutes(5);
// 	private static final Duration TTL_AFTER_GAME_START = Duration.ofMinutes(50);
// 	private final ObjectMapper objectMapper;
// 	private final Random random = new Random();
//
//
// 	// 5.1 CREATE
// 	public void handleCreate(WebSocketSession session, CreateMessage gameMessage) {
// 		String roomCode = makeRoomCode();
// 		String administratorId = Generators.timeBasedEpochGenerator().generate().toString();
//
// 		BoundHashOperations<String, Object, Object> room =
// 			redis.boundHashOps("room:" + roomCode);
// 		room.put("state", "CREATED");
// 		room.put("administratorId", administratorId);
// 		room.expire(TTL_BASE);
//
// 		send(session, new CreatedMessage(gameMessage.getRequestId(),
// 			roomCode, administratorId));
// 	}
//
// 	// 5.2 JOIN
// 	public void handleJoin(WebSocketSession session, GameMessage gameMessage) {
// 		String code = envelope.getRoomCode();
// 		String nickname = ((Map<?, ?>)envelope.getPayload()).get("nickname").toString();
// 		String userId = UUID.randomUUID().toString();
//
// 		redis.opsForSet().add("room:" + code + ":users", userId);
// 		redis.opsForHash().increment("room:" + code, "userCount", 1);
//
// 		send(session, new WebsocketEnvelope<>(MessageType.JOINED, envelope.getRequestId(), now(), code, userId,
// 			Map.of("nickname", nickname)));
// 		broadcastAdmin(code, MessageType.JOINED,
// 			Map.of("userId", userId, "nickname", nickname, "userCount", userCount(code)));
// 	}
//
// 	// 5.3 SUBMIT (멱등 – 최초만)
// 	public void handleSubmit(WebSocketSession session, WebsocketEnvelope<?> envelope) {
// 		Map<?, ?> payload = (Map<?, ?>)envelope.getPayload();
// 		String code = envelope.getRoomCode();
// 		int round = (int)payload.get("round");
// 		String user = envelope.getUserId();
// 		int score = (int)payload.get("score");
//
// 		String idemKey = StrUtil.format("submitted:{}:{}:{}", code, round, user);
// 		Boolean first = redis.opsForValue().setIfAbsent(idemKey, "1", Duration.ofHours(2));
// 		if (Boolean.FALSE.equals(first))
// 			return;   // 중복이므로 무시
//
// 		redis.opsForZSet().add("room:%s:round:%d".formatted(code, round), user, score);
// 		redis.opsForZSet().incrementScore("room:%s:overall".formatted(code), user, score);
//
// 		// 라운드 완료 검사 & 집계 Push 로직 … (생략)
// 	}
//
// 	/* ---------- 유틸 ---------- */
// 	private void send(WebSocketSession session, GameMessage message) {
// 		try {
// 			session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
// 		} catch (Exception e) {
// 			log.error("Send fail", e);
// 		}
// 	}
//
//
//
// 	private long now() {
// 		return Instant.now().toEpochMilli();
// 	}
//
// 	private int userCount(String code) {
// 		Long c = redis.opsForHash().get("room:" + code, "userCount");
// 		return c == null ? 0 : c.intValue();
// 	}
//
// 	private int
//
// 	private void broadcastAdmin(String code, MessageType type, Object body) { /* pub/sub */ }
// }
