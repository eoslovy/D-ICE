package com.gameydg.numberSurvivor.game;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.gameydg.numberSurvivor.dto.GameState;
import com.gameydg.numberSurvivor.dto.NumberSurvivorSelectDto;
import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.dto.RoundResultDto;
import com.gameydg.numberSurvivor.manager.NumberSurvivorManager;
import com.gameydg.numberSurvivor.message.GameMessageService;
import com.gameydg.numberSurvivor.timer.GameTimerManager;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 숫자 서바이버 게임 로직 - 게임 진행 관련 로직 처리
@Slf4j
@Component
@RequiredArgsConstructor
public class NumberSurvivorGameLogic {
    private final NumberSurvivorManager gameManager;
    private final GameMessageService messageService;
    private final GameTimerManager timerManager;
    
    // 비동기 작업을 위한 실행기 - 게임 로직용
    private final ScheduledExecutorService executorService = Executors.newScheduledThreadPool(5);
    
    // 라운드 최소 필요 시간 (15초 = 15,000ms)
    private static final long MIN_TIME_FOR_NEXT_ROUND = 15000;
    
    // 라운드 시간 제한 (12초 = 12,000ms)
    private static final long ROUND_TIME_LIMIT = 12000;
    
    // 리소스 정리
    @PreDestroy
    public void shutdown() {
        log.info("[게임 로직] 종료 시작");
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("[게임 로직] 종료 완료");
    }

    // 게임 시작 처리
    public void startGame(String roomId) {
        Map<String, GameState> gameStates = timerManager.getGameStates();
        Map<String, Boolean> gameStarted = timerManager.getGameStarted();
        
        if (gameStates.get(roomId) == GameState.PLAYING && !gameStarted.get(roomId)) {
            timerManager.setGameStarted(roomId, true);
            gameManager.startGame(roomId);
            
            log.info("[게임 로직] 게임 시작 [방ID: {}, 플레이어: {}명]", 
                    roomId, gameManager.getRooms().get(roomId).size());
            
            messageService.broadcastMessageAsync(roomId, messageService.createGameStartMessage(roomId));
            gameManager.setRoundStartTime(roomId);
            scheduleRoundTimeoutCheck(roomId);
        }
    }

    // 플레이어 선택 처리
    public void processPlayerSelection(NumberSurvivorSelectDto selectDto) {
        String roomId = selectDto.getRoomId();
        String userId = selectDto.getUserId();
        
        PlayerDto player = gameManager.getRooms().get(roomId).stream()
            .filter(p -> p.getUserId().equals(userId))
            .findFirst()
            .orElse(null);

        if (player == null || !player.isAlive() || !timerManager.getGameStarted().get(roomId)) {
            return;
        }

        gameManager.selectNumber(roomId, userId, selectDto.getSelectedNumber());
        
        if (isAllPlayersSelected(roomId)) {
            log.info("[게임 로직] 라운드 결과 계산 시작 [방ID: {}]", roomId);
            processRoundAsync(roomId);
        }
    }

