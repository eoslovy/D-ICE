package com.gamekjh.handler;

import java.net.URI;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gamekjh.dto.GraphHighClientMessage;
import com.gamekjh.model.GameType;
import com.gamekjh.service.GraphHighService;
import com.gamekjh.utils.GameServerUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class GraphHighWebSocketHandler extends TextWebSocketHandler {

	private final GameServerUtil gameServerUtil;
	private final ObjectMapper objectMapper;
	private final GraphHighService graphHighService;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) {
		log.info("GraphHigh: WebSocket 연결 수립됨 → " + session.getId());
		URI uri = session.getUri();
		if (uri != null) {
			Map<String, String> params = UriComponentsBuilder.fromUri(uri)
				.build()
				.getQueryParams()
				.toSingleValueMap();

			String roomCode = params.get("roomCode");
			String roundCode = params.get("roundCode");
			String userCode = params.get("userCode");

			gameServerUtil.joinGameConnection(GameType.GameGraphHigh, roomCode, roundCode, userCode, session);
			log.info("roomCode={}, userCode={}", roomCode, userCode);
		}
	}

	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
		// 클라이언트로부터 메시지 수신 시 동작
		GraphHighClientMessage payload = objectMapper.readValue(message.getPayload(), GraphHighClientMessage.class);
		log.info("GraphHigh: 메시지 수신 → " + payload);
		URI uri = session.getUri();
		if (uri != null) {
			Map<String, String> params = UriComponentsBuilder.fromUri(uri)
				.build()
				.getQueryParams()
				.toSingleValueMap();

			String roomCode = params.get("roomCode");
			String roundCode = params.get("roundCode");
			String userCode = params.get("userCode");
			graphHighService.updateScoreAndSendMessage(session, roomCode, payload);

			log.info("roomCode={}, userCode={}", roomCode, userCode);
		}

		session.sendMessage(new TextMessage("GraphHigh echo: " + payload));
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {

		log.info("GraphHigh: 연결 종료됨 → " + session.getId());
	}
}
