package com.party.backbone.websocket.broadcast;

import java.util.List;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class Broadcaster {
	private final AsyncMessageSender asyncMessageSender;

	public void broadcast(List<WebSocketSession> sessions, String payload, String roomCode) {
		for (WebSocketSession session : sessions) {
			asyncMessageSender.send(session, payload);
		}

		log.info("[Broadcast] Completed firing {} sessions in roomCode={}", sessions.size(), roomCode);
	}
}
