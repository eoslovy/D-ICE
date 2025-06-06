package com.gameydg.numberSurvivor.message;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.dto.RoundResultDto;
import com.gameydg.numberSurvivor.manager.NumberSurvivorManager;
import com.gameydg.numberSurvivor.session.GameSessionRegistry;
import com.gameydg.numberSurvivor.repository.RoomRedisRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 게임 메시지 서비스 - 게임 관련 메시지 송수신 담당
@Slf4j
@Service
@RequiredArgsConstructor
public class GameMessageService {
	private final GameSessionRegistry sessionRegistry;
	private final NumberSurvivorManager gameManager;
	private final RoomRedisRepository roomRedisRepository;

	// 메시지 브로드캐스트 (이제 비동기)
	public void broadcastMessageAsync(String roomCode, Object message) {
		try {
			sessionRegistry.broadcastMessage(roomCode, message);
		} catch (IOException e) {
			log.error("[메시지 서비스] 메시지 전송 중 오류 [방ID: {}]", roomCode, e);
		}
	}

	// 대기 중 메시지 전송
	public void sendWaitingMessage(String roomCode) throws IOException {
		Map<String, Object> message = Map.of(
			"type", "WAITING",
			"message", "다른 플레이어를 기다리는 중...",
			"currentPlayers", gameManager.getCurrentPlayerCount(roomCode)
		);
		sessionRegistry.broadcastMessage(roomCode, message);
	}

	// 대기 카운트다운 메시지 전송
	public void sendWaitingCountdownMessage(String roomCode, int timeLeft) throws IOException {
		Map<String, Object> message = Map.of(
			"type", "WAITING_COUNTDOWN",
			"timeLeft", timeLeft,
			"message", String.format("게임 시작까지 %d초 남았습니다.", timeLeft),
			"currentPlayers", gameManager.getCurrentPlayerCount(roomCode)
		);
		sessionRegistry.broadcastMessage(roomCode, message);
	}

	public void sendPrepareStartMessage(String roomCode, int prepareTime) throws IOException {
		Map<String, Object> message = Map.of(
			"type", "PREPARE_START",
			"message", "게임 시작 준비 중...",
			"timeLeft", prepareTime,
			"currentPlayers", gameManager.getCurrentPlayerCount(roomCode)
		);
		sessionRegistry.broadcastMessage(roomCode, message);
	}

	// 게임 준비 중 메시지 전송 (늦게 들어온 플레이어에게)
	public void sendPreparingMessage(WebSocketSession session, String roomCode) throws IOException {
		Map<String, Object> message = Map.of(
			"type", "GAME_PREPARING",
			"message", "게임 시작 준비 중입니다. 잠시 후 게임이 시작됩니다.",
			"currentPlayers", gameManager.getCurrentPlayerCount(roomCode)
		);
		sessionRegistry.sendMessage(session, message);
	}

	// 준비 카운트다운 메시지 전송
	public void sendPrepareCountdownMessage(String roomCode, int timeLeft) throws IOException {
		Map<String, Object> message = Map.of(
			"type", "PREPARE_COUNTDOWN",
			"timeLeft", timeLeft,
			"message", String.format("게임 시작까지 %d초 남았습니다.", timeLeft),
			"currentPlayers", gameManager.getCurrentPlayerCount(roomCode)
		);
		sessionRegistry.broadcastMessage(roomCode, message);
	}

	// 게임 진행 중 메시지 전송 (늦게 들어온 플레이어에게)
	public void sendGameInProgressMessage(WebSocketSession session) throws IOException {
		Map<String, Object> message = Map.of(
			"type", "GAME_IN_PROGRESS",
			"message", "게임이 이미 진행 중입니다. 다음 게임을 기다려주세요."
		);
		sessionRegistry.sendMessage(session, message);
	}

	// 게임 시작 메시지 생성
	public Map<String, Object> createGameStartMessage(String roomCode) {
		int currentRound = gameManager.getCurrentRounds().get(roomCode);
		int maxNumber = calculateMaxNumber(roomCode);
		int timeLimit = 10;

		long survivorCount = gameManager.getRooms().get(roomCode).stream()
			.filter(PlayerDto::isAlive)
			.count();

		log.info("[메시지 서비스] 라운드 시작 메시지 생성 [방ID: {}, 라운드: {}, 생존자: {}명, 최대숫자: {}]",
			roomCode, currentRound, survivorCount, maxNumber);

		Map<String, Boolean> playerStatuses = new HashMap<>();
		gameManager.getRooms().get(roomCode).forEach(player -> {
			playerStatuses.put(player.getUserId(), player.isAlive());
		});

		Map<String, Object> message = new HashMap<>();
		message.put("type", "ROUND_START");
		message.put("round", currentRound);
		message.put("timeLimit", timeLimit);
		message.put("maxNumber", maxNumber);
		message.put("resetEliminationStatus", true);
		message.put("playerStatuses", playerStatuses);

		return message;
	}

	// 게임 오버 메시지 전송
	public CompletableFuture<Void> sendGameOverMessage(String roomCode, boolean isTimeLimit) {
		List<PlayerDto> winners = gameManager.getWinners(roomCode);
		List<RoundResultDto> roundResults = gameManager.getRoundResults(roomCode);

		log.info("[메시지 서비스] 게임 종료 메시지 전송 [방ID: {}, 우승자: {}명, 시간제한종료: {}]",
			roomCode, winners.size(), isTimeLimit);

		roomRedisRepository.setAggregationTime(roomCode);
		Map<String, Object> gameOverMessage = new HashMap<>();
		gameOverMessage.put("type", "GAME_OVER");
		gameOverMessage.put("winners", winners);
		gameOverMessage.put("resetLocalStorage", true);
		gameOverMessage.put("isTimeLimit", isTimeLimit);
		gameOverMessage.put("roundResults", roundResults);

		return CompletableFuture.runAsync(() -> {
			try {
				// 메시지 전송
				sessionRegistry.broadcastMessage(roomCode, gameOverMessage);
				
				// 잠시 대기
				Thread.sleep(200);
				
				// 연결 종료
				sessionRegistry.closeConnections(roomCode);
				
			} catch (Exception e) {
				log.error("[메시지 서비스] 게임 종료 처리 중 오류 [방ID: {}]", roomCode, e);
				throw new CompletionException(e);
			}
		});
	}

	// 모든 플레이어가 죽었을 때 새 게임 메시지 전송
	public void sendAllPlayersRevivedMessage(String roomCode) throws IOException {
		Map<String, Object> message = createGameStartMessage(roomCode);
		message.put("allPlayersRevived", true);  // 전원 탈락 후 부활 플래그

		sessionRegistry.broadcastMessage(roomCode, message);
	}

	// 최대 숫자 계산
	private int calculateMaxNumber(String roomCode) {
		// 생존한 플레이어 수만 계산
		long survivorCount = gameManager.getRooms().get(roomCode).stream()
			.filter(PlayerDto::isAlive)
			.count();

		// 최소값은 1로 설정 (생존자가 없거나 계산 결과가 0이 되는 경우 방지)
		int maxNumber = (int)Math.round(survivorCount * 0.7);
		return Math.max(1, maxNumber);
	}
} 