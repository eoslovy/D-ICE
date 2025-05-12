package com.gameydg.numberSurvivor.message;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.WebSocketSession;

import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.manager.NumberSurvivorManager;
import com.gameydg.numberSurvivor.session.GameSessionRegistry;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 게임 메시지 서비스 - 게임 관련 메시지 송수신 담당
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
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("[메시지 서비스] 종료 완료");
    }

    // 비동기로 메시지 브로드캐스트
    public void broadcastMessageAsync(String roomId, Object message) {
        executorService.submit(() -> {
            try {
                sessionRegistry.broadcastMessage(roomId, message);
            } catch (IOException e) {
                log.error("[메시지 서비스] 메시지 전송 중 오류 [방ID: {}]", roomId, e);
            }
        });
    }
    
    // 대기 중 메시지 전송
    public void sendWaitingMessage(String roomId) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "WAITING",
            "message", "다른 플레이어를 기다리는 중...",
            "currentPlayers", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
    }

    // 대기 카운트다운 메시지 전송
    public void sendWaitingCountdownMessage(String roomId, int timeLeft) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "WAITING_COUNTDOWN",
            "timeLeft", timeLeft,
            "message", String.format("게임 시작까지 %d초 남았습니다.", timeLeft),
            "currentPlayers", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
    }

    public void sendPrepareStartMessage(String roomId, int prepareTime) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "PREPARE_START",
            "message", "게임 시작 준비 중...",
            "timeLeft", prepareTime,
            "currentPlayers", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
    }

    // 게임 준비 중 메시지 전송 (늦게 들어온 플레이어에게)
    public void sendPreparingMessage(WebSocketSession session, String roomId) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "GAME_PREPARING",
            "message", "게임 시작 준비 중입니다. 잠시 후 게임이 시작됩니다.",
            "currentPlayers", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.sendMessage(session, message);
    }

    // 준비 카운트다운 메시지 전송
    public void sendPrepareCountdownMessage(String roomId, int timeLeft) throws IOException {
        Map<String, Object> message = Map.of(
            "type", "PREPARE_COUNTDOWN",
            "timeLeft", timeLeft,
            "message", String.format("게임 시작까지 %d초 남았습니다.", timeLeft),
            "currentPlayers", gameManager.getCurrentPlayerCount(roomId)
        );
        sessionRegistry.broadcastMessage(roomId, message);
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
    public Map<String, Object> createGameStartMessage(String roomId) {
        int currentRound = gameManager.getCurrentRounds().get(roomId);
        int maxNumber = calculateMaxNumber(roomId);
        int timeLimit = 10;
        
        long survivorCount = gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .count();
        
        log.info("[메시지 서비스] 라운드 시작 메시지 생성 [방ID: {}, 라운드: {}, 생존자: {}명, 최대숫자: {}]", 
                roomId, currentRound, survivorCount, maxNumber);
        
        Map<String, Boolean> playerStatuses = new HashMap<>();
        gameManager.getRooms().get(roomId).forEach(player -> {
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
    public void sendGameOverMessage(String roomId, boolean isTimeLimit) throws IOException {
        List<PlayerDto> winners = gameManager.getWinners(roomId);
        log.info("[메시지 서비스] 게임 종료 메시지 전송 [방ID: {}, 우승자: {}명, 시간제한종료: {}]", 
                roomId, winners.size(), isTimeLimit);
        
        Map<String, Object> gameOverMessage = new HashMap<>();
        gameOverMessage.put("type", "GAME_OVER");
        gameOverMessage.put("winners", winners);
        gameOverMessage.put("resetLocalStorage", true);
        gameOverMessage.put("closeConnection", true);
        gameOverMessage.put("isTimeLimit", isTimeLimit);
        
        executorService.submit(() -> {
            try {
                sessionRegistry.broadcastMessage(roomId, gameOverMessage);
            } catch (Exception e) {
                log.error("[메시지 서비스] 게임 종료 메시지 전송 중 오류 [방ID: {}]", roomId, e);
            }
        });
    }

    // 모든 플레이어가 죽었을 때 새 게임 메시지 전송
    public void sendAllPlayersRevivedMessage(String roomId) throws IOException {
        Map<String, Object> message = createGameStartMessage(roomId);
        message.put("allPlayersRevived", true);  // 전원 탈락 후 부활 플래그
        
        sessionRegistry.broadcastMessage(roomId, message);
    }

    // 최대 숫자 계산
    private int calculateMaxNumber(String roomId) {
        // 생존한 플레이어 수만 계산
        long survivorCount = gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .count();
        
        // 최소값은 1로 설정 (생존자가 없거나 계산 결과가 0이 되는 경우 방지)
        int maxNumber = (int) Math.round(survivorCount * 0.7);
        return Math.max(1, maxNumber);
    }
} 