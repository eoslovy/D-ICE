package com.gameydg.numberSurvivor.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import com.gameydg.numberSurvivor.dto.GameState;
import com.gameydg.numberSurvivor.dto.NumberSurvivorJoinDto;
import com.gameydg.numberSurvivor.dto.NumberSurvivorSelectDto;
import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.game.NumberSurvivorGameLogic;
import com.gameydg.numberSurvivor.manager.NumberSurvivorManager;
import com.gameydg.numberSurvivor.message.GameMessageService;
import com.gameydg.numberSurvivor.session.GameSessionRegistry;
import com.gameydg.numberSurvivor.timer.GameTimerListener;
import com.gameydg.numberSurvivor.timer.GameTimerManager;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 숫자 서바이버 서비스 구현체 - 서비스 API 제공 및 각 컴포넌트 연결
@Slf4j
@Service
@RequiredArgsConstructor
public class NumberSurvivorServiceImpl implements NumberSurvivorService, GameTimerListener {
	private final NumberSurvivorManager gameManager;
	private final GameSessionRegistry sessionRegistry;
	private final GameMessageService messageService;
	private final GameTimerManager timerManager;
	private final NumberSurvivorGameLogic gameLogic;

	// 비동기 작업을 위한 실행기
	private final ExecutorService executorService = Executors.newFixedThreadPool(5);

	@PostConstruct
	public void init() {
		timerManager.setTimerListener(this);
		log.info("[게임 서비스] 초기화 완료");
	}

