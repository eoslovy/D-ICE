package com.party.backbone.room;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Repository;

import com.party.backbone.room.dto.FinalResult;
import com.party.backbone.room.dto.RoundInfo;
import com.party.backbone.room.dto.ScoreAggregationResult;
import com.party.backbone.room.model.RoomStateTTL;
import com.party.backbone.websocket.model.GameType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@Repository
public class RoomRedisRepositoryImpl implements RoomRedisRepository {
	private final Duration PLAYER_BASE_TTL = Duration.ofHours(2);
	// 룰렛, 설명, 카운트 다운 포함 대략 30초로 설정
	private final long DEFAULT_GAME_START_OFFSET = 30_000;
	private static final String PENDING_AGGREGATION_KEY = "pendingAggregationRooms";
	private static final double[] ROUND_MULTIPLIERS = new double[21];

	static {
		for (int i = 1; i < ROUND_MULTIPLIERS.length; i++) {
			ROUND_MULTIPLIERS[i] = Math.pow(1.05, i - 1);
		}
	}

	private final RedisTemplate<String, String> redisTemplate;

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
		List<String> keysToDelete = new ArrayList<>();
		keysToDelete.add(getRoomKey(roomCode));
		keysToDelete.add(getPlayerIdsKey(roomCode));
		keysToDelete.add(getAdministratorIdKey(roomCode));
		keysToDelete.add(getGamesKey(roomCode));

		int totalRound = Optional.ofNullable(redisTemplate.opsForList().size(getGamesKey(roomCode)))
			.map(Long::intValue)
			.orElse(0);

		for (int round = 1; round <= totalRound; round++) {
			keysToDelete.add(getRoundScoreKey(roomCode, round));
		}

		String playerIdsKey = getPlayerIdsKey(roomCode);
		Set<String> playerIds = redisTemplate.opsForSet().members(playerIdsKey);

		if (playerIds != null && !playerIds.isEmpty()) {
			for (String userId : playerIds) {
				keysToDelete.add(getPlayerKey(roomCode, userId));
			}
		}

		redisTemplate.delete(keysToDelete);
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
	public RoundInfo startGame(String roomCode) {
		String roomKey = getRoomKey(roomCode);
		Object roundObj = Objects.requireNonNull(
			redisTemplate.opsForHash().get(roomKey, "currentRound"),
			"Invalid Round"
		);

		Object stateObj = redisTemplate.opsForHash().get(roomKey, "state");
		if (stateObj == null || !RoomStateTTL.WAITING.name().equals(stateObj.toString())) {
			throw new IllegalStateException("[startGame] 현재 상태가 WAITING이 아닙니다: " + stateObj);
		}

		int currentRound = Integer.parseInt(roundObj.toString());
		GameType gameType = getGame(roomCode, currentRound);
		long currentMs = System.currentTimeMillis();
		long startAt = currentMs + DEFAULT_GAME_START_OFFSET;
		long duration = gameType.getDuration();
		long endAt = startAt + duration;

		redisTemplate.opsForHash().put(roomKey, "state", RoomStateTTL.PLAYING.name());
		redisTemplate.expire(roomKey, RoomStateTTL.PLAYING.getTtl());
		redisTemplate.opsForZSet().add(PENDING_AGGREGATION_KEY, roomCode, endAt);

		return new RoundInfo(gameType, startAt, duration, currentMs);
	}

	@Override
	public void updateScore(String roomCode, String userId, int score) {
		String playerKey = getPlayerKey(roomCode, userId);
		String roomKey = getRoomKey(roomCode);
		RoomStateTTL.valueOf((String)redisTemplate.opsForHash().get(roomKey, "state"));

		Object stateObj = redisTemplate.opsForHash().get(roomKey, "state");
		if (stateObj == null || !RoomStateTTL.PLAYING.name().equals(stateObj.toString())) {
			log.error("[updateScore] Room {} is not in PLAYING state. Skipping score update.", roomCode);
			throw new IllegalStateException("Room is not in PLAYING state");
		}

		Object roundObj = redisTemplate.opsForHash().get(roomKey, "currentRound");
		if (roundObj == null) {
			log.error("[updateScore] Missing currentRound for room {}", roomCode);
			return;
		}
		int currentRound = Integer.parseInt(roundObj.toString());

		redisTemplate.opsForHash().increment(playerKey, "score", score);

		String roundScoreKey = getRoundScoreKey(roomCode, currentRound);
		redisTemplate.opsForZSet().incrementScore(roundScoreKey, userId, score);
	}

