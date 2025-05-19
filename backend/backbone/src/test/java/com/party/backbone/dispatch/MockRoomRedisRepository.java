package com.party.backbone.dispatch;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.room.dto.RoundInfo;
import com.party.backbone.room.dto.ScoreAggregationResult;
import com.party.backbone.websocket.message.server.CheckEndedAckMessage;
import com.party.backbone.websocket.model.GameType;
import com.party.backbone.websocket.model.RankingInfo;

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
	public void initializeRoom(String roomCode, List<GameType> games, int totalRound) {

	}

	// @Override public void initializeRoom(String roomCode, GameType gameType, int totalRound) {
	// }

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
	public RoundInfo startGame(String roomCode) {
		return null;
	}

	@Override
	public Boolean hasPlayer(String roomCode, String userId) {
		return null;
	}

	@Override
	public Boolean validateSubmit(String roomCode, GameType gameType) {
		return null;
	}

	@Override
	public CheckEndedAckMessage checkEnded(String roomCode, String userId) {
		return null;
	}

	@Override
	public void endGame(String roomCode) {

	}

	@Override
	public List<RankingInfo> getFinalResults(String roomCode) {
		return List.of();
	}

	@Override
	public Set<String> getDueRooms(long currentTimeMillis, int limit) {
		return Set.of();
	}

	@Override
	public boolean removeRoomFromPending(String roomCode) {
		return false;
	}

	@Override
	public ScoreAggregationResult aggregateScores(String roomCode) {
		return null;
	}

	@Override
	public String updateRankRecord(String roomCode, String userId, int roundRank) {
		return "";
	}

	@Override
	public GameType getGame(String roomCode, int round) {
		return null;
	}

	@Override
	public void updateScore(String roomCode, String userId, int score) {

	}

	public void setUserIds(List<String> userIds) {
		this.userIds = userIds;
	}

	public List<String> getUserIds(String roomCode) {
		return userIds;
	}
}
