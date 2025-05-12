package com.gameydg.numberSurvivor.timer;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.List;
import java.util.ArrayList;

import org.springframework.stereotype.Component;

import com.gameydg.numberSurvivor.dto.GameState;
import com.gameydg.numberSurvivor.dto.RoomTimerDto;
import com.gameydg.numberSurvivor.session.GameSessionRegistry;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 게임 타이머 관리자 - 게임의 시간 관련 처리를 담당
@Slf4j
@Component
@RequiredArgsConstructor
public class GameTimerManager {
    private final GameSessionRegistry sessionRegistry;
    
    // 방 타이머 상태를 관리하는 맵
    @Getter
    private final Map<String, RoomTimerDto> roomTimers = new ConcurrentHashMap<>();
    
    // 게임 상태를 관리하는 맵
    @Getter
    private final Map<String, GameState> gameStates = new ConcurrentHashMap<>();
    
    // 게임 시작 여부를 관리하는 맵
    @Getter
    private final Map<String, Boolean> gameStarted = new ConcurrentHashMap<>();
    
    // 중앙 스케줄러 - 한 개의 스레드만 사용
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    
    // 대기 시간 및 준비 시간 상수
    public static final int WAITING_TIME = 10; // 참여자 대기 시간 (초)
    public static final int PREPARE_TIME = 5;  // 게임 시작 준비 시간 (초)

    // 타이머 이벤트 리스너
    private GameTimerListener timerListener;
    
    // 서비스 초기화
    @PostConstruct
    public void init() {
        initGameLoop();
        log.info("[게임 타이머] 초기화 완료");
    }
    
    // 리소스 정리
    @PreDestroy
    public void shutdown() {
        log.info("[게임 타이머] 종료 시작");
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("[게임 타이머] 종료 완료");
    }

    // 타이머 이벤트 리스너 설정
    public void setTimerListener(GameTimerListener listener) {
        this.timerListener = listener;
    }

    // 새 방 타이머 생성 또는 초기화
    public void initRoomTimer(String roomId, GameState state, int remainingTime) {
        roomTimers.put(roomId, RoomTimerDto.builder()
                .state(state)
                .remainingTime(remainingTime)
                .build());
        
        gameStates.put(roomId, state);
        log.info("[게임 타이머] 방 초기화 [방ID: {}, 상태: {}]", roomId, state);
    }

    // 방 타이머 제거
    public void removeRoomTimer(String roomId) {
        roomTimers.remove(roomId);
        log.info("[게임 타이머] 방 제거 [방ID: {}]", roomId);
    }

    // 게임 상태 설정
    public void setGameState(String roomId, GameState state) {
        gameStates.put(roomId, state);
        
        // 타이머에도 상태 반영
        if (roomTimers.containsKey(roomId)) {
            roomTimers.get(roomId).setState(state);
        }
    }

    // 게임 시작 여부 설정
    public void setGameStarted(String roomId, boolean started) {
        gameStarted.put(roomId, started);
    }

    // 메인 게임 루프 초기화 - Tick 기반 구조
    private void initGameLoop() {
        scheduler.scheduleAtFixedRate(() -> {
            try {
                List<String> emptyRooms = new ArrayList<>();
                
                for (Map.Entry<String, RoomTimerDto> entry : roomTimers.entrySet()) {
                    String roomId = entry.getKey();
                    RoomTimerDto timer = entry.getValue();
                    
                    try {
                        if (sessionRegistry.isRoomEmpty(roomId)) {
                            emptyRooms.add(roomId);
                            continue;
                        }
                        
                        // 타이머 시간 감소 (1초 단위)
                        timer.decreaseTime();
                        
                        // 현재 남은 시간 (초 단위)
                        int remainingSeconds = timer.getRemainingTime();
                        
                        switch (timer.getState()) {
                            case WAITING:
                                // 매 초마다 카운트다운 이벤트 발생
                                if (timerListener != null && remainingSeconds > 0) {
                                    timerListener.onWaitingCountdown(roomId, remainingSeconds);
                                    log.debug("[게임 타이머] 대기 카운트다운 [방ID: {}, 남은시간: {}초]", roomId, remainingSeconds);
                                }
                                
                                if (timer.getRemainingTime() <= 0) {
                                    timer.setState(GameState.PREPARING);
                                    timer.setRemainingTime(PREPARE_TIME);
                                    gameStates.put(roomId, GameState.PREPARING);
                                    
                                    log.info("[게임 타이머] 상태 전환 [방ID: {}, 상태: WAITING → PREPARING]", roomId);
                                    
                                    if (timerListener != null) {
                                        timerListener.onPrepareStart(roomId);
                                    }
                                }
                                break;
                            
                            case PREPARING:
                                // 매 초마다 카운트다운 이벤트 발생
                                if (timerListener != null && remainingSeconds > 0) {
                                    timerListener.onPrepareCountdown(roomId, remainingSeconds);
                                    log.debug("[게임 타이머] 준비 카운트다운 [방ID: {}, 남은시간: {}초]", roomId, remainingSeconds);
                                }
                                
                                if (timer.getRemainingTime() <= 0) {
                                    timer.setState(GameState.PLAYING);
                                    gameStates.put(roomId, GameState.PLAYING);
                                    
                                    log.info("[게임 타이머] 상태 전환 [방ID: {}, 상태: PREPARING → PLAYING]", roomId);
                                    
                                    if (timerListener != null) {
                                        timerListener.onGameStart(roomId);
                                    }
                                }
                                break;
                        }
                    } catch (Exception e) {
                        log.error("[게임 타이머] 방 처리 중 오류 [방ID: {}]", roomId, e);
                    }
                }
                
                for (String emptyRoom : emptyRooms) {
                    removeRoomTimer(emptyRoom);
                    gameStates.remove(emptyRoom);
                    gameStarted.remove(emptyRoom);
                }
            } catch (Exception e) {
                log.error("[게임 타이머] 게임 루프 처리 중 오류", e);
            }
        }, 0, 1, TimeUnit.SECONDS);
    }
} 