package com.party.backbone.websocket.handler;

import java.util.Collection;
import java.util.List;

import org.springframework.web.socket.WebSocketSession;

public interface SessionRegistry {
	void register(String id, WebSocketSession session);

	WebSocketSession get(String id);

	List<WebSocketSession> getOpenSessions(List<String> ids);

	List<WebSocketSession> getAllOpenSessions();

	void unregister(String id);

	void unregisterAll(Collection<String> ids);

	void closeSession(String id);

	void closeSessionAll(Collection<String> userIds);
}
