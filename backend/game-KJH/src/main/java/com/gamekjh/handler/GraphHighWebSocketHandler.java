package com.gamekjh.handler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class GraphHighWebSocketHandler extends TextWebSocketHandler {

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception {
		log.info("GraphHigh: WebSocket 연결 수립됨 → " + session.getId());
	}

	@Override
	protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
		// 클라이언트로부터 메시지 수신 시 동작
		String payload = message.getPayload();
		log.info("GraphHigh: 메시지 수신 → " + payload);

		// echo 예시
		session.sendMessage(new TextMessage("GraphHigh echo: " + payload));
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
		// 연결 종료 시 동작
		log.info("GraphHigh: 연결 종료됨 → " + session.getId());
	}
}
