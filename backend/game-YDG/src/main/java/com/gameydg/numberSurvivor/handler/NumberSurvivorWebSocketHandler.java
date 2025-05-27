package com.gameydg.numberSurvivor.handler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameydg.numberSurvivor.dto.NumberSurvivorJoinDto;
import com.gameydg.numberSurvivor.dto.NumberSurvivorSelectDto;
import com.gameydg.numberSurvivor.service.NumberSurvivorService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// 숫자 서바이버 웹소켓 핸들러 - 클라이언트 연결 및 메시지 라우팅 담당
@Slf4j
@Component
@RequiredArgsConstructor
public class NumberSurvivorWebSocketHandler extends TextWebSocketHandler {
	private final ObjectMapper objectMapper;
	private final NumberSurvivorService numberSurvivorService;

	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
		String payload = message.getPayload();
		// log.info("메시지 수신: {}", payload);

		JsonNode jsonNode = objectMapper.readTree(payload);
		String type = jsonNode.get("type").asText();

		switch (type) {
			case "NUMBER_SURVIVOR_JOIN":
				NumberSurvivorJoinDto joinDto = objectMapper.treeToValue(jsonNode, NumberSurvivorJoinDto.class);
				numberSurvivorService.handleJoin(session, joinDto);
				break;
			case "NUMBER_SURVIVOR_START":
				String roomCode = jsonNode.get("roomCode").asText();
				numberSurvivorService.handleStart(roomCode);
				break;
			case "NUMBER_SURVIVOR_SELECT":
				numberSurvivorService.handleSelect(session,
					objectMapper.treeToValue(jsonNode, NumberSurvivorSelectDto.class));
				break;
			default:
				log.warn("알 수 없는 메시지 타입: {}", type);
		}
	}

	@Override
	public void afterConnectionEstablished(WebSocketSession session) {
		String sessionId = session.getId();
		// 웹소켓 세션 ID는 실제 사용자 ID와 매핑될 때까지 임시로 보관
		// 실제 사용자 ID 등록은 JOIN 메시지를 받은 후 서비스 레이어에서 처리
		// log.info("새 웹소켓 연결 수립: {}", sessionId);
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
		// log.info("웹소켓 연결 종료: {}, 상태: {}", session.getId(), status);

		// 서비스 레이어에서 연결 종료 처리
		numberSurvivorService.handleDisconnect(session.getId());
	}
}
