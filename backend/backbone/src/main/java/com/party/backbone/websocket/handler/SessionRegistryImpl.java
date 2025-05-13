package com.party.backbone.websocket.handler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SessionRegistryImpl implements SessionRegistry {

	private final Map<String, WebSocketSession> sessionMap = new ConcurrentHashMap<>();

	@Override
	public void register(String id, WebSocketSession session) {
		sessionMap.put(id, session);
	}

	public WebSocketSession get(String id) {
		return sessionMap.get(id);
	}

	@Override
	public List<WebSocketSession> getOpenSessions(List<String> ids) {
		List<WebSocketSession> sessions = new ArrayList<>();
		for (String id : ids) {
			WebSocketSession session = sessionMap.get(id);
			if (session == null) {
				log.warn("session for id {} is null", id);
				continue;
			}
			if (!session.isOpen()) {
				log.warn("session for id {} is not opened", id);
				continue;
			}
			sessions.add(session);
		}
		return sessions;
	}

	@Override
	public List<WebSocketSession> getAllOpenSessions() {
		return sessionMap.values().stream().filter(WebSocketSession::isOpen).toList();
	}

	@Override
	public void unregister(String id) {
		sessionMap.remove(id);
	}

	@Override
	public void unregisterAll(Collection<String> ids) {
		if (ids == null || ids.isEmpty()) {
			return;
		}
		for (String id : ids) {
			sessionMap.remove(id);
		}
	}

	@Override
	public void closeSession(String id) {
		WebSocketSession session = sessionMap.get(id);
		if (session != null && session.isOpen()) {
			try {
				session.close();
			} catch (IOException e) {
				log.warn("Failed to close session for id {}", id, e);
			}
		}
	}

	@Override
	public void closeSessionAll(Collection<String> userIds) {
		if (userIds == null || userIds.isEmpty()) {
			return;
		}
		for (String userId : userIds) {
			var session = get(userId);
			if (session != null && session.isOpen()) {
				try {
					session.close();
				} catch (IOException e) {
					log.warn("Failed to close session for userId {}", userId, e);
				}
			}
		}
	}
}