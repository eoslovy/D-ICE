package com.party.backbone.websocket.handler;

import java.io.IOException;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import lombok.extern.slf4j.Slf4j;

@Slf4j
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

	public void unregisterAll(Collection<String> ids) {
		if (ids == null || ids.isEmpty()) {
			return;
		}
		for (String id : ids) {
			sessionMap.remove(id);
		}
	}

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