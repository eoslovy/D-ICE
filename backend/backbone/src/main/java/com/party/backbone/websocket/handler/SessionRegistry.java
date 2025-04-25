package com.party.backbone.websocket.handler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class SessionRegistry {

	private final Map<String, WebSocketSession> sessionMap = new ConcurrentHashMap<>();

	public void register(String id, WebSocketSession session) {
		sessionMap.put(id, session);
	}

	public WebSocketSession get(String id) {
		return sessionMap.get(id);
	}

	public void unregister(String id) {
		sessionMap.remove(id);
	}

	// public void unregister(WebSocketSession session) {
	// 	sessionMap.entrySet().removeIf(e -> e.getValue().getId().equals(session.getId()));
	// }
}