package com.party.backbone.room;

import java.io.IOException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.dto.ScoreAggregationResult;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.server.AggregatedAdminMessage;
import com.party.backbone.websocket.message.server.AggregatedUserMessage;
import com.party.backbone.websocket.message.server.EndMessage;
import com.party.backbone.websocket.message.server.NextGameMessage;
import com.party.backbone.websocket.model.GameType;
import com.party.backbone.websocket.model.PlaceInfo;
import com.party.backbone.websocket.model.RankingInfo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoundAggregationService {
	private final RoomRedisRepository roomRepository;
	private final SessionRegistry sessionRegistry;
	private final ObjectMapper objectMapper;

	public void aggregateRound(String roomCode) throws IOException {
		ScoreAggregationResult aggregation = roomRepository.aggregateScores(roomCode);
		if (aggregation == null)
			return;

		Map<String, Integer> roundRanks = calculateRanks(aggregation.roundScoreMap());
		Map<String, Integer> overallRanks = calculateRanks(aggregation.totalScoreMap());

		sendUserMessages(roomCode, aggregation, roundRanks, overallRanks);
		sendAdminMessages(roomCode, aggregation, roundRanks, overallRanks);
	}

	private void sendUserMessages(String roomCode, ScoreAggregationResult aggregation,
		Map<String, Integer> roundRanks, Map<String, Integer> overallRanks) throws IOException {
		int currentRound = aggregation.currentRound();
		int totalRound = aggregation.totalRound();

		for (String userId : aggregation.roundScoreMap().keySet()) {
			int roundRank = roundRanks.get(userId);
			int overallRank = overallRanks.get(userId);
			String rankRecord = roomRepository.updateRankRecord(roomCode, userId, roundRank);

			int currentScore = aggregation.roundScoreMap().get(userId);
			int totalScore = aggregation.totalScoreMap().get(userId);

			AggregatedUserMessage message = new AggregatedUserMessage(
				currentRound, totalRound,
				aggregation.gameType(), currentScore,
				totalScore, rankRecord, roundRank, overallRank, ""
			);

			WebSocketSession session = sessionRegistry.get(userId);
			if (session == null || !session.isOpen()) {
				log.warn("[AggregatedUserMessage] session not available for user {}", userId);
				continue;
			}
			session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
			log.info("[AggregatedUserMessage] Sent to user {} (roundRank={}, totalScore={})",
				userId, roundRank, totalScore);
		}
	}

	private void sendAdminMessages(String roomCode, ScoreAggregationResult aggregation,
		Map<String, Integer> roundRanks, Map<String, Integer> overallRanks) throws IOException {
		int currentRound = aggregation.currentRound();
		int totalRound = aggregation.totalRound();

		List<RankingInfo> roundTop3 = buildTop3(aggregation.roundScoreMap(), roundRanks, aggregation.nicknameMap());
		List<RankingInfo> overallTop3 = buildTop3(aggregation.totalScoreMap(), overallRanks, aggregation.nicknameMap());
		String firstPlaceId = getFirstByRank(overallRanks);
		String lastPlaceId = getLastByRank(overallRanks);

		PlaceInfo firstPlaceInfo = new PlaceInfo(firstPlaceId, aggregation.nicknameMap().get(firstPlaceId), "");
		PlaceInfo lastPlaceInfo = new PlaceInfo(lastPlaceId, aggregation.nicknameMap().get(lastPlaceId), "");

		AggregatedAdminMessage aggregatedAdminMessage = new AggregatedAdminMessage(
			currentRound, totalRound,
			aggregation.gameType(), roundTop3, overallTop3,
			firstPlaceInfo, lastPlaceInfo
		);

		String administratorId = roomRepository.getAdministratorIdOfRoom(roomCode);
		WebSocketSession adminSession = sessionRegistry.get(administratorId);
		if (adminSession == null || !adminSession.isOpen()) {
			log.warn("[AggregatedAdminMessage] session not available for admin {}", administratorId);
			return;
		}

		adminSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(aggregatedAdminMessage)));
		log.info("[AggregatedAdminMessage] Sent to admin {} of room {} (round {}/{})",
			administratorId, roomCode, currentRound, totalRound);

		if (currentRound == totalRound) {
			roomRepository.endGame(roomCode);
			EndMessage endMessage = new EndMessage(overallTop3);
			adminSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(endMessage)));
			log.info("[EndMessage] Sent EndMessage to admin {} of room {} — totalRound={} completed",
				administratorId, roomCode, totalRound);
			return;
		}

		int nextRound = currentRound + 1;
		GameType nextGame = roomRepository.getGame(roomCode, nextRound);
		NextGameMessage nextGameMessage = new NextGameMessage(nextGame, nextRound);
		adminSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(nextGameMessage)));
		log.info("[NextGameMessage] Sent NextGameMessage to admin {} of room {} — nextRound={}, gameType={}",
			administratorId, roomCode, nextRound, nextGame);
	}

	private Map<String, Integer> calculateRanks(Map<String, ? extends Number> scoreMap) {
		var sorted = scoreMap.entrySet().stream()
			.sorted((a, b) -> Double.compare(b.getValue().doubleValue(), a.getValue().doubleValue()))
			.toList();

		Map<String, Integer> result = new HashMap<>();
		int rank = 1;
		int count = 0;
		double prevScore = Double.NaN;
		for (Map.Entry<String, ? extends Number> entry : sorted) {
			count++;
			double score = entry.getValue().doubleValue();
			if (Double.compare(score, prevScore) != 0) {
				rank = count;
				prevScore = score;
			}
			result.put(entry.getKey(), rank);
		}
		return result;
	}

	private List<RankingInfo> buildTop3(Map<String, ? extends Number> scoreMap,
		Map<String, Integer> rankMap,
		Map<String, String> nickMap) {
		return scoreMap.entrySet().stream()
			.sorted((a, b) -> Double.compare(b.getValue().doubleValue(), a.getValue().doubleValue()))
			.limit(3)
			.map(entry -> new RankingInfo(
				entry.getKey(),
				nickMap.get(entry.getKey()),
				entry.getValue().intValue(),
				rankMap.get(entry.getKey())
			))
			.toList();
	}

	private String getFirstByRank(Map<String, Integer> ranks) {
		return ranks.entrySet().stream()
			.min(Comparator.comparingInt(Map.Entry::getValue))
			.map(Map.Entry::getKey)
			.orElse(null);
	}

	private String getLastByRank(Map<String, Integer> ranks) {
		return ranks.entrySet().stream()
			.max(Comparator.comparingInt(Map.Entry::getValue))
			.map(Map.Entry::getKey)
			.orElse(null);
	}
}
