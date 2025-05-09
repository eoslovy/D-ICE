package com.gameydg.numberSurvivor.session;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameydg.numberSurvivor.dto.PlayerDto;
import com.gameydg.numberSurvivor.manager.NumberSurvivorManager;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 게임 세션 레지스트리 - 웹소켓 세션 관리를 담당
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GameSessionRegistry {
    private final ObjectMapper objectMapper;
    private final NumberSurvivorManager gameManager;
    
    // 사용자 ID를 키로 WebSocketSession을 저장하는 맵
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    /**
     * 세션 등록
     * @param userId 사용자 ID
     * @param session 웹소켓 세션
     */
    public void registerSession(String userId, WebSocketSession session) {
        sessions.put(userId, session);
        log.info("세션 등록 [사용자ID: {}, 세션ID: {}]", userId, session.getId());
    }
    
    /**
     * 세션 해제
     * @param userId 사용자 ID
     */
    public void unregisterSession(String userId) {
        WebSocketSession removed = sessions.remove(userId);
        if (removed != null) {
            log.info("세션 해제 [사용자ID: {}, 세션ID: {}]", userId, removed.getId());
        }
    }
    
    /**
     * 웹소켓 세션으로 사용자 ID 찾기
     * @param session 웹소켓 세션
     * @return 사용자 ID 또는 null
     */
    public String findUserIdBySession(WebSocketSession session) {
        return sessions.entrySet().stream()
                .filter(entry -> entry.getValue().getId().equals(session.getId()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }
    
    /**
     * 방에 메시지 브로드캐스팅
     * @param roomId 방 ID
     * @param message 전송할 메시지 객체
     * @throws IOException 메시지 전송 실패시
     */
    public void broadcastMessage(String roomId, Object message) throws IOException {
        String messageStr = objectMapper.writeValueAsString(message);
        
        // 유효하지 않은 세션 목록
        List<String> invalidUserIds = new ArrayList<>();
        
        if (!gameManager.getRooms().containsKey(roomId)) {
            log.warn("브로드캐스트 실패 - 존재하지 않는 방 [방ID: {}]", roomId);
            return;
        }
        
        // 한 번에 모든 플레이어 목록을 가져와서 작업
        Set<PlayerDto> players = new HashSet<>(gameManager.getRooms().get(roomId));
        
        for (PlayerDto player : players) {
            try {
                WebSocketSession session = sessions.get(player.getUserId());
                if (session != null && session.isOpen()) {
                    // 각 세션에 대한 메시지 전송을 동기화
                    synchronized (session) {
                        session.sendMessage(new TextMessage(messageStr));
                    }
                } else {
                    // 세션이 없거나 닫힌 경우 목록에 추가
                    invalidUserIds.add(player.getUserId());
                }
            } catch (IOException e) {
                log.error("메시지 전송 중 오류 [사용자ID: {}]", player.getUserId(), e);
                invalidUserIds.add(player.getUserId());
            }
        }
        
        // 유효하지 않은 세션 제거
        if (!invalidUserIds.isEmpty()) {
            log.info("유효하지 않은 WebSocket 세션 제거 [방ID: {}, 사용자: {}]", 
                    roomId, invalidUserIds);
            
            invalidUserIds.forEach(this::unregisterSession);
        }
    }
    
    /**
     * 단일 세션에 메시지 전송
     * @param userId 사용자 ID
     * @param message 전송할 메시지 객체
     * @throws IOException 메시지 전송 실패시
     */
    public void sendMessage(String userId, Object message) throws IOException {
        WebSocketSession session = sessions.get(userId);
        if (session != null && session.isOpen()) {
            String messageStr = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(messageStr));
        } else {
            log.warn("메시지 전송 실패 - 유효하지 않은 세션 [사용자ID: {}]", userId);
            sessions.remove(userId);
        }
    }
    
    /**
     * 단일 세션에 메시지 전송
     * @param session 웹소켓 세션
     * @param message 전송할 메시지 객체
     * @throws IOException 메시지 전송 실패시
     */
    public void sendMessage(WebSocketSession session, Object message) throws IOException {
        if (session != null && session.isOpen()) {
            String messageStr = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(messageStr));
        }
    }
    
    /**
     * 방에 활성 세션이 있는지 확인
     * @param roomId 방 ID
     * @return 방이 비어있으면 true, 활성 세션이 있으면 false
     */
    public boolean isRoomEmpty(String roomId) {
        if (!gameManager.getRooms().containsKey(roomId)) {
            log.debug("방 존재 여부 확인 [방ID: {}] - 방이 존재하지 않음", roomId);
            return true;
        }
        
        // 방에 있는 플레이어의 WebSocket 세션 중 활성 상태인 것이 있는지 확인
        long activeSessionCount = gameManager.getRooms().get(roomId).stream()
                .map(player -> sessions.get(player.getUserId()))
                .filter(session -> session != null && session.isOpen())
                .count();
        
        log.debug("방 WebSocket 연결 확인 [방ID: {}, 활성세션: {}, 총플레이어: {}]", 
                roomId, activeSessionCount, gameManager.getRooms().get(roomId).size());
                
        return activeSessionCount == 0;
    }
    
    /**
     * 모든 활성 세션 가져오기
     * @return 활성 세션 맵
     */
    public Map<String, WebSocketSession> getAllSessions() {
        return sessions;
    }
    
    /**
     * 방의 상태를 로깅
     * @param roomId 방 ID
     */
    public void logRoomStatus(String roomId) {
        if (!gameManager.getRooms().containsKey(roomId)) {
            log.info("방 상태 확인 [방ID: {}] - 방이 존재하지 않음", roomId);
            return;
        }
        
        // 해당 방에 있는 세션 찾기
        Set<String> roomPlayerIds = gameManager.getRooms().get(roomId).stream()
                .map(PlayerDto::getUserId)
                .collect(Collectors.toSet());
        
        // 해당 방 플레이어의 세션 정보
        Map<String, WebSocketSession> roomSessions = sessions.entrySet().stream()
                .filter(entry -> roomPlayerIds.contains(entry.getKey()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        
        // 방의 플레이어 정보와 세션 정보 조합
        StringBuilder playerStatus = new StringBuilder();
        for (String userId : roomSessions.keySet()) {
            WebSocketSession session = roomSessions.get(userId);
            String sessionId = session != null ? session.getId().substring(0, Math.min(4, session.getId().length())) : "none";
            playerStatus.append(userId).append("(").append(sessionId).append("), ");
        }
        
        String status = playerStatus.length() > 0 
                ? playerStatus.substring(0, playerStatus.length() - 2)
                : "없음";
        
        log.info("방 상태 [방ID: {}, 플레이어 수: {}, 세션 수: {}, 현재 참가자: {}]", 
                roomId, roomPlayerIds.size(), roomSessions.size(), status);
        
        // 세션 상태 확인
        long openSessionCount = roomSessions.values().stream()
                .filter(session -> session != null && session.isOpen())
                .count();
        
        log.debug("방 세션 상태 [방ID: {}, 활성세션: {}개, 총세션: {}개]", 
                roomId, openSessionCount, roomSessions.size());
        
        // 개별 세션 상태
        for (Map.Entry<String, WebSocketSession> entry : roomSessions.entrySet()) {
            WebSocketSession session = entry.getValue();
            if (session != null) {
                log.debug("개별 세션 상태 [방ID: {}, 사용자ID: {}, 세션ID: {}, 열림: {}]", 
                        roomId, entry.getKey(), session.getId(), session.isOpen());
            } else {
                log.debug("개별 세션 상태 [방ID: {}, 사용자ID: {}, 세션: null]", roomId, entry.getKey());
            }
        }
    }
    
    /**
     * 세션 ID로 사용자 ID 찾기
     * @param sessionId 세션 ID
     * @return 사용자 ID 또는 null
     */
    public String getUserIdBySessionId(String sessionId) {
        return sessions.entrySet().stream()
                .filter(entry -> entry.getValue().getId().equals(sessionId))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }
    
    /**
     * 사용자 ID로 방 ID 찾기
     * @param userId 사용자 ID
     * @return 방 ID 또는 null
     */
    public String getRoomIdByUserId(String userId) {
        for (Map.Entry<String, Set<PlayerDto>> entry : gameManager.getRooms().entrySet()) {
            boolean exists = entry.getValue().stream()
                    .anyMatch(player -> player.getUserId().equals(userId));
            if (exists) {
                return entry.getKey();
            }
        }
        return null;
    }

    /**
     * 세션 해제 (userId와 sessionId를 모두 받는 버전)
     * @param userId 사용자 ID
     * @param sessionId 세션 ID
     */
    public void unregisterSession(String userId, String sessionId) {
        WebSocketSession removed = sessions.remove(userId);
        if (removed != null) {
            log.info("세션 해제 [사용자ID: {}, 세션ID: {}]", userId, sessionId);
        }
    }
} 