package com.party.backbone.room;

import java.util.List;
import java.util.Set;

import com.party.backbone.room.dto.RoundInfo;
import com.party.backbone.room.dto.ScoreAggregationResult;
import com.party.backbone.websocket.model.GameType;

public interface RoomRedisRepository {
	void createRoom(String roomCode, String administratorId);

	String generateUniqueRoomCode();

	void deleteRoom(String roomCode);

	void initializeRoom(String roomCode, List<GameType> games, int totalRound);

	boolean exists(String roomCode);

	void addPlayer(String roomCode, String userId, String nickname);

	List<String> getUserIds(String roomCode);

	String getAdministratorIdOfRoom(String roomCode);

	int getUserCount(String roomCode);

	RoundInfo startGame(String roomCode);

	void updateScore(String roomCode, String userId, int score);

	Set<String> getDueRooms(long currentTimeMillis, int limit);

	boolean removeRoomFromPending(String roomCode);

	ScoreAggregationResult aggregateScores(String roomCode);

	String updateRankRecord(String roomCode, String userId, int roundRank);

	GameType getGame(String roomCode, int round);

	void endGame(String roomCode);
}
