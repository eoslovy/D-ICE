package com.party.backbone.room;

import static com.party.backbone.room.util.RankingUtils.*;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.dto.ScoreAggregationResult;
import com.party.backbone.util.MinioClientUtil;
import com.party.backbone.websocket.handler.SessionRegistry;
import com.party.backbone.websocket.message.server.AggregatedAdminMessage;
import com.party.backbone.websocket.message.server.AggregatedUserMessage;
import com.party.backbone.websocket.message.server.EndMessage;
import com.party.backbone.websocket.message.server.NextGameMessage;
import com.party.backbone.websocket.model.GameType;
import com.party.backbone.websocket.model.PlaceInfo;
import com.party.backbone.websocket.model.RankingInfo;

import io.minio.errors.ErrorResponseException;
import io.minio.errors.InsufficientDataException;
import io.minio.errors.InternalException;
import io.minio.errors.InvalidResponseException;
import io.minio.errors.ServerException;
import io.minio.errors.XmlParserException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoundAggregationService {
	private final RoomRedisRepository roomRepository;
	private final SessionRegistry sessionRegistry;
	private final ObjectMapper objectMapper;
	private final MinioClientUtil minioClientUtil;
	final int DEFAULT_RANKING_COUNT = 3;

	public void aggregateRound(String roomCode) throws
		IOException,
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		ScoreAggregationResult aggregation = roomRepository.aggregateScores(roomCode);
		if (aggregation == null)
			return;

		List<Map.Entry<String, ? extends Number>> sortedRoundScores = getSortedScoreEntries(
			aggregation.roundScoreMap());
		List<Map.Entry<String, ? extends Number>> sortedOverallScores = getSortedScoreEntries(
			aggregation.totalScoreMap());

		Map<String, Integer> roundRanks = calculateRanks(sortedRoundScores);
		Map<String, Integer> overallRanks = calculateRanks(sortedOverallScores);
		Map<String, String> nicknameMap = aggregation.nicknameMap();

		List<RankingInfo> roundTop3 = buildTopK(sortedRoundScores, roundRanks, nicknameMap, DEFAULT_RANKING_COUNT);
		List<RankingInfo> overallTop3 = buildTopK(sortedOverallScores, overallRanks, nicknameMap,
			DEFAULT_RANKING_COUNT);

		sendUserMessages(roomCode, aggregation, roundRanks, overallRanks, roundTop3, overallTop3);
		sendAdminMessages(roomCode, aggregation, roundRanks, overallRanks, roundTop3, overallTop3);
	}

	private void sendUserMessages(String roomCode, ScoreAggregationResult aggregation,
		Map<String, Integer> roundRanks, Map<String, Integer> overallRanks, List<RankingInfo> roundTop3,
		List<RankingInfo> overallTop3) throws
		IOException,
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		int currentRound = aggregation.currentRound();
		int totalRound = aggregation.totalRound();

		int maxRoundRank = roundRanks.values().stream().max(Integer::compare).orElse(1);

		for (String userId : aggregation.roundScoreMap().keySet()) {
			int roundRank = roundRanks.get(userId);
			int overallRank = overallRanks.get(userId);
			String rankRecord = roomRepository.updateRankRecord(roomCode, userId, roundRank);

			int currentScore = aggregation.roundScoreMap().get(userId);
			int totalScore = aggregation.totalScoreMap().get(userId);

			AggregatedUserMessage message = AggregatedUserMessage.builder()
				.currentRound(currentRound)
				.totalRound(totalRound)
				.roundPlayerCount(aggregation.roundPlayerCount())
				.totalPlayerCount(aggregation.totalPlayerCount())
				.gameType(aggregation.gameType())
				.currentScore(currentScore)
				.totalScore(totalScore)
				.rankRecord(rankRecord)
				.roundRank(roundRank)
				.overallRank(overallRank)
				.roundRanking(roundTop3)
				.overallRanking(overallTop3)
				.videoUploadUrl((roundRank == 1 || roundRank == maxRoundRank) ?
					minioClientUtil.newPutPresignedUrl(roomCode, currentRound, userId) : "")
				.build();

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
		Map<String, Integer> roundRanks, Map<String, Integer> overallRanks, List<RankingInfo> roundTop3,
		List<RankingInfo> overallTop3) throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		int currentRound = aggregation.currentRound();
		int totalRound = aggregation.totalRound();
		Map<String, String> nicknameMap = aggregation.nicknameMap();

		String firstPlaceId = getFirstByRank(roundRanks);
		String lastPlaceId = getLastByRank(roundRanks);

		PlaceInfo firstPlaceInfo = new PlaceInfo(firstPlaceId, nicknameMap.get(firstPlaceId),
			minioClientUtil.newGetPresignedUrl(roomCode, currentRound, firstPlaceId));
		PlaceInfo lastPlaceInfo = new PlaceInfo(lastPlaceId, nicknameMap.get(lastPlaceId),
			minioClientUtil.newGetPresignedUrl(roomCode, currentRound, lastPlaceId));

		AggregatedAdminMessage aggregatedAdminMessage = new AggregatedAdminMessage(
			currentRound, totalRound,
			aggregation.roundPlayerCount(), aggregation.totalPlayerCount(),
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
			var finalResults = roomRepository.getFinalResults(roomCode);
			roomRepository.endGame(roomCode);
			EndMessage endMessage = new EndMessage(calculateFinalRanks(finalResults));
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