	@PreDestroy
	public void shutdown() {
		log.info("[게임 서비스] 종료 시작");
		executorService.shutdown();
		try {
			if (!executorService.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)) {
				log.warn("[게임 서비스] ExecutorService가 정상적으로 종료되지 않아 강제 종료합니다.");
				executorService.shutdownNow();
			}
		} catch (InterruptedException e) {
			log.error("[게임 서비스] ExecutorService 종료 중 인터럽트 발생", e);
			executorService.shutdownNow();
			Thread.currentThread().interrupt();
		}
		log.info("[게임 서비스] 종료 완료");
	}

	@Override
	public void handleJoin(WebSocketSession session, NumberSurvivorJoinDto joinDto) throws IOException {
		// 세션 등록
		sessionRegistry.registerSession(joinDto.getUserId(), session);

		// 플레이어 생성
		PlayerDto player = PlayerDto.builder()
			.userId(joinDto.getUserId())
			.nickname(joinDto.getNickname())
			.alive(true)
			.build();

		String roomCode = joinDto.getRoomCode();

		// 현재 방의 플레이어 수 확인 - 첫 플레이어인지 확인용
		int beforeJoinCount = gameManager.getCurrentPlayerCount(roomCode);

		// 게임 매니저에 플레이어 등록
		gameManager.joinRoom(roomCode, player);

		// 게임 시작 여부 초기화
		timerManager.getGameStarted().putIfAbsent(roomCode, false);

		// 방에 첫 플레이어가 들어온 경우 또는 게임 상태가 없는 경우 타이머 항상 초기화
		if (beforeJoinCount == 0 || !timerManager.getGameStates().containsKey(roomCode)) {
			// 타이머 초기화
			timerManager.initRoomTimer(roomCode, GameState.WAITING, GameTimerManager.WAITING_TIME);
			// log.info("[게임 서비스] 첫 플레이어 입장으로 타이머 초기화 [방ID: {}, 대기시간: {}초]", roomCode, GameTimerManager.WAITING_TIME);
		}

		// 게임 상태 불일치 확인 및 수정 - PLAYING 상태인데 gameStarted가 false인 경우 수정
		GameState currentState = timerManager.getGameStates().get(roomCode);
		boolean isStarted = timerManager.getGameStarted().getOrDefault(roomCode, false);

		if (currentState == GameState.PLAYING && !isStarted) {
			// log.info("[게임 서비스] 게임 상태 불일치 수정 [방ID: {}, 상태: PLAYING, 시작여부: false → true]", roomCode);
			timerManager.setGameStarted(roomCode, true);
		}

		// log.info("[게임 서비스] 플레이어 입장 [방ID: {}, 게임상태: {}, 게임시작여부: {}]",
		//	roomCode, timerManager.getGameStates().get(roomCode), timerManager.getGameStarted().get(roomCode));

		// 게임 상태에 따라 메시지 전송 (비동기)
		sendJoinResponseMessage(session, roomCode);

		// 방 정보와 참여 유저 로깅
		// sessionRegistry.logRoomStatus(roomCode);
	}

	// 입장 응답 메시지 전송
	private void sendJoinResponseMessage(WebSocketSession session, String roomCode) {
		executorService.submit(() -> {
			try {
				// 게임 상태와 시작 여부를 함께 검사
				GameState state = timerManager.getGameStates().get(roomCode);
				boolean gameStartStatus = timerManager.getGameStarted().getOrDefault(roomCode, false);

				if (state == GameState.PLAYING && gameStartStatus) {
					// 게임이 진행 중인 경우
					messageService.sendGameInProgressMessage(session);
				} else if (state == GameState.PREPARING) {
					// 준비 상태인 경우
					messageService.sendPreparingMessage(session, roomCode);
				} else {
					// 대기 상태이거나 다른 상태인 경우
					messageService.sendWaitingMessage(roomCode);
				}
			} catch (IOException e) {
				log.error("[게임 서비스] 메시지 전송 실패 [방ID: {}]", roomCode, e);
			}
		});
	}

	@Override
	public void handleStart(String roomCode) throws IOException {
		// 게임 로직에 시작 처리 위임
		gameLogic.startGame(roomCode);
	}

	@Override
	public void handleSelect(WebSocketSession session, NumberSurvivorSelectDto selectDto) throws IOException {
		// 게임 로직에 선택 처리 위임 (비동기)
		executorService.submit(() -> {
			gameLogic.processPlayerSelection(selectDto);
		});
	}

	// 플레이어 연결 종료 처리
	@Override
	public void handleDisconnect(String sessionId) {
		// log.info("[게임 서비스] 연결 종료 처리 [세션ID: {}]", sessionId);

		// 세션 ID로 사용자 ID 찾기
		String userId = sessionRegistry.getUserIdBySessionId(sessionId);
		if (userId == null) {
			// log.warn("[게임 서비스] 연결 종료된 세션에 대한 사용자 ID를 찾을 수 없음 [세션ID: {}]", sessionId);
			return;
		}

		// 사용자 세션 해제
		sessionRegistry.unregisterSession(userId, sessionId);

		// 사용자가 있던 방 찾기
		String roomCode = sessionRegistry.getRoomCodeByUserId(userId);
		if (roomCode != null) {
			// 연결 종료된 플레이어 자동 탈락 처리
			PlayerDto player = gameManager.findPlayer(roomCode, userId);
			if (player != null && player.isAlive()) {
				// log.info("[게임 서비스] 연결 종료된 플레이어 자동 탈락 [방ID: {}, 사용자ID: {}, 닉네임: {}]",
				//	roomCode, userId, player.getNickname());
				player.setAlive(false);

				// 방에서 플레이어 제거
				boolean removed = gameManager.leaveRoom(roomCode, userId);
				// log.info("[게임 서비스] 플레이어 방 퇴장 [방ID: {}, 사용자ID: {}, 제거 성공: {}]",
				//	roomCode, userId, removed);

				// 방의 로그 상태 기록
				// sessionRegistry.logRoomStatus(roomCode);

				// 게임이 진행 중이고 선택 대기 중이었다면, 현재 선택 상태 확인
				if (timerManager.getGameStates().get(roomCode) == GameState.PLAYING &&
					timerManager.getGameStarted().getOrDefault(roomCode, true)) {

					// 모든 생존 플레이어가 선택을 완료했는지 확인
					boolean allSelected = gameManager.getRooms().get(roomCode).stream()
						.filter(PlayerDto::isAlive)
						.allMatch(p -> p.getSelectedNumber() != null);

					// log.info("[게임 서비스] 연결 종료 후 선택 상태 확인 [방ID: {}, 모두 선택 완료: {}]",
					//	roomCode, allSelected);

					// 모든 생존 플레이어가 선택을 완료했다면 라운드 결과 처리 시작
					if (allSelected) {
						log.info("[게임 서비스] 모든 생존 플레이어 선택 완료로 라운드 결과 처리 [방ID: {}]", roomCode);
						try {
							// 라운드 결과 처리를 위해 선택 데이터가 아닌 라운드 진행 메소드 직접 호출
							gameLogic.processRoundAsync(roomCode);
						} catch (Exception e) {
							log.error("[게임 서비스] 라운드 처리 중 오류 [방ID: {}]", roomCode, e);
						}
					}
				}

				// 방이 비었는지 확인
				checkRoomEmpty(roomCode);
			}
		}
	}

	// GameTimerListener 구현 메서드들
	@Override
	public void onWaitingCountdown(String roomCode, int timeLeft) {
		try {
			messageService.sendWaitingCountdownMessage(roomCode, timeLeft);
			if (timeLeft == 0) {
				// log.info("[게임 서비스] 대기 시간 종료 [방ID: {}]", roomCode);
			}
		} catch (IOException e) {
			log.error("[게임 서비스] 대기 카운트다운 메시지 전송 실패 [방ID: {}]", roomCode, e);
		}
	}

	@Override
	public void onPrepareStart(String roomCode) {
		log.info("[게임 서비스] 게임 준비 시작 [방ID: {}]", roomCode);

		// === 인원 체크 후 즉시 우승 처리 분기 ===
		int playerCount = gameManager.getCurrentPlayerCount(roomCode);
		if (playerCount <= 2) {
			log.info("[게임 서비스] 플레이어가 2명 이하이므로 즉시 게임 종료 처리 [방ID: {}, 인원: {}]", roomCode, playerCount);
			// 모든 플레이어를 우승자로 alive=true로 세팅
			gameManager.getRooms().get(roomCode).forEach(player -> player.setAlive(true));
			try {
				// 기존 게임 종료 처리 로직 호출 (isTimeLimit=false)
				gameLogic.finishGame(roomCode, false);
			} catch (IOException e) {
				log.error("[게임 서비스] 즉시 게임 종료 처리 중 오류 [방ID: {}]", roomCode, e);
			}
			return;
		}

		// 게임 제한시간은 기본값(1분) 사용
		gameManager.startGame(roomCode);
	}

	@Override
	public void onPrepareCountdown(String roomCode, int timeLeft) {
		try {
			messageService.sendPrepareCountdownMessage(roomCode, timeLeft);
			if (timeLeft == 0) {
				log.info("[게임 서비스] 준비 시간 종료 [방ID: {}]", roomCode);
			}
		} catch (IOException e) {
			log.error("[게임 서비스] 준비 카운트다운 메시지 전송 실패 [방ID: {}]", roomCode, e);
		}
	}

	@Override
	public void onGameStart(String roomCode) {
		log.info("[게임 서비스] 게임 시작 [방ID: {}]", roomCode);
		gameLogic.startGame(roomCode);
	}

	// 빈 방 처리 로직
	private void checkRoomEmpty(String roomCode) {
		// 방의 모든 세션이 종료되었는지 확인
		boolean isRoomEmpty = sessionRegistry.isRoomEmpty(roomCode);
		log.info("방 빔 여부 확인 [방ID: {}, 빔: {}]", roomCode, isRoomEmpty);

		if (isRoomEmpty) {
			log.info("[게임 서비스] 빈 방 정리 시작 [방ID: {}]", roomCode);

			// 게임 상태 정리
			timerManager.setGameState(roomCode, GameState.WAITING);
			timerManager.setGameStarted(roomCode, false);

			// 타이머 정리 및 맵에서 완전히 제거
			timerManager.removeRoomTimer(roomCode);

			// 게임 상태, 시작 여부 맵에서도 제거
			timerManager.getGameStates().remove(roomCode);
			timerManager.getGameStarted().remove(roomCode);

			// 게임 데이터 정리
			gameLogic.cleanupGameData(roomCode);

			// 게임 매니저의 방 관련 데이터 정리
			if (gameManager.getRooms().containsKey(roomCode)) {
				gameManager.getRooms().remove(roomCode);
			}
			if (gameManager.getCurrentRounds().containsKey(roomCode)) {
				gameManager.getCurrentRounds().remove(roomCode);
			}
			if (gameManager.getRoundSelections().containsKey(roomCode)) {
				gameManager.getRoundSelections().remove(roomCode);
			}
			if (gameManager.getGameStartTimes().containsKey(roomCode)) {
				gameManager.getGameStartTimes().remove(roomCode);
			}
			if (gameManager.getGameDurationLimits().containsKey(roomCode)) {
				gameManager.getGameDurationLimits().remove(roomCode);
			}
			if (gameManager.getRoundStartTimes().containsKey(roomCode)) {
				gameManager.getRoundStartTimes().remove(roomCode);
			}

			log.info("[게임 서비스] 빈 방 정리 완료 [방ID: {}]", roomCode);
		} else {
			// 방이 비어있지 않은 경우 남은 플레이어 수 확인
			int remainingPlayers = gameManager.getCurrentPlayerCount(roomCode);
			
			// 안전한 방식으로 생존자 수 계산
			long alivePlayers = 0;
			if (gameManager.getRooms().containsKey(roomCode)) {
				Set<PlayerDto> players = gameManager.getRooms().get(roomCode);
				if (players != null) {
					// 동시성 문제를 피하기 위해 복사본 생성 후 처리
					alivePlayers = new ArrayList<>(players).stream()
						.filter(PlayerDto::isAlive)
						.count();
				}
			}

			log.info("[게임 서비스] 방 상태 [방ID: {}, 총인원: {}명, 생존자: {}명]",
				roomCode, remainingPlayers, alivePlayers);

			// 게임 중이고 생존자가 2명 이하라면 게임 종료 처리
			if (timerManager.getGameStates().get(roomCode) == GameState.PLAYING &&
				timerManager.getGameStarted().getOrDefault(roomCode, false) &&
				alivePlayers <= 2) {

				log.info("[게임 서비스] 생존자가 2명 이하로 게임 종료 처리 [방ID: {}, 생존자: {}명]", roomCode, alivePlayers);
				try {
					gameLogic.finishGame(roomCode, false);
				} catch (IOException e) {
					log.error("[게임 서비스] 게임 종료 처리 중 오류 [방ID: {}]", roomCode, e);
				}
			}
		}
	}
}