	@Override
	public boolean exists(String roomCode) {
		return redisTemplate.hasKey("room:" + roomCode);
	}

	@Override
	public void addPlayer(String roomCode, String userId, String nickname) {
		String playerKey = getPlayerKey(roomCode, userId);
		String playerIdsKey = getPlayerIdsKey(roomCode);

		Map<String, String> playerData = Map.of(
			"userId", userId,
			"nickname", nickname,
			"score", "0",
			"rankRecord", ""
		);

		redisTemplate.opsForHash().putAll(playerKey, playerData);
		redisTemplate.expire(playerKey, PLAYER_BASE_TTL);

		redisTemplate.opsForSet().add(playerIdsKey, userId);
		redisTemplate.expire(playerIdsKey, PLAYER_BASE_TTL);

		redisTemplate.opsForHash().increment(getRoomKey(roomCode), "userCount", 1);
	}

	@Override
	public Boolean hasPlayer(String roomCode, String userId) {
		return redisTemplate.opsForSet().isMember(getPlayerIdsKey(roomCode), userId);
	}

	@Override
	public Boolean validateSubmit(String roomCode, GameType gameType) {
		String roomKey = getRoomKey(roomCode);
		int currentRound = Integer.parseInt(
			Objects.requireNonNull(redisTemplate.opsForHash().get(roomKey, "currentRound")).toString()
		);
		String gameTypeName = redisTemplate.opsForList().index(getGamesKey(roomCode), currentRound - 1);
		return Objects.requireNonNull(gameTypeName).equals(gameType.name());
	}

	@Override
	public Set<String> getDueRooms(long currentTimeMillis, int limit) {
		var rooms = redisTemplate.opsForZSet()
			.rangeByScoreWithScores(PENDING_AGGREGATION_KEY, 0, currentTimeMillis, 0, limit);
		if (rooms == null || rooms.isEmpty()) {
			return Set.of();
		}
		return rooms.stream().map(ZSetOperations.TypedTuple::getValue).collect(Collectors.toSet());
	}

	@Override
	public boolean removeRoomFromPending(String roomCode) {
		Long removedCount = redisTemplate.opsForZSet().remove(PENDING_AGGREGATION_KEY, roomCode);
		boolean success = removedCount != null && removedCount > 0;
		if (!success) {
			log.warn("[RoomRedis] Failed to remove {} from pending aggregation list (already removed or not found).",
				roomCode);
		}
		return success;
	}

	@Override
	public ScoreAggregationResult aggregateScores(String roomCode) {
		String roomKey = getRoomKey(roomCode);
		// 집계 시작 시 다음 라운드 넘어가는 걸로 처리
		redisTemplate.opsForHash().put(roomKey, "state", RoomStateTTL.WAITING.name());
		redisTemplate.expire(getRoomKey(roomKey), RoomStateTTL.WAITING.getTtl());

		int currentRound = Integer.parseInt(
			Objects.requireNonNull(redisTemplate.opsForHash().get(roomKey, "currentRound")).toString()
		);
		int totalRound = Integer.parseInt(
			Objects.requireNonNull(redisTemplate.opsForHash().get(roomKey, "totalRound")).toString()
		);
		String gameTypeName = redisTemplate.opsForList().index(getGamesKey(roomCode), currentRound - 1);
		GameType gameType = GameType.valueOf(gameTypeName);

		String roundScoreKey = roomKey + ":round:" + currentRound + ":scores";
		Set<ZSetOperations.TypedTuple<String>> roundScores =
			redisTemplate.opsForZSet().reverseRangeWithScores(roundScoreKey, 0, -1);

		Map<String, Integer> roundScoreMap = new HashMap<>();
		Map<String, Integer> totalScoreMap = new HashMap<>();
		Map<String, String> nicknameMap = new HashMap<>();
		Set<String> roundPlayers = new HashSet<>();
		if (roundScores != null) {
			for (ZSetOperations.TypedTuple<String> entry : roundScores) {
				String userId = entry.getValue();
				roundPlayers.add(userId);
				int roundScore = (int)Math.round(
					Objects.requireNonNull(entry.getScore()) * ROUND_MULTIPLIERS[currentRound]);

				roundScoreMap.put(userId, roundScore);

				String playerKey = getPlayerKey(roomCode, userId);
				int totalScore = Integer.parseInt(String.valueOf(redisTemplate.opsForHash().get(playerKey, "score")));
				String nickname = String.valueOf(redisTemplate.opsForHash().get(playerKey, "nickname"));

				totalScoreMap.put(userId, totalScore);
				nicknameMap.put(userId, nickname);
			}
		}
		List<String> userIds = getUserIds(roomCode);
		Set<String> unsubmittedPlayers = getUserIds(roomCode).stream()
			.filter(userId -> !roundPlayers.contains(userId))
			.collect(Collectors.toSet());

		for (String unsubmittedUserId : unsubmittedPlayers) {
			updateRankRecord(roomCode, unsubmittedUserId, 0);
		}

		redisTemplate.opsForHash().increment(roomKey, "currentRound", 1);
		return ScoreAggregationResult.builder()
			.currentRound(currentRound)
			.totalRound(totalRound)
			.gameType(gameType)
			.roundScoreMap(roundScoreMap)
			.totalScoreMap(totalScoreMap)
			.nicknameMap(nicknameMap)
			.roundPlayerCount(roundPlayers.size())
			.totalPlayerCount(userIds.size())
			.build();
	}

