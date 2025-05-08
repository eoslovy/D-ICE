package com.party.backbone.dispatch;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.socket.WebSocketSession;

import com.party.backbone.websocket.handler.SessionRegistry;

public class MockSessionRegistry implements SessionRegistry {

	private final Map<String, WebSocketSession> sessionMap = new ConcurrentHashMap<>();

	@Override
	public void register(String id, WebSocketSession session) {
		sessionMap.put(id, session);
	}

	@Override
	public WebSocketSession get(String id) {
		return null;
	}

	public List<WebSocketSession> getOpenSessions(List<String> userIds) {
		List<WebSocketSession> sessions = new ArrayList<>();
		for (String userId : userIds) {
			WebSocketSession session = sessionMap.get(userId);
			if (session != null && session.isOpen()) {
				sessions.add(session);
			}
		}
		return sessions;
	}

	@Override
	public void unregister(String id) {

	}

	@Override
	public void unregisterAll(Collection<String> ids) {

	}

	@Override
	public void closeSession(String id) {

	}

	@Override
	public void closeSessionAll(Collection<String> userIds) {

	}
}