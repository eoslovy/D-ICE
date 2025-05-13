package com.party.backbone.room;

import static com.party.backbone.room.util.RankingUtils.*;

import java.io.IOException;
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
	final RoomRedisRepository roomRepository;
	final SessionRegistry sessionRegistry;
	final ObjectMapper objectMapper;
	final int DEFAULT_RANKING_COUNT = 3;

	public void aggregateRound(String roomCode) throws IOException {
		ScoreAggregationResult aggregation = roomRepository.aggregateScores(roomCode);
		if (aggregation == null)
			return;

		List<Map.Entry<String, ? extends Number>> sortedRound = getSortedScoreEntries(aggregation.roundScoreMap());
		List<Map.Entry<String, ? extends Number>> sortedOverall = getSortedScoreEntries(aggregation.totalScoreMap());

		Map<String, Integer> roundRanks = calculateRanks(sortedRound);
		Map<String, Integer> overallRanks = calculateRanks(sortedOverall);
		Map<String, String> nicknameMap = aggregation.nicknameMap();

		List<RankingInfo> roundTop3 = buildTopK(sortedRound, roundRanks, nicknameMap, DEFAULT_RANKING_COUNT);
		List<RankingInfo> overallTop3 = buildTopK(sortedOverall, overallRanks, nicknameMap, DEFAULT_RANKING_COUNT);

		sendUserMessages(roomCode, aggregation, roundRanks, overallRanks, roundTop3, overallTop3);
		sendAdminMessages(roomCode, aggregation, sortedRound, sortedOverall, roundRanks, overallRanks, roundTop3,
			overallTop3);
	}

	private void sendUserMessages(String roomCode, ScoreAggregationResult aggregation,
		Map<String, Integer> roundRanks, Map<String, Integer> overallRanks, List<RankingInfo> roundTop3,
		List<RankingInfo> overallTop3) throws IOException {
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
				totalScore, rankRecord, roundRank, overallRank,
				roundTop3, overallTop3, ""
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
		List<Map.Entry<String, ? extends Number>> sortedRound,
		List<Map.Entry<String, ? extends Number>> sortedOverall,
		Map<String, Integer> roundRanks, Map<String, Integer> overallRanks, List<RankingInfo> roundTop3,
		List<RankingInfo> overallTop3) throws IOException {
		int currentRound = aggregation.currentRound();
		int totalRound = aggregation.totalRound();
		Map<String, String> nicknameMap = aggregation.nicknameMap();

		String firstPlaceId = getFirstByRank(roundRanks);
		String lastPlaceId = getLastByRank(roundRanks);

		// TODO: videoUrl 로직 구현 필요
		PlaceInfo firstPlaceInfo = new PlaceInfo(firstPlaceId, nicknameMap.get(firstPlaceId), "");
		PlaceInfo lastPlaceInfo = new PlaceInfo(lastPlaceId, nicknameMap.get(lastPlaceId), "");

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
			EndMessage endMessage = new EndMessage(
				buildAllRanking(sortedOverall, overallRanks, nicknameMap));
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
}