	@Override
	public String updateRankRecord(String roomCode, String userId, int roundRank) {
		String playerKey = getPlayerKey(roomCode, userId);

		String prevRankRecord = (String)redisTemplate.opsForHash().get(playerKey, "rankRecord");
		String updated = (prevRankRecord == null || prevRankRecord.isEmpty())
			? String.valueOf(roundRank)
			: prevRankRecord + "|" + roundRank;

		redisTemplate.opsForHash().put(playerKey, "rankRecord", updated);
		return updated;
	}

	@Override
	public List<FinalResult> getFinalResults(String roomCode) {
		List<String> userIds = getUserIds(roomCode);

		List<FinalResult> results = new ArrayList<>();
		for (String userId : userIds) {
			String playerKey = getPlayerKey(roomCode, userId);

			Object nicknameObj = redisTemplate.opsForHash().get(playerKey, "nickname");
			Object scoreObj = redisTemplate.opsForHash().get(playerKey, "score");

			if (nicknameObj == null || scoreObj == null) {
				log.warn("[getFinalResults] Missing data for userId: {}", userId);
				continue;
			}

			String nickname = nicknameObj.toString();
			int score = Integer.parseInt(scoreObj.toString());

			results.add(new FinalResult(userId, nickname, score));
		}

		return results;
	}

	@Override
	public void endGame(String roomCode) {
		String roomKey = getRoomKey(roomCode);
		redisTemplate.opsForHash().put(roomKey, "state", RoomStateTTL.ENDED.name());
		redisTemplate.expire(roomKey, RoomStateTTL.ENDED.getTtl());
	}

	@Override
	public GameType getGame(String roomCode, int round) {
		int roundIndex = round - 1;
		String gameTypeName = redisTemplate.opsForList().index(getGamesKey(roomCode), roundIndex);
		if (gameTypeName == null) {
			throw new IllegalStateException("No game type found at index " + roundIndex + " for room " + roomCode);
		}

		return GameType.valueOf(gameTypeName);
	}

	@Override
	public List<String> getUserIds(String roomCode) {
		String playerIdsKey = getPlayerIdsKey(roomCode);
		return Objects.requireNonNull(redisTemplate.opsForSet()
			.members(playerIdsKey)).stream().toList();
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

	private String getPlayerKey(String roomCode, String userId) {
		return getRoomKey(roomCode) + ":player:" + userId;
	}

	private String getPlayerIdsKey(String roomCode) {
		return getRoomKey(roomCode) + ":playerIds";
	}

	private String getAdministratorIdKey(String roomCode) {
		return getRoomKey(roomCode) + ":administratorId";
	}

	private String getGamesKey(String roomCode) {
		return getRoomKey(roomCode) + ":games";
	}

	private String getRoundScoreKey(String roomCode, int currentRound) {
		return getRoomKey(roomCode) + ":round:" + currentRound + ":scores";
	}
}
