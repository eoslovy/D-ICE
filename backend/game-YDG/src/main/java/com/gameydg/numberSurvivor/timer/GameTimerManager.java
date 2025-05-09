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

/**
 * 게임 타이머 관리자 - 게임의 시간 관련 처리를 담당
 */
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
    
    // 서비스 초기화 - 스프링 컨테이너가 서비스를 생성한 후 자동 호출
    @PostConstruct
    public void init() {
        // 게임 메인 루프 시작
        initGameLoop();
        log.info("게임 타이머 관리자 초기화 완료");
    }
    
    // 리소스 정리
    @PreDestroy
    public void shutdown() {
        log.info("게임 타이머 관리자 종료 중...");
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        log.info("게임 타이머 관리자 종료 완료");
    }
    
    /**
     * 타이머 이벤트 리스너 설정
     * @param listener 타이머 이벤트 리스너
     */
    public void setTimerListener(GameTimerListener listener) {
        this.timerListener = listener;
    }
    
    /**
     * 새 방 타이머 생성 또는 초기화
     * @param roomId 방 ID
     * @param state 게임 상태
     * @param remainingTime 남은 시간
     */
    public void initRoomTimer(String roomId, GameState state, int remainingTime) {
        roomTimers.put(roomId, RoomTimerDto.builder()
                .state(state)
                .remainingTime(remainingTime)
                .build());
        
        gameStates.put(roomId, state);
        log.info("방 타이머 초기화 [방ID: {}, 상태: {}, 남은시간: {}초]", roomId, state, remainingTime);
    }
    
    /**
     * 방 타이머 제거
     * @param roomId 방 ID
     */
    public void removeRoomTimer(String roomId) {
        roomTimers.remove(roomId);
        log.info("방 타이머 제거 [방ID: {}]", roomId);
    }
    
    /**
     * 게임 상태 설정
     * @param roomId 방 ID
     * @param state 게임 상태
     */
    public void setGameState(String roomId, GameState state) {
        gameStates.put(roomId, state);
        
        // 타이머에도 상태 반영
        if (roomTimers.containsKey(roomId)) {
            roomTimers.get(roomId).setState(state);
        }
    }
    
    /**
     * 게임 시작 여부 설정
     * @param roomId 방 ID
     * @param started 시작 여부
     */
    public void setGameStarted(String roomId, boolean started) {
        gameStarted.put(roomId, started);
    }
    
    /**
     * 타이머 남은 시간 설정
     * @param roomId 방 ID
     * @param time 남은 시간(초)
     */
    public void setRemainingTime(String roomId, int time) {
        if (roomTimers.containsKey(roomId)) {
            roomTimers.get(roomId).setRemainingTime(time);
        }
    }
    
    /**
     * 메인 게임 루프 초기화 - Tick 기반 구조
     */
    private void initGameLoop() {
        log.info("게임 루프 초기화 [스레드: {}]", Thread.currentThread().getName());
        
        scheduler.scheduleAtFixedRate(() -> {
            try {
                // 제거할 방 ID를 저장할 리스트
                List<String> emptyRooms = new ArrayList<>();
                
                // 모든 방 순회하며 상태 업데이트
                for (Map.Entry<String, RoomTimerDto> entry : roomTimers.entrySet()) {
                    String roomId = entry.getKey();
                    RoomTimerDto timer = entry.getValue();
                    
                    try {
                        // 게임 종료 여부 확인 - WebSocket이 모두 닫힌 방은 타이머 처리 중단
                        if (sessionRegistry.isRoomEmpty(roomId)) {
                            log.info("방에 연결된 WebSocket이 없음 [방ID: {}] - 타이머 처리 중단", roomId);
                            
                            // 바로 삭제하지 않고 나중에 삭제하기 위해 리스트에 추가
                            emptyRooms.add(roomId);
                            continue;
                        }
                        
                        // 타이머 시간 감소
                        timer.decreaseTime();
                        
                        // 상태에 따른 처리
                        switch (timer.getState()) {
                            case WAITING:
                                // 대기 상태 처리
                                if (timer.getRemainingTime() <= 0) {
                                    // 대기 시간 종료 -> 준비 상태로 전환
                                    timer.setState(GameState.PREPARING);
                                    timer.setRemainingTime(PREPARE_TIME);
                                    gameStates.put(roomId, GameState.PREPARING);
                                    
                                    log.info("대기 상태 -> 준비 상태 전환 [방ID: {}, 게임상태: {}, 게임시작여부: {}]", 
                                            roomId, gameStates.get(roomId), gameStarted.get(roomId));
                                    
                                    // 리스너에 이벤트 전달
                                    if (timerListener != null) {
                                        timerListener.onPrepareStart(roomId);
                                    }
                                } else {
                                    // 리스너에 대기 카운트다운 이벤트 전달
                                    if (timerListener != null) {
                                        timerListener.onWaitingCountdown(roomId, timer.getRemainingTime());
                                    }
                                }
                                break;
                            
                            case PREPARING:
                                // 준비 상태 처리
                                if (timer.getRemainingTime() <= 0) {
                                    // 준비 시간 종료 -> 게임 시작
                                    timer.setState(GameState.PLAYING);
                                    gameStates.put(roomId, GameState.PLAYING);
                                    
                                    log.info("준비 상태 -> 게임 진행 상태 전환 [방ID: {}, 게임상태: {}, 게임시작여부: {}]", 
                                            roomId, gameStates.get(roomId), gameStarted.get(roomId));
                                    
                                    // 리스너에 게임 시작 이벤트 전달
                                    if (timerListener != null) {
                                        timerListener.onGameStart(roomId);
                                    }
                                } else {
                                    // 리스너에 준비 카운트다운 이벤트 전달
                                    if (timerListener != null) {
                                        timerListener.onPrepareCountdown(roomId, timer.getRemainingTime());
                                    }
                                }
                                break;
                            
                            case PLAYING:
                                // 게임 진행 중에는 특별한 처리 없음
                                break;
                        }
                    } catch (Exception e) {
                        log.error("방 타이머 처리 중 오류 [방ID: {}]", roomId, e);
                    }
                }
                
                // 제거할 방 ID를 실제로 제거
                for (String emptyRoom : emptyRooms) {
                    removeRoomTimer(emptyRoom);
                    gameStates.remove(emptyRoom);
                    gameStarted.remove(emptyRoom);
                    log.info("빈 방 관련 모든 데이터 제거 완료 [방ID: {}]", emptyRoom);
                }
            } catch (Exception e) {
                log.error("게임 루프 처리 중 오류", e);
            }
        }, 0, 1, TimeUnit.SECONDS);
    }
    
    /**
     * 타이머 이벤트 리스너 인터페이스
     */
    public interface GameTimerListener {
        /**
         * 대기 카운트다운 이벤트
         * @param roomId 방 ID
         * @param timeLeft 남은 시간
         */
        void onWaitingCountdown(String roomId, int timeLeft);
        
        /**
         * 준비 시작 이벤트
         * @param roomId 방 ID
         */
        void onPrepareStart(String roomId);
        
        /**
         * 준비 카운트다운 이벤트
         * @param roomId 방 ID
         * @param timeLeft 남은 시간
         */
        void onPrepareCountdown(String roomId, int timeLeft);
        
        /**
         * 게임 시작 이벤트
         * @param roomId 방 ID
         */
        void onGameStart(String roomId);
    }
} 