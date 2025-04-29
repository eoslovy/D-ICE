package com.party.backbone.room;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.model.RoomStateTTL;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Repository
public class RoomRedisRepository {
	private final Duration PLAYER_BASE_TTL = Duration.ofHours(2);

	private final RedisTemplate<String, String> redisTemplate;
	private final ObjectMapper objectMapper;

	public void createRoom(String roomCode, String administratorId) {
		String key = getRoomKey(roomCode);
		Map<String, String> roomData = new HashMap<>();
		roomData.put("roomCode", roomCode);
		roomData.put("state", "CREATED");
		// roomData.put("administratorId", administratorId);
		roomData.put("createdAt", String.valueOf(System.currentTimeMillis()));
		roomData.put("currentRound", "0");
		roomData.put("totalRound", "0");
		roomData.put("userCount", "0");

		redisTemplate.opsForHash().putAll(key, roomData);
		redisTemplate.opsForValue().set(key + ":administratorId", administratorId);
		redisTemplate.expire(key, RoomStateTTL.CREATED.getTtl());
	}

	public String generateUniqueRoomCode() {
		String code;
		int maxAttempts = 10;

		for (int i = 0; i < maxAttempts; i++) {
			code = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
			if (!redisTemplate.hasKey(getRoomKey(code))) {
				return code;
			}
		}

		throw new IllegalStateException("Unable to generate unique room code after " + maxAttempts + " attempts");
	}

	public void deleteRoom(String roomCode) {
		// 해당 key 없어도 예외 발생하지 않음
		String roomKey = getRoomKey(roomCode);
		redisTemplate.delete(roomKey);
		redisTemplate.delete(roomKey + ":players");
		redisTemplate.delete(roomKey + ":administratorId");
	}

	public boolean exists(String roomCode) {
		return redisTemplate.hasKey("room:" + roomCode);
	}

	public void addPlayer(String roomCode, String userId, String nickname) {
		String playerKey = "room:" + roomCode + ":players";

		Map<String, String> playerData = Map.of(
			"userId", userId,
			"nickname", nickname,
			"score", "0"
		);

		redisTemplate.opsForHash().put(playerKey, userId, toJson(playerData));
		redisTemplate.expire(playerKey, PLAYER_BASE_TTL);
		redisTemplate.opsForHash().increment(getRoomKey(roomCode), "userCount", 1);
	}

	public List<String> getUserIds(String roomCode) {
		String roomKey = getRoomKey(roomCode) + ":players";
		return redisTemplate.opsForHash()
			.keys(roomKey)
			.stream()
			.map(Object::toString)
			.toList();
	}

	public String getAdministratorIdOfRoom(String roomCode) {
		String administratorKey = getRoomKey(roomCode) + ":administratorId";
		Object result = redisTemplate.opsForValue().get(administratorKey);
		return result != null ? result.toString() : null;
	}

	public int getUserCount(String roomCode) {
		String key = getRoomKey(roomCode);
		Object result = redisTemplate.opsForHash().entries(key).get("userCount");
		return result != null ? Integer.parseInt(result.toString()) : 0;
	}

	private String getRoomKey(String roomCode) {
		return "room:" + roomCode;
	}

	private String toJson(Object obj) {
		try {
			return objectMapper.writeValueAsString(obj);
		} catch (JsonProcessingException e) {
			throw new RuntimeException(e);
		}
	}
}
