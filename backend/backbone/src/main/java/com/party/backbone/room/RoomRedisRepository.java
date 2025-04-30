package com.party.backbone.room;

import java.util.List;
import java.util.Set;

import com.party.backbone.websocket.model.GameType;

public interface RoomRedisRepository {
	void createRoom(String roomCode, String administratorId);

	String generateUniqueRoomCode();

	void deleteRoom(String roomCode);

	void initializeRoom(String roomCode, GameType gameType, int totalRound);

	boolean exists(String roomCode);

	void addPlayer(String roomCode, String userId, String nickname);

	List<String> getUserIds(String roomCode);

	String getAdministratorIdOfRoom(String roomCode);

	int getUserCount(String roomCode);

	Set<GameType> getPlayedGames(String roomCode);
}
