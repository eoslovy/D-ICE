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
import com.gameydg.numberSurvivor.broadcast.AsyncMessageSender;
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
	private final AsyncMessageSender asyncMessageSender;

	// 사용자 ID를 키로 WebSocketSession을 저장하는 맵
	private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

	// 세션 등록
	public void registerSession(String userId, WebSocketSession session) {
		sessions.put(userId, session);
		// log.info("[세션 레지스트리] 세션 등록 [사용자ID: {}]", userId);
	}

	// 세션 해제
	public void unregisterSession(String userId) {
		WebSocketSession removed = sessions.remove(userId);
		if (removed != null) {
			// log.info("[세션 레지스트리] 세션 해제 [사용자ID: {}]", userId);
		}
	}

	// 방에 메시지 브로드캐스팅 (비동기)
	public void broadcastMessage(String roomCode, Object message) throws IOException {
		String messageStr = objectMapper.writeValueAsString(message);
		List<String> invalidUserIds = new ArrayList<>();

		if (!gameManager.getRooms().containsKey(roomCode)) {
			log.warn("[세션 레지스트리] 브로드캐스트 실패 - 존재하지 않는 방 [방ID: {}]", roomCode);
			return;
		}

		// 동시성 문제를 피하기 위해 복사본 생성
		Set<PlayerDto> players = gameManager.getRooms().get(roomCode);
		if (players == null) {
			log.warn("[세션 레지스트리] 브로드캐스트 실패 - 플레이어 목록이 null [방ID: {}]", roomCode);
			return;
		}
		Set<PlayerDto> playersCopy = new HashSet<>(players);

		// 각 세션마다 독립적인 비동기 작업 생성
		for (PlayerDto player : playersCopy) {
			WebSocketSession session = sessions.get(player.getUserId());
			if (session != null && session.isOpen()) {
				// 비동기: 각 세션마다 별도 스레드에서 처리
				asyncMessageSender.send(session, messageStr);
			} else {
				invalidUserIds.add(player.getUserId());
			}
		}

		// 유효하지 않은 세션 정리
		if (!invalidUserIds.isEmpty()) {
			// log.warn("[세션 레지스트리] 유효하지 않은 세션 제거 [방ID: {}, 사용자: {}]", roomCode, invalidUserIds);
			invalidUserIds.forEach(this::unregisterSession);
		}

		// log.info("[세션 레지스트리] 비동기 브로드캐스트 시작 [방ID: {}, 대상: {}명]", roomCode, playersCopy.size());
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

		Set<PlayerDto> players = gameManager.getRooms().get(roomCode);
		if (players == null) {
			return true;
		}

		// 동시성 문제를 피하기 위해 복사본 생성 후 처리
		long activeSessionCount = new ArrayList<>(players).stream()
			.map(player -> sessions.get(player.getUserId()))
			.filter(session -> session != null && session.isOpen())
			.count();

		boolean isEmpty = activeSessionCount == 0;
		if (isEmpty) {
			// log.info("[세션 레지스트리] 빈 방 확인 [방ID: {}]", roomCode);
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
			// log.info("[세션 레지스트리] 방 상태 확인 - 존재하지 않는 방 [방ID: {}]", roomCode);
			return;
		}

		Set<PlayerDto> players = gameManager.getRooms().get(roomCode);
		if (players == null) {
			// log.info("[세션 레지스트리] 방 상태 확인 - 플레이어 목록이 null [방ID: {}]", roomCode);
			return;
		}

		// 동시성 문제를 피하기 위해 복사본 생성 후 처리
		Set<String> roomPlayerIds = new ArrayList<>(players).stream()
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
		// 동시성 문제를 피하기 위해 entrySet의 복사본 생성
		Map<String, Set<PlayerDto>> roomsCopy = new ConcurrentHashMap<>(gameManager.getRooms());
		
		for (Map.Entry<String, Set<PlayerDto>> entry : roomsCopy.entrySet()) {
			Set<PlayerDto> players = entry.getValue();
			if (players != null) {
				// 플레이어 목록도 복사본으로 처리
				boolean exists = new ArrayList<>(players).stream()
					.anyMatch(player -> player.getUserId().equals(userId));
				if (exists) {
					return entry.getKey();
				}
			}
		}
		return null;
	}

	// 세션 해제 (userId와 sessionId를 모두 받는 버전)
	public void unregisterSession(String userId, String sessionId) {
		WebSocketSession removed = sessions.remove(userId);
		if (removed != null) {
			// log.info("[세션 레지스트리] 세션 해제 [사용자ID: {}]", userId);
		}
	}

	// 방의 모든 연결 종료
	public void closeConnections(String roomCode) {
		if (!gameManager.getRooms().containsKey(roomCode)) {
			log.warn("[세션 레지스트리] 연결 종료 실패 - 존재하지 않는 방 [방ID: {}]", roomCode);
			return;
		}

		// 1. 세션 맵의 복사본 생성
		Map<String, WebSocketSession> sessionsCopy = new ConcurrentHashMap<>(sessions);
		Set<PlayerDto> players = gameManager.getRooms().get(roomCode);
		if (players == null) {
			log.warn("[세션 레지스트리] 연결 종료 실패 - 플레이어 목록이 null [방ID: {}]", roomCode);
			return;
		}
		Set<PlayerDto> playersCopy = new HashSet<>(players);
		List<String> closedUserIds = new ArrayList<>();

		// 2. 세션 종료 처리
		for (PlayerDto player : playersCopy) {
			WebSocketSession session = sessionsCopy.get(player.getUserId());
			if (session != null && session.isOpen()) {
				try {
					synchronized (session) {
						session.close();
					}
					closedUserIds.add(player.getUserId());
					// log.info("[세션 레지스트리] 연결 종료 [방ID: {}, 사용자ID: {}]", roomCode, player.getUserId());
				} catch (IOException e) {
					log.error("[세션 레지스트리] 연결 종료 실패 [방ID: {}, 사용자ID: {}]", roomCode, player.getUserId(), e);
				}
			}
		}

		// 3. 세션 맵에서 제거 (동기화 블록 사용)
		synchronized (this) {
			closedUserIds.forEach(sessions::remove);
		}

		log.info("[세션 레지스트리] 방 연결 종료 완료 [방ID: {}, 종료된 연결: {}개]", roomCode, closedUserIds.size());
	}
} 