    // 라운드 처리 (비동기)
    public void processRoundAsync(String roomId) {
        try {
            List<PlayerDto> timeoutPlayers = gameManager.getRooms().get(roomId).stream()
                    .filter(p -> !p.isAlive() && p.getSelectedNumber() == null)
                    .collect(Collectors.toList());
            
            if (!timeoutPlayers.isEmpty()) {
                log.info("[게임 로직] 시간 초과 탈락 [방ID: {}, 인원: {}명]", 
                        roomId, timeoutPlayers.size());
            }
            
            RoundResultDto result = gameManager.processRound(roomId);
            
            if (!timeoutPlayers.isEmpty()) {
                result.getEliminated().addAll(timeoutPlayers);
            }
            
            messageService.broadcastMessageAsync(roomId, result);
            
            log.info("[게임 로직] 라운드 결과 [방ID: {}, 라운드: {}, 생존자: {}명, 탈락자: {}명]", 
                    roomId, result.getRound(), result.getSurvivors().size(), result.getEliminated().size());
            
            if (gameManager.isAllDead(roomId)) {
                log.info("[게임 로직] 전원 탈락 - 모든 플레이어 부활 [방ID: {}]", roomId);
                
                gameManager.getRooms().get(roomId).forEach(p -> {
                    p.setAlive(true);
                    p.setSelectedNumber(null);
                });
                
                executorService.schedule(() -> {
                    try {
                        messageService.sendAllPlayersRevivedMessage(roomId);
                        gameManager.setRoundStartTime(roomId);
                        scheduleRoundTimeoutCheck(roomId);
                    } catch (Exception e) {
                        log.error("[게임 로직] 새 라운드 시작 중 오류 [방ID: {}]", roomId, e);
                    }
                }, 3, TimeUnit.SECONDS);
                
                return;
            }

            if (gameManager.isGameOver(roomId)) {
                log.info("[게임 로직] 게임 종료 [방ID: {}]", roomId);
                finishGame(roomId, false);
            } else {
                long remainingTime = gameManager.getRemainingGameTime(roomId);
                
                if (remainingTime < MIN_TIME_FOR_NEXT_ROUND) {
                    log.info("[게임 로직] 시간 제한으로 게임 종료 [방ID: {}, 남은시간: {}ms]", roomId, remainingTime);
                    finishGameWithTimeLimit(roomId);
                    return;
                }
                
                resetPlayersForNewRound(roomId);
                
                executorService.schedule(() -> {
                    try {
                        messageService.broadcastMessageAsync(roomId, messageService.createGameStartMessage(roomId));
                        gameManager.setRoundStartTime(roomId);
                        scheduleRoundTimeoutCheck(roomId);
                    } catch (Exception e) {
                        log.error("[게임 로직] 다음 라운드 시작 중 오류 [방ID: {}]", roomId, e);
                    }
                }, 3, TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            log.error("[게임 로직] 라운드 처리 중 오류 [방ID: {}]", roomId, e);
        }
    }

    // 시간 제한으로 인한 게임 종료 처리
    private void finishGameWithTimeLimit(String roomId) throws IOException {
        log.info("시간 제한으로 게임 종료 [방ID: {}]", roomId);
        finishGame(roomId, true);
    }

    // 게임 종료 처리
    public void finishGame(String roomId, boolean isTimeLimit) throws IOException {
        // 상태 변경 먼저 진행
        timerManager.setGameStarted(roomId, false);
        timerManager.setGameState(roomId, GameState.WAITING);
        
        // 게임 종료 메시지 전송 (비동기)
        messageService.sendGameOverMessage(roomId, isTimeLimit);
        
        // 다음 게임을 위한 상태 초기화는 약간의 딜레이 후 실행
        executorService.schedule(() -> {
            try {
                // 다음 게임을 위해 플레이어 상태 초기화
                resetPlayersAfterGame(roomId);
                
                // 다음 게임을 위한 대기 타이머 재설정
                timerManager.initRoomTimer(roomId, GameState.WAITING, GameTimerManager.WAITING_TIME);
                
                log.info("[게임 로직] 게임 초기화 완료 [방ID: {}]", roomId);
            } catch (Exception e) {
                log.error("[게임 로직] 게임 초기화 중 오류 [방ID: {}]", roomId, e);
            }
        }, 1, TimeUnit.SECONDS);
    }

    // 다음 라운드를 위해 플레이어 상태 초기화
    private void resetPlayersForNewRound(String roomId) {
        gameManager.getRooms().get(roomId).forEach(player -> {
            if (player.isAlive()) {
                player.setSelectedNumber(null);
            }
        });
    }

    // 게임 종료 후 플레이어 상태 초기화
    private void resetPlayersAfterGame(String roomId) {
        if (gameManager.getRooms().containsKey(roomId)) {
            // 모든 플레이어 생존 상태로 초기화
            gameManager.getRooms().get(roomId).forEach(player -> {
                player.setAlive(true);
                player.setSelectedNumber(null);
            });
            
            // 라운드 정보 초기화
            gameManager.getCurrentRounds().put(roomId, 1);
            
            // 선택 정보 초기화
            if (gameManager.getRoundSelections().containsKey(roomId)) {
                gameManager.getRoundSelections().get(roomId).clear();
            }
        }
    }

    // 게임 데이터 정리
    public void cleanupGameData(String roomId) {
        // 선택 정보 초기화
        if (gameManager.getRoundSelections().containsKey(roomId)) {
            gameManager.getRoundSelections().get(roomId).clear();
        }
        
        // 현재 라운드는 1로 초기화
        gameManager.getCurrentRounds().put(roomId, 1);
    }

    // 모든 플레이어가 선택했는지 확인
    private boolean isAllPlayersSelected(String roomId) {
        long elapsedTime = gameManager.getCurrentRoundElapsedTime(roomId);
        long roundStartTime = gameManager.getRoundStartTimes().getOrDefault(roomId, 0L);
        
        if (roundStartTime > 0 && elapsedTime > ROUND_TIME_LIMIT) {
            log.info("[게임 로직] 시간 초과 자동 탈락 [방ID: {}, 경과시간: {}ms]", roomId, elapsedTime);
            
            int eliminatedCount = 0;
            for (PlayerDto player : gameManager.getRooms().get(roomId)) {
                if (player.isAlive() && player.getSelectedNumber() == null) {
                    player.setAlive(false);
                    eliminatedCount++;
                }
            }
            
            if (eliminatedCount > 0) {
                log.info("[게임 로직] 시간 초과 탈락 처리 [방ID: {}, 탈락인원: {}명]", roomId, eliminatedCount);
            }
            
            return true;
        }
        
        return gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .allMatch(player -> player.getSelectedNumber() != null);
    }

    // 라운드 시작 후 타임아웃 체크 타이머 스케줄링
    private void scheduleRoundTimeoutCheck(String roomId) {
        executorService.schedule(() -> {
            try {
                long elapsedTime = gameManager.getCurrentRoundElapsedTime(roomId);
                
                if (timerManager.getGameStates().get(roomId) == GameState.PLAYING && 
                    timerManager.getGameStarted().getOrDefault(roomId, false)) {
                    
                    List<PlayerDto> unselectedPlayers = gameManager.getRooms().get(roomId).stream()
                            .filter(p -> p.isAlive() && p.getSelectedNumber() == null)
                            .collect(Collectors.toList());
                    
                    if (!unselectedPlayers.isEmpty() && elapsedTime >= ROUND_TIME_LIMIT) {
                        log.info("[게임 로직] 강제 타임아웃 발동 [방ID: {}, 탈락인원: {}명]", 
                                roomId, unselectedPlayers.size());
                        
                        for (PlayerDto player : unselectedPlayers) {
                            player.setAlive(false);
                        }
                        
                        processRoundAsync(roomId);
                    } else if (!unselectedPlayers.isEmpty()) {
                        executorService.schedule(() -> scheduleRoundTimeoutCheck(roomId), 1, TimeUnit.SECONDS);
                    }
                }
            } catch (Exception e) {
                log.error("[게임 로직] 타임아웃 체크 중 오류 [방ID: {}]", roomId, e);
            }
        }, ROUND_TIME_LIMIT, TimeUnit.MILLISECONDS);
    }
} 