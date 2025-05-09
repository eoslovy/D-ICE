package com.gameydg.numberSurvivor.game;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.HashSet;

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

/**
 * 숫자 서바이버 게임 로직 - 게임 진행 관련 로직 처리
 */
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
        log.info("게임 로직 서비스 종료 중...");
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("게임 로직 서비스 종료 완료");
    }
    
    /**
     * 게임 시작 처리
     * @param roomId 방 ID
     * @throws IOException 메시지 전송 실패시
     */
    public void startGame(String roomId) throws IOException {
        Map<String, GameState> gameStates = timerManager.getGameStates();
        Map<String, Boolean> gameStarted = timerManager.getGameStarted();
        
        log.info("게임 시작 처리 [방ID: {}, 게임상태: {}, 게임시작여부: {}]", 
                roomId, gameStates.get(roomId), gameStarted.get(roomId));
                
        if (gameStates.get(roomId) == GameState.PLAYING && !gameStarted.get(roomId)) {
            timerManager.setGameStarted(roomId, true);
            
            // 게임 상태 초기화
            gameManager.startGame(roomId);
            
            // 게임 시작 로깅
            log.info("게임 시작 [방ID: {}] - 플레이어 수: {}", roomId, gameManager.getRooms().get(roomId).size());
            
            // 게임 시작 메시지 전송
            messageService.broadcastMessageAsync(roomId, messageService.createGameStartMessage(roomId));
            
            // 첫 라운드 시작 시간 기록
            gameManager.setRoundStartTime(roomId);
            
            // 라운드 타임아웃 타이머 시작
            scheduleRoundTimeoutCheck(roomId);
        }
    }
    
    /**
     * 플레이어 선택 처리
     * @param selectDto 선택 정보
     */
    public void processPlayerSelection(NumberSurvivorSelectDto selectDto) {
        String roomId = selectDto.getRoomId();
        String userId = selectDto.getUserId();
        
        PlayerDto player = gameManager.getRooms().get(roomId).stream()
            .filter(p -> p.getUserId().equals(userId))
            .findFirst()
            .orElse(null);

        if (player == null || !player.isAlive()) {
            // 탈락자는 무시
            return;
        }

        if (!timerManager.getGameStarted().get(roomId)) {
            return;
        }

        // 숫자 선택 로깅
        log.info("숫자 선택 [방ID: {}, 사용자ID: {}, 닉네임: {}, 선택 숫자: {}]", 
                roomId, userId, player.getNickname(), selectDto.getSelectedNumber());

        gameManager.selectNumber(roomId, userId, selectDto.getSelectedNumber());
        
        // 모든 플레이어가 선택했는지 확인
        if (isAllPlayersSelected(roomId)) {
            // 모든 플레이어가 선택 완료
            log.info("라운드 결과 계산 시작 [방ID: {}]", roomId);
            
            // 라운드 처리 (비동기)
            processRoundAsync(roomId);
        } else {
            // 아직 선택하지 않은 플레이어 수 로깅
            long notSelectedCount = gameManager.getRooms().get(roomId).stream()
                    .filter(PlayerDto::isAlive)
                    .filter(p -> p.getSelectedNumber() == null)
                    .count();
            
            log.info("대기 중 [방ID: {}, 선택 대기 중인 플레이어: {} 명]", roomId, notSelectedCount);
        }
    }
    
    /**
     * 라운드 처리 (비동기)
     * @param roomId 방 ID
     */
    public void processRoundAsync(String roomId) {
        try {
            // 시간 초과로 탈락한 플레이어들 정보 기록
            List<PlayerDto> timeoutPlayers = gameManager.getRooms().get(roomId).stream()
                    .filter(p -> !p.isAlive() && p.getSelectedNumber() == null)
                    .collect(Collectors.toList());
            
            if (!timeoutPlayers.isEmpty()) {
                log.info("시간 초과로 탈락한 플레이어 [방ID: {}, 인원: {}명, 플레이어: {}]", 
                        roomId, 
                        timeoutPlayers.size(),
                        timeoutPlayers.stream().map(PlayerDto::getNickname).collect(Collectors.joining(", ")));
            }
            
            // 라운드 결과 처리
            RoundResultDto result = gameManager.processRound(roomId);
            
            // 시간 초과로 탈락한 플레이어들도 탈락자 목록에 추가
            if (!timeoutPlayers.isEmpty()) {
                result.getEliminated().addAll(timeoutPlayers);
            }
            
            // 라운드 결과 먼저 전송
            messageService.broadcastMessageAsync(roomId, result);
            
            // 라운드 결과 로깅
            log.info("라운드 결과 [방ID: {}, 라운드: {}, 생존자: {}, 탈락자: {}]", 
                    roomId, 
                    result.getRound(),
                    result.getSurvivors().size(),
                    result.getEliminated().size());
            
            // 전원 탈락 시 라운드 재시작
            if (gameManager.isAllDead(roomId)) {
                log.info("전원 탈락! 모든 플레이어 부활 [방ID: {}]", roomId);
                
                // 모든 플레이어 부활 처리
                gameManager.getRooms().get(roomId).forEach(p -> {
                    p.setAlive(true);
                    p.setSelectedNumber(null);
                });
                
                // 지연 후 새 라운드 시작
                executorService.schedule(() -> {
                    try {
                        log.info("전원 탈락 후 새 라운드 시작 [방ID: {}]", roomId);
                        messageService.sendAllPlayersRevivedMessage(roomId);
                        
                        // 새 라운드 시작 시간 기록
                        gameManager.setRoundStartTime(roomId);
                        
                        // 라운드 타임아웃 타이머 시작
                        scheduleRoundTimeoutCheck(roomId);
                    } catch (Exception e) {
                        log.error("새 라운드 시작 중 오류 [방ID: {}]", roomId, e);
                    }
                }, 3, TimeUnit.SECONDS);
                
                return;
            }

            if (gameManager.isGameOver(roomId)) {
                // 게임 종료 처리
                log.info("게임 종료 [방ID: {}]", roomId);
                finishGame(roomId, false);
            } else {
                // 다음 라운드를 위한 충분한 시간이 있는지 확인
                long remainingTime = gameManager.getRemainingGameTime(roomId);
                log.info("다음 라운드 진행 가능 여부 확인 [방ID: {}, 남은시간: {}ms, 필요시간: {}ms]", 
                        roomId, remainingTime, MIN_TIME_FOR_NEXT_ROUND);
                
                if (remainingTime < MIN_TIME_FOR_NEXT_ROUND) {
                    // 시간 부족으로 게임 종료
                    log.info("남은 시간 부족으로 게임 종료 [방ID: {}, 남은시간: {}ms]", roomId, remainingTime);
                    finishGameWithTimeLimit(roomId);
                    return;
                }
                
                // 다음 라운드 시작 전 플레이어 상태 초기화
                resetPlayersForNewRound(roomId);
                
                // 라운드 결과와 다음 라운드 시작 사이에 지연 추가 (3초)
                // 프론트엔드에서 라운드 결과를 충분히 표시할 시간을 제공
                executorService.schedule(() -> {
                    try {
                        // 다음 라운드 시작
                        log.info("지연 후 다음 라운드 시작 [방ID: {}, 라운드: {}]", roomId, gameManager.getCurrentRounds().get(roomId));
                        messageService.broadcastMessageAsync(roomId, messageService.createGameStartMessage(roomId));
                        
                        // 새 라운드 시작 시간 기록
                        gameManager.setRoundStartTime(roomId);
                        
                        // 라운드 타임아웃 타이머 시작
                        scheduleRoundTimeoutCheck(roomId);
                    } catch (Exception e) {
                        log.error("다음 라운드 시작 중 오류 [방ID: {}]", roomId, e);
                    }
                }, 3, TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            log.error("라운드 처리 중 오류 [방ID: {}]", roomId, e);
        }
    }
    
    /**
     * 시간 제한으로 인한 게임 종료 처리
     * @param roomId 방 ID
     * @throws IOException 메시지 전송 실패시
     */
    private void finishGameWithTimeLimit(String roomId) throws IOException {
        log.info("시간 제한으로 게임 종료 [방ID: {}]", roomId);
        finishGame(roomId, true);
    }
    
    /**
     * 게임 종료 처리
     * @param roomId 방 ID
     * @param isTimeLimit 시간 제한으로 인한 종료 여부
     * @throws IOException 메시지 전송 실패시
     */
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
                
                log.info("게임 초기화 완료 [방ID: {}]", roomId);
            } catch (Exception e) {
                log.error("게임 초기화 중 오류 [방ID: {}]", roomId, e);
            }
        }, 1, TimeUnit.SECONDS);
    }
    
    /**
     * 다음 라운드를 위해 플레이어 상태 초기화
     * @param roomId 방 ID
     */
    private void resetPlayersForNewRound(String roomId) {
        gameManager.getRooms().get(roomId).forEach(player -> {
            if (player.isAlive()) {
                player.setSelectedNumber(null);
            }
        });
    }
    
    /**
     * 게임 종료 후 플레이어 상태 초기화
     * @param roomId 방 ID
     */
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
    
    /**
     * 게임 데이터 정리
     * @param roomId 방 ID
     */
    public void cleanupGameData(String roomId) {
        // 선택 정보 초기화
        if (gameManager.getRoundSelections().containsKey(roomId)) {
            gameManager.getRoundSelections().get(roomId).clear();
        }
        
        // 현재 라운드는 1로 초기화
        gameManager.getCurrentRounds().put(roomId, 1);
        
        // 필요한 경우 다른 정리 작업 추가
    }
    
    /**
     * 모든 플레이어가 선택했는지 확인
     * @param roomId 방 ID
     * @return 모든 생존 플레이어가 선택했으면 true
     */
    private boolean isAllPlayersSelected(String roomId) {
        // 라운드 시작 후 12초가 지나면 선택하지 않은 플레이어 자동 탈락 처리
        long elapsedTime = gameManager.getCurrentRoundElapsedTime(roomId);
        long roundStartTime = gameManager.getRoundStartTimes().getOrDefault(roomId, 0L);
        
        log.info("라운드 선택 체크 [방ID: {}, 시작시간: {}, 현재시간: {}, 경과시간: {}ms, 제한시간: {}ms]", 
                roomId, roundStartTime, System.currentTimeMillis(), elapsedTime, ROUND_TIME_LIMIT);
        
        // 선택하지 않은 살아있는 플레이어 목록 (로깅용)
        List<PlayerDto> notSelectedPlayers = gameManager.getRooms().get(roomId).stream()
            .filter(PlayerDto::isAlive)
            .filter(p -> p.getSelectedNumber() == null)
            .collect(Collectors.toList());
        
        if (!notSelectedPlayers.isEmpty()) {
            log.info("현재 선택하지 않은 생존 플레이어 [방ID: {}, 경과시간: {}ms, 인원: {}명, 플레이어: {}]", 
                    roomId, 
                    elapsedTime,
                    notSelectedPlayers.size(),
                    notSelectedPlayers.stream().map(PlayerDto::getNickname).collect(Collectors.joining(", ")));
        }
        
        // 12초 이상 지났으면 선택하지 않은 플레이어 탈락 처리
        if (roundStartTime > 0 && elapsedTime > ROUND_TIME_LIMIT) {
            log.info("시간 초과! 선택하지 않은 플레이어 자동 탈락 처리 [방ID: {}, 경과시간: {}ms]", roomId, elapsedTime);
            
            // 모든 생존자 중 선택하지 않은 플레이어 탈락 처리
            int eliminatedCount = 0;
            List<String> eliminatedPlayers = new ArrayList<>();
            
            for (PlayerDto player : gameManager.getRooms().get(roomId)) {
                if (player.isAlive() && player.getSelectedNumber() == null) {
                    player.setAlive(false);
                    eliminatedCount++;
                    eliminatedPlayers.add(player.getNickname());
                    log.info("시간 초과로 자동 탈락 [방ID: {}, 플레이어: {}, UserId: {}]", 
                            roomId, player.getNickname(), player.getUserId());
                }
            }
            
            log.info("시간 초과 탈락 처리 결과 [방ID: {}, 탈락인원: {}명, 플레이어: {}]", 
                    roomId, eliminatedCount, String.join(", ", eliminatedPlayers));
            
            // 자동 탈락 처리 후 모든 플레이어가 선택한 것으로 간주
            return true;
        }
        
        // 일반적인 로직 - 모든 생존 플레이어가 선택했는지 확인
        boolean allSelected = gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .allMatch(player -> player.getSelectedNumber() != null);
        
        log.debug("선택 확인 결과 [방ID: {}, 모두 선택 완료: {}, 경과시간: {}ms]", roomId, allSelected, elapsedTime);
        
        return allSelected;
    }

    /**
     * 라운드 시작 후 타임아웃 체크 타이머 스케줄링
     * @param roomId 방 ID
     */
    private void scheduleRoundTimeoutCheck(String roomId) {
        log.info("라운드 타임아웃 체크 스케줄링 [방ID: {}, 타임아웃: {}ms]", roomId, ROUND_TIME_LIMIT);
        
        executorService.schedule(() -> {
            try {
                // 현재 라운드 경과 시간
                long elapsedTime = gameManager.getCurrentRoundElapsedTime(roomId);
                log.info("강제 타임아웃 체크 [방ID: {}, 경과시간: {}ms, 제한시간: {}ms]", 
                        roomId, elapsedTime, ROUND_TIME_LIMIT);
                
                // 아직 게임이 진행 중인지 확인
                if (timerManager.getGameStates().get(roomId) == GameState.PLAYING && 
                    timerManager.getGameStarted().getOrDefault(roomId, false)) {
                    
                    // 현재 방에 있는 플레이어 수 확인
                    int playerCount = gameManager.getRooms().getOrDefault(roomId, new HashSet<>()).size();
                    log.info("타임아웃 체크 시 방의 플레이어 상태 [방ID: {}, 플레이어 수: {}]", roomId, playerCount);
                    
                    // 선택하지 않은 생존 플레이어 목록 (로깅용)
                    List<PlayerDto> unselectedPlayers = gameManager.getRooms().get(roomId).stream()
                            .filter(p -> p.isAlive() && p.getSelectedNumber() == null)
                            .collect(Collectors.toList());
                    
                    // 선택하지 않은 생존 플레이어가 있는지 확인
                    boolean hasUnselectedPlayers = !unselectedPlayers.isEmpty();
                    
                    log.info("타임아웃 체크 상세 [방ID: {}, 선택 안한 플레이어: {}, 경과시간: {}ms]", 
                            roomId, hasUnselectedPlayers ? unselectedPlayers.size() : 0, elapsedTime);
                    
                    // 모든 플레이어가 이미 선택했거나 라운드가 진행 중이 아니면 타이머 취소
                    if (!hasUnselectedPlayers) {
                        log.info("모든 플레이어가 이미 선택 완료했거나 게임 진행 중이 아님 [방ID: {}]", roomId);
                        return;
                    }
                    
                    // 경과 시간이 실제로 ROUND_TIME_LIMIT을 초과했는지 확인
                    if (elapsedTime >= ROUND_TIME_LIMIT) {
                        log.info("강제 타임아웃 발동 - 선택하지 않은 플레이어 자동 탈락 처리 [방ID: {}]", roomId);
                        
                        // 선택하지 않은 플레이어 탈락 처리
                        for (PlayerDto player : unselectedPlayers) {
                            player.setAlive(false);
                            log.info("강제 타임아웃으로 자동 탈락 [방ID: {}, 플레이어: {}, UserId: {}]", 
                                    roomId, player.getNickname(), player.getUserId());
                        }
                        
                        // 라운드 결과 처리 - 타임아웃 발생했으므로 강제로 라운드 진행
                        log.info("타임아웃으로 라운드 강제 진행 [방ID: {}]", roomId);
                        processRoundAsync(roomId);
                    } else {
                        // 아직 시간이 충분히 지나지 않았다면 다시 체크 스케줄링 (1초 후)
                        log.info("타임아웃 시간이 아직 도달하지 않음. 1초 후 다시 체크 [방ID: {}, 현재경과: {}ms]", roomId, elapsedTime);
                        executorService.schedule(() -> {
                            try {
                                scheduleRoundTimeoutCheck(roomId);
                            } catch (Exception e) {
                                log.error("타임아웃 재스케줄링 중 오류 [방ID: {}]", roomId, e);
                            }
                        }, 1, TimeUnit.SECONDS);
                    }
                } else {
                    log.info("타임아웃 체크 무시: 게임이 진행 중이 아님 [방ID: {}, 게임상태: {}, 게임시작여부: {}]",
                            roomId, timerManager.getGameStates().get(roomId), timerManager.getGameStarted().getOrDefault(roomId, false));
                }
            } catch (Exception e) {
                log.error("타임아웃 체크 중 오류 [방ID: {}]", roomId, e);
            }
        }, ROUND_TIME_LIMIT, TimeUnit.MILLISECONDS);
    }
} 