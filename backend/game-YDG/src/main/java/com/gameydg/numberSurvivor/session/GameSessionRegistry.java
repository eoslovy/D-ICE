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

// 게임 세션 레지스트리 - 웹소켓 세션 관리를 담당
@Slf4j
@Component
@RequiredArgsConstructor
public class GameSessionRegistry {
	private final ObjectMapper objectMapper;
	private final NumberSurvivorManager gameManager;

	// 사용자 ID를 키로 WebSocketSession을 저장하는 맵
	private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

	// 세션 등록
	public void registerSession(String userId, WebSocketSession session) {
		sessions.put(userId, session);
		log.info("[세션 레지스트리] 세션 등록 [사용자ID: {}]", userId);
	}

	// 세션 해제
	public void unregisterSession(String userId) {
		WebSocketSession removed = sessions.remove(userId);
		if (removed != null) {
			log.info("[세션 레지스트리] 세션 해제 [사용자ID: {}]", userId);
		}
	}

	// 방에 메시지 브로드캐스팅
	public void broadcastMessage(String roomCode, Object message) throws IOException {
		String messageStr = objectMapper.writeValueAsString(message);
		List<String> invalidUserIds = new ArrayList<>();

		if (!gameManager.getRooms().containsKey(roomCode)) {
			log.warn("[세션 레지스트리] 브로드캐스트 실패 - 존재하지 않는 방 [방ID: {}]", roomCode);
			return;
		}

		Set<PlayerDto> players = new HashSet<>(gameManager.getRooms().get(roomCode));

		for (PlayerDto player : players) {
			try {
				WebSocketSession session = sessions.get(player.getUserId());
				if (session != null && session.isOpen()) {
					synchronized (session) {
						session.sendMessage(new TextMessage(messageStr));
					}
				} else {
					invalidUserIds.add(player.getUserId());
				}
			} catch (IOException e) {
				log.error("[세션 레지스트리] 메시지 전송 실패 [방ID: {}, 사용자ID: {}]", roomCode, player.getUserId(), e);
				invalidUserIds.add(player.getUserId());
			}
		}

		if (!invalidUserIds.isEmpty()) {
			log.warn("[세션 레지스트리] 유효하지 않은 세션 제거 [방ID: {}, 사용자: {}]", roomCode, invalidUserIds);
			invalidUserIds.forEach(this::unregisterSession);
		}
	}

	// 단일 세션에 메시지 전송
	public void sendMessage(WebSocketSession session, Object message) throws IOException {
		if (session != null && session.isOpen()) {
			String messageStr = objectMapper.writeValueAsString(message);
			session.sendMessage(new TextMessage(messageStr));
		}
	}

	// 방에 활성 세션이 있는지 확인
	public boolean isRoomEmpty(String roomCode) {
		if (!gameManager.getRooms().containsKey(roomCode)) {
			return true;
		}

		long activeSessionCount = gameManager.getRooms().get(roomCode).stream()
			.map(player -> sessions.get(player.getUserId()))
			.filter(session -> session != null && session.isOpen())
			.count();

		boolean isEmpty = activeSessionCount == 0;
		if (isEmpty) {
			log.info("[세션 레지스트리] 빈 방 확인 [방ID: {}]", roomCode);
		}
		return isEmpty;
	}

	// 모든 활성 세션 가져오기
	public Map<String, WebSocketSession> getAllSessions() {
		return sessions;
	}

	// 방의 상태를 로깅
	public void logRoomStatus(String roomCode) {
		if (!gameManager.getRooms().containsKey(roomCode)) {
			log.info("[세션 레지스트리] 방 상태 확인 - 존재하지 않는 방 [방ID: {}]", roomCode);
			return;
		}

		Set<String> roomPlayerIds = gameManager.getRooms().get(roomCode).stream()
			.map(PlayerDto::getUserId)
			.collect(Collectors.toSet());

		Map<String, WebSocketSession> roomSessions = sessions.entrySet().stream()
			.filter(entry -> roomPlayerIds.contains(entry.getKey()))
			.collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

		long openSessionCount = roomSessions.values().stream()
			.filter(session -> session != null && session.isOpen())
			.count();

		log.info("[세션 레지스트리] 방 상태 [방ID: {}, 플레이어: {}명, 활성세션: {}개]",
			roomCode, roomPlayerIds.size(), openSessionCount);
	}

	// 세션 ID로 사용자 ID 찾기
	public String getUserIdBySessionId(String sessionId) {
		return sessions.entrySet().stream()
			.filter(entry -> entry.getValue().getId().equals(sessionId))
			.map(Map.Entry::getKey)
			.findFirst()
			.orElse(null);
	}

	// 사용자 ID로 방 ID 찾기
	public String getRoomCodeByUserId(String userId) {
		for (Map.Entry<String, Set<PlayerDto>> entry : gameManager.getRooms().entrySet()) {
			boolean exists = entry.getValue().stream()
				.anyMatch(player -> player.getUserId().equals(userId));
			if (exists) {
				return entry.getKey();
			}
		}
		return null;
	}

	// 세션 해제 (userId와 sessionId를 모두 받는 버전)
	public void unregisterSession(String userId, String sessionId) {
		WebSocketSession removed = sessions.remove(userId);
		if (removed != null) {
			log.info("[세션 레지스트리] 세션 해제 [사용자ID: {}]", userId);
		}
	}
} 