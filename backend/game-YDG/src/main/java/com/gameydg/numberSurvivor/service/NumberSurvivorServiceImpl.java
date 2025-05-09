package com.gameydg.numberSurvivor.service;

import java.io.IOException;
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
import com.gameydg.numberSurvivor.timer.GameTimerManager;
import com.gameydg.numberSurvivor.timer.GameTimerManager.GameTimerListener;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 숫자 서바이버 서비스 구현체 - 서비스 API 제공 및 각 컴포넌트 연결
 */
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
        // 타이머 관리자에 리스너 등록
        timerManager.setTimerListener(this);
        log.info("숫자 서바이버 서비스 초기화 완료");
    }
    
    @PreDestroy
    public void shutdown() {
        log.info("숫자 서바이버 서비스 종료 중...");
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("숫자 서바이버 서비스 종료 완료");
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
        
        String roomId = joinDto.getRoomId();
        
        // 현재 방의 플레이어 수 확인 - 첫 플레이어인지 확인용
        int beforeJoinCount = gameManager.getCurrentPlayerCount(roomId);
        
        // 게임 매니저에 플레이어 등록
        gameManager.joinRoom(roomId, player);
        
        // 게임 시작 여부 초기화 
        timerManager.getGameStarted().putIfAbsent(roomId, false);
        
        // 방에 첫 플레이어가 들어온 경우 또는 게임 상태가 없는 경우 타이머 항상 초기화
        if (beforeJoinCount == 0 || !timerManager.getGameStates().containsKey(roomId)) {
            // 타이머 초기화
            timerManager.initRoomTimer(roomId, GameState.WAITING, GameTimerManager.WAITING_TIME);
            log.info("첫 플레이어 입장 또는 새 게임 시작으로 타이머 초기화 [방ID: {}, 대기시간: {}초]", roomId, GameTimerManager.WAITING_TIME);
        }
        
        // 게임 상태 불일치 확인 및 수정 - PLAYING 상태인데 gameStarted가 false인 경우 수정
        GameState currentState = timerManager.getGameStates().get(roomId);
        boolean isStarted = timerManager.getGameStarted().getOrDefault(roomId, false);
        
        if (currentState == GameState.PLAYING && !isStarted) {
            log.info("게임 상태 불일치 수정 [방ID: {}, 상태: PLAYING, 시작여부: false -> true]", roomId);
            timerManager.setGameStarted(roomId, true);
        }
        
        // 로깅 추가 - 현재 게임 상태 확인
        log.info("플레이어 입장 시 상태 확인 [방ID: {}, 게임상태: {}, 게임시작여부: {}]", 
                roomId, timerManager.getGameStates().get(roomId), timerManager.getGameStarted().get(roomId));
        
        // 게임 상태에 따라 메시지 전송 (비동기)
        sendJoinResponseMessage(session, roomId);
        
        // 방 정보와 참여 유저 로깅
        sessionRegistry.logRoomStatus(roomId);
    }

    /**
     * 입장 응답 메시지 전송
     */
    private void sendJoinResponseMessage(WebSocketSession session, String roomId) {
        executorService.submit(() -> {
            try {
                // 게임 상태와 시작 여부를 함께 검사
                GameState state = timerManager.getGameStates().get(roomId);
                boolean gameStartStatus = timerManager.getGameStarted().getOrDefault(roomId, false);
                
                if (state == GameState.PLAYING && gameStartStatus) {
                    // 게임이 진행 중인 경우
                    messageService.sendGameInProgressMessage(session);
                } else if (state == GameState.PREPARING) {
                    // 준비 상태인 경우
                    messageService.sendPreparingMessage(session, roomId);
                } else {
                    // 대기 상태이거나 다른 상태인 경우
                    messageService.sendWaitingMessage(roomId);
                }
            } catch (IOException e) {
                log.error("메시지 전송 중 오류 발생", e);
            }
        });
    }
    
    @Override
    public void handleStart(String roomId) throws IOException {
        // 게임 로직에 시작 처리 위임
        gameLogic.startGame(roomId);
    }

    @Override
    public void handleSelect(WebSocketSession session, NumberSurvivorSelectDto selectDto) throws IOException {
        // 게임 로직에 선택 처리 위임 (비동기)
        executorService.submit(() -> {
            gameLogic.processPlayerSelection(selectDto);
        });
    }

    @Override
    public int getCurrentPlayerCount(String roomId) {
        return gameManager.getCurrentPlayerCount(roomId);
    }

    @Override
    public int getMaxNumber(String roomId) {
        // 생존한 플레이어 수만 계산
        long survivorCount = gameManager.getRooms().get(roomId).stream()
                .filter(PlayerDto::isAlive)
                .count();
        
        // 최소값은 1로 설정 (생존자가 없거나 계산 결과가 0이 되는 경우 방지)
        int maxNumber = (int) Math.ceil(survivorCount * 0.7);
        return Math.max(1, maxNumber);
    }

    @Override
    public void handleDisconnect(WebSocketSession disconnectedSession) {
        log.info("서비스 레이어에서 연결 종료 처리: {}", disconnectedSession.getId());
        
        // 세션에 해당하는 사용자 ID 찾기
        String disconnectedUserId = sessionRegistry.findUserIdBySession(disconnectedSession);
        
        if (disconnectedUserId == null) {
            log.warn("세션 {}에 해당하는 사용자 ID를 찾을 수 없습니다", disconnectedSession.getId());
            return;
        }
        
        log.info("연결 종료된 사용자 ID: {}", disconnectedUserId);
        
        // 서비스 레이어의 세션 맵에서 제거
        sessionRegistry.unregisterSession(disconnectedUserId);
        
        // 방 ID 찾기
        String roomId = findRoomIdByUserId(disconnectedUserId);
        
        if (roomId != null) {
            log.info("사용자 {}가 있던 방: {}", disconnectedUserId, roomId);
            
            // 게임 매니저에서 플레이어 제거 처리
            gameManager.leaveRoom(roomId, disconnectedUserId);
            
            // 방의 모든 세션이 종료되었는지 확인
            if (sessionRegistry.isRoomEmpty(roomId)) {
                log.info("방 {}의 모든 플레이어가 연결 종료됨, 게임 정리", roomId);
                
                // 게임 상태 정리
                timerManager.setGameState(roomId, GameState.WAITING);
                timerManager.setGameStarted(roomId, false);
                
                // 타이머 정리 및 맵에서 완전히 제거
                timerManager.removeRoomTimer(roomId);
                
                // 게임 상태, 시작 여부 맵에서도 제거
                timerManager.getGameStates().remove(roomId);
                timerManager.getGameStarted().remove(roomId);
                
                // 게임 데이터 정리
                gameLogic.cleanupGameData(roomId);
                
                // 방 데이터를 완전히 정리하기 위한 추가 호출
                log.info("방 {}의 모든 데이터 완전 제거", roomId);
            }
        }
    }
    
    // 사용자 ID로 방 ID 찾기
    private String findRoomIdByUserId(String userId) {
        return gameManager.getRooms().entrySet().stream()
                .filter(entry -> entry.getValue().stream()
                        .anyMatch(player -> player.getUserId().equals(userId)))
                .map(java.util.Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }

    // GameTimerListener 구현 메서드들
    
    @Override
    public void onWaitingCountdown(String roomId, int timeLeft) {
        try {
            messageService.sendWaitingCountdownMessage(roomId, timeLeft);
        } catch (Exception e) {
            log.error("대기 카운트다운 메시지 전송 중 오류 [방ID: {}]", roomId, e);
        }
    }

    @Override
    public void onPrepareStart(String roomId) {
        try {
            messageService.sendPrepareStartMessage(roomId, GameTimerManager.PREPARE_TIME);
        } catch (Exception e) {
            log.error("준비 시작 메시지 전송 중 오류 [방ID: {}]", roomId, e);
        }
    }

    @Override
    public void onPrepareCountdown(String roomId, int timeLeft) {
        try {
            messageService.sendPrepareCountdownMessage(roomId, timeLeft);
        } catch (Exception e) {
            log.error("준비 카운트다운 메시지 전송 중 오류 [방ID: {}]", roomId, e);
        }
    }

    @Override
    public void onGameStart(String roomId) {
        try {
            handleStart(roomId);
        } catch (Exception e) {
            log.error("게임 시작 처리 중 오류 [방ID: {}]", roomId, e);
        }
    }
}