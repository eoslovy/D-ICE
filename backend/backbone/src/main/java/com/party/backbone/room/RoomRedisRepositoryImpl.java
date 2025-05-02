package com.party.backbone.room;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.model.RoomStateTTL;
import com.party.backbone.websocket.model.GameType;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Repository
public class RoomRedisRepositoryImpl implements RoomRedisRepository {
	private final Duration PLAYER_BASE_TTL = Duration.ofHours(2);

	private final RedisTemplate<String, String> redisTemplate;
	private final ObjectMapper objectMapper;

	@Override
	public void createRoom(String roomCode, String administratorId) {
		String key = getRoomKey(roomCode);
		Map<String, String> roomData = new HashMap<>();
		roomData.put("roomCode", roomCode);
		roomData.put("state", RoomStateTTL.CREATED.name());
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

	@Override
	public void deleteRoom(String roomCode) {
		// 해당 key 없어도 예외 발생하지 않음
		String roomKey = getRoomKey(roomCode);
		String playersKey = getPlayersKey(roomCode);
		String administratorIdKey = getAdministratorIdKey(roomCode);
		String playedGamesKey = getGamesKey(roomCode);
		redisTemplate.delete(roomKey);
		redisTemplate.delete(playersKey);
		redisTemplate.delete(administratorIdKey);
		redisTemplate.delete(playedGamesKey);
	}

	@Override
	public Set<GameType> getPlayedGames(String roomCode) {
		String key = getGamesKey(roomCode);
		Set<String> gameNames = redisTemplate.opsForZSet().range(key, 0, -1);
		if (gameNames == null || gameNames.isEmpty()) {
			return Set.of();
		}
		return gameNames.stream().map(GameType::valueOf).collect(Collectors.toSet());
	}

	@Override
	public void initializeRoom(String roomCode, List<GameType> games, int totalRound) {
		String roomKey = getRoomKey(roomCode);
		redisTemplate.opsForHash().put(roomKey, "totalRound", String.valueOf(totalRound));
		redisTemplate.opsForHash().put(roomKey, "currentRound", String.valueOf(1));
		redisTemplate.opsForHash().put(roomKey, "state", RoomStateTTL.WAITING.name());
		redisTemplate.expire(getRoomKey(roomKey), RoomStateTTL.WAITING.getTtl());
		List<String> values = games.stream().map(Enum::name).toList();
		redisTemplate.opsForList().rightPushAll(getGamesKey(roomCode), values);
	}

	@Override
	public boolean exists(String roomCode) {
		return redisTemplate.hasKey("room:" + roomCode);
	}

	@Override
	public void addPlayer(String roomCode, String userId, String nickname) {
		String playersKey = getPlayersKey(roomCode);

		Map<String, String> playerData = Map.of(
			"userId", userId,
			"nickname", nickname,
			"score", "0",
			"rankRecord", ""
		);

		redisTemplate.opsForHash().put(playersKey, userId, toJson(playerData));
		redisTemplate.expire(playersKey, PLAYER_BASE_TTL);
		redisTemplate.opsForHash().increment(getRoomKey(roomCode), "userCount", 1);
	}

	@Override
	public List<String> getUserIds(String roomCode) {
		String playersKey = getPlayersKey(roomCode);
		return redisTemplate.opsForHash()
			.keys(playersKey)
			.stream()
			.map(Object::toString)
			.toList();
	}

	@Override
	public String getAdministratorIdOfRoom(String roomCode) {
		String administratorKey = getAdministratorIdKey(roomCode);
		Object result = redisTemplate.opsForValue().get(administratorKey);
		return result != null ? result.toString() : null;
	}

	@Override
	public int getUserCount(String roomCode) {
		String key = getRoomKey(roomCode);
		Object result = redisTemplate.opsForHash().entries(key).get("userCount");
		return result != null ? Integer.parseInt(result.toString()) : 0;
	}

	private String getRoomKey(String roomCode) {
		return "room:" + roomCode;
	}

	private String getPlayersKey(String roomCode) {
		return getRoomKey(roomCode) + ":players";
	}

	private String getAdministratorIdKey(String roomCode) {
		return getRoomKey(roomCode) + ":administratorId";
	}

	private String getGamesKey(String roomCode) {
		return getRoomKey(roomCode) + ":games";
	}

	private String toJson(Object obj) {
		try {
			return objectMapper.writeValueAsString(obj);
		} catch (JsonProcessingException e) {
			throw new RuntimeException(e);
		}
	}
}
