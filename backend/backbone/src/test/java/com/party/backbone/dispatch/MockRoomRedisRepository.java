package com.party.backbone.dispatch;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.model.GameType;

public class MockRoomRedisRepository implements RoomRedisRepository {

	private List<String> userIds = new ArrayList<>();

	@Override
	public void createRoom(String roomCode, String administratorId) {

	}

	@Override
	public String generateUniqueRoomCode() {
		return "";
	}

	@Override
	public void deleteRoom(String roomCode) {

	}

	@Override
	public void initializeRoom(String roomCode, GameType gameType) {
		
	}

	@Override
	public boolean exists(String roomCode) {
		return false;
	}

	@Override
	public void addPlayer(String roomCode, String userId, String nickname) {

	}

	@Override
	public String getAdministratorIdOfRoom(String roomCode) {
		return "";
	}

	@Override
	public int getUserCount(String roomCode) {
		return 0;
	}

	@Override
	public Set<GameType> getPlayedGames(String roomCode) {
		return Set.of();
	}

	public void setUserIds(List<String> userIds) {
		this.userIds = userIds;
	}

	public List<String> getUserIds(String roomCode) {
		return userIds;
	}
}
