package com.gameydg.numberSurvivor.game;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

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
    private void processRoundAsync(String roomId) {
        try {
            RoundResultDto result = gameManager.processRound(roomId);
            
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
                    } catch (Exception e) {
                        log.error("새 라운드 시작 중 오류 [방ID: {}]", roomId, e);
                    }
                }, 3, TimeUnit.SECONDS);
                
                return;
            }

            if (gameManager.isGameOver(roomId)) {
                // 게임 종료 처리
                log.info("게임 종료 [방ID: {}]", roomId);
                finishGame(roomId);
            } else {
                // 다음 라운드 시작 전 플레이어 상태 초기화
                resetPlayersForNewRound(roomId);
                
                // 라운드 결과와 다음 라운드 시작 사이에 지연 추가 (3초)
                // 프론트엔드에서 라운드 결과를 충분히 표시할 시간을 제공
                executorService.schedule(() -> {
                    try {
                        // 다음 라운드 시작
                        log.info("지연 후 다음 라운드 시작 [방ID: {}, 라운드: {}]", roomId, gameManager.getCurrentRounds().get(roomId));
                        messageService.broadcastMessageAsync(roomId, messageService.createGameStartMessage(roomId));
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
     * 게임 종료 처리
     * @param roomId 방 ID
     * @throws IOException 메시지 전송 실패시
     */
    private void finishGame(String roomId) throws IOException {
        // 상태 변경 먼저 진행
        timerManager.setGameStarted(roomId, false);
        timerManager.setGameState(roomId, GameState.WAITING);
        
        // 게임 종료 메시지 전송 (비동기)
        messageService.sendGameOverMessage(roomId);
        
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
        return gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .allMatch(player -> player.getSelectedNumber() != null);
    }
} 