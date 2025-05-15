package com.party.backbone.websocket.scheduler;

import java.io.IOException;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.WebSocketSession;

import com.party.backbone.websocket.handler.SessionRegistry;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class PingScheduler {
	private final SessionRegistry sessionRegistry;

	@Scheduled(fixedRate = 5000)
	public void sendHeartbeats() {
		List<WebSocketSession> sessions = sessionRegistry.getAllOpenSessions(); // 현재 인스턴스가 보유한 세션
		for (WebSocketSession session : sessions) {
			try {
				session.sendMessage(new PingMessage());
			} catch (IOException e) {
				log.error("Failed to send ping", e);
			}
		}
	}
}