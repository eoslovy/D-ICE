package com.gameydg.numberSurvivor.message;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.manager.NumberSurvivorManager;
import com.gameydg.numberSurvivor.session.GameSessionRegistry;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 게임 메시지 서비스 - 게임 관련 메시지 송수신 담당
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GameMessageService {
    private final GameSessionRegistry sessionRegistry;
    private final NumberSurvivorManager gameManager;
    
    // 비동기 작업을 위한 실행기 - I/O 작업 처리용
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    
    // 리소스 정리
    @PreDestroy
    public void shutdown() {
        log.info("게임 메시지 서비스 종료 중...");
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("게임 메시지 서비스 종료 완료");
    }
    
    /**
     * 비동기로 메시지 브로드캐스트
     * @param roomId 방 ID
     * @param message 전송할 메시지
     */
    public void broadcastMessageAsync(String roomId, Object message) {
        log.info("비동기 브로드캐스트 호출 [방ID: {}, 스레드: {}]", roomId, Thread.currentThread().getName());
        
        executorService.submit(() -> {
            log.info("비동기 브로드캐스트 실행 [방ID: {}, 스레드: {}]", roomId, Thread.currentThread().getName());
            try {
                sessionRegistry.broadcastMessage(roomId, message);
            } catch (IOException e) {
                log.error("비동기 메시지 전송 중 오류", e);
            }
        });
    }
    
    /**
     * 대기 중 메시지 전송
     * @param roomId 방 ID
     * @throws IOException 메시지 전송 실패시
     */
    public void sendWaitingMessage(String roomId) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "WAITING",
            "message", "다른 플레이어를 기다리는 중...",
            "currentPlayers", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
    }
    
    /**
     * 대기 카운트다운 메시지 전송
     * @param roomId 방 ID
     * @param timeLeft 남은 시간
     * @throws IOException 메시지 전송 실패시
     */
    public void sendWaitingCountdownMessage(String roomId, int timeLeft) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "WAITING_COUNTDOWN",
            "message", "다른 플레이어를 기다리는 중...",
            "timeLeft", timeLeft,
            "currentPlayers", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
    }
    
    /**
     * 게임 준비 시작 메시지 전송
     * @param roomId 방 ID
     * @param prepareTime 준비 시간
     * @throws IOException 메시지 전송 실패시
     */
    public void sendPrepareStartMessage(String roomId, int prepareTime) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "PREPARE_START",
            "message", "게임 시작 준비 중...",
            "timeLeft", prepareTime,
            "playerCount", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
    }
    
    /**
     * 게임 준비 카운트다운 메시지 전송
     * @param roomId 방 ID
     * @param timeLeft 남은 시간
     * @throws IOException 메시지 전송 실패시
     */
    public void sendPrepareCountdownMessage(String roomId, int timeLeft) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "PREPARE_COUNTDOWN",
            "message", "게임이 곧 시작됩니다!",
            "timeLeft", timeLeft,
            "playerCount", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
    }
    
    /**
     * 게임 준비 중 메시지 전송 (늦게 들어온 플레이어에게)
     * @param session 웹소켓 세션
     * @param roomId 방 ID
     * @throws IOException 메시지 전송 실패시
     */
    public void sendPreparingMessage(WebSocketSession session, String roomId) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "GAME_PREPARING",
            "message", "게임 시작 준비 중입니다. 잠시 후 게임이 시작됩니다.",
            "playerCount", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.sendMessage(session, message);
    }
    
    /**
     * 게임 진행 중 메시지 전송 (늦게 들어온 플레이어에게)
     * @param session 웹소켓 세션
     * @throws IOException 메시지 전송 실패시
     */
    public void sendGameInProgressMessage(WebSocketSession session) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "GAME_IN_PROGRESS",
            "message", "게임이 이미 진행 중입니다. 다음 게임을 기다려주세요."
        );
        sessionRegistry.sendMessage(session, message);
    }
    
    /**
     * 게임 시작 메시지 생성
     * @param roomId 방 ID
     * @return 게임 시작 메시지
     */
    public Map<String, Object> createGameStartMessage(String roomId) {
        int currentRound = gameManager.getCurrentRounds().get(roomId);
        int maxNumber = calculateMaxNumber(roomId);
        int timeLimit = 10;
        
        // 생존 플레이어 수와 최대 숫자 로깅 추가
        long survivorCount = gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .count();
        
        log.info("라운드 시작 메시지 생성 [방ID: {}, 라운드: {}, 제한시간: {}, 최대숫자: {}, 생존자: {}명, 계산식: {}*0.7={}]", 
                roomId, currentRound, timeLimit, maxNumber, survivorCount, survivorCount, survivorCount * 0.7);
        
        // 모든 플레이어 상태 로깅
        String playerStatus = gameManager.getRooms().get(roomId).stream()
                .map(p -> String.format("%s(alive=%s)", p.getNickname(), p.isAlive()))
                .collect(Collectors.joining(", "));
        log.info("라운드 시작 시 플레이어 상태 [방ID: {}, 라운드: {}, 플레이어: {}]", 
                roomId, currentRound, playerStatus);
        
        // 모든 플레이어의 생존 상태 맵 생성
        Map<String, Boolean> playerStatuses = new HashMap<>();
        gameManager.getRooms().get(roomId).forEach(player -> {
            playerStatuses.put(player.getUserId(), player.isAlive());
        });
        
        // Map.of는 최대 10개 요소만 지원하므로 HashMap 사용
        Map<String, Object> message = new HashMap<>();
        message.put("type", "ROUND_START");
        message.put("round", currentRound);
        message.put("timeLimit", timeLimit);
        message.put("maxNumber", maxNumber);
        message.put("resetEliminationStatus", true);  // 라운드 시작 시 탈락 상태 초기화
        message.put("playerStatuses", playerStatuses);  // 모든 플레이어의 생존 상태
        
        return message;
    }
    
    /**
     * 게임 오버 메시지 전송
     * @param roomId 방 ID
     * @param isTimeLimit 시간 제한으로 인한 종료 여부
     * @throws IOException 메시지 전송 실패시
     */
    public void sendGameOverMessage(String roomId, boolean isTimeLimit) throws IOException {
        List<PlayerDto> winners = gameManager.getWinners(roomId);
        log.info("게임 우승자 [방ID: {}, 우승자: {}, 시간제한종료: {}]", 
                roomId, 
                winners.stream().map(PlayerDto::getNickname).collect(Collectors.joining(", ")),
                isTimeLimit);
        
        // 로컬스토리지 초기화 플래그와 웹소켓 연결 종료 신호를 포함하여 게임 오버 메시지 전송
        Map<String, Object> gameOverMessage = new HashMap<>();
        gameOverMessage.put("type", "GAME_OVER");
        gameOverMessage.put("winners", winners);
        gameOverMessage.put("resetLocalStorage", true);
        gameOverMessage.put("closeConnection", true);  // 클라이언트가 웹소켓 연결을 종료하도록 신호
        gameOverMessage.put("isTimeLimit", isTimeLimit);  // 시간 제한으로 인한 종료 여부
        
        // 비동기로 메시지 전송
        executorService.submit(() -> {
            try {
                log.info("게임 종료 메시지 비동기 전송 [방ID: {}, 스레드: {}, 시간제한종료: {}]", 
                        roomId, Thread.currentThread().getName(), isTimeLimit);
                sessionRegistry.broadcastMessage(roomId, gameOverMessage);
            } catch (Exception e) {
                log.error("게임 종료 메시지 전송 중 오류 [방ID: {}]", roomId, e);
            }
        });
    }
    
    /**
     * 게임 오버 메시지 전송 (기존 메서드와의 호환성을 위한 오버로딩)
     * @param roomId 방 ID
     * @throws IOException 메시지 전송 실패시
     */
    public void sendGameOverMessage(String roomId) throws IOException {
        sendGameOverMessage(roomId, false);
    }
    
    /**
     * 모든 플레이어가 죽었을 때 새 게임 메시지 전송
     * @param roomId 방 ID
     * @throws IOException 메시지 전송 실패시
     */
    public void sendAllPlayersRevivedMessage(String roomId) throws IOException {
        Map<String, Object> message = createGameStartMessage(roomId);
        message.put("allPlayersRevived", true);  // 전원 탈락 후 부활 플래그
        
        sessionRegistry.broadcastMessage(roomId, message);
    }
    
    /**
     * 최대 숫자 계산
     * @param roomId 방 ID
     * @return 최대 숫자
     */
    private int calculateMaxNumber(String roomId) {
        // 생존한 플레이어 수만 계산
        long survivorCount = gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .count();
        
        // 최소값은 1로 설정 (생존자가 없거나 계산 결과가 0이 되는 경우 방지)
        int maxNumber = (int) Math.ceil(survivorCount * 0.7);
        return Math.max(1, maxNumber);
    }
} 