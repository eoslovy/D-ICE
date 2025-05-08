package com.party.backbone.dispatch;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

public class MockWebSocketSession implements WebSocketSession {

	private final String id;
	private boolean open = true;

	public MockWebSocketSession(String id) {
		this.id = id;
	}

	@Override
	public void sendMessage(WebSocketMessage<?> message) throws IOException {
		try {
			Thread.sleep(10 + (long)(Math.random() * 40)); // 10~50ms 랜덤 지연
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	@Override
	public boolean isOpen() {
		return open;
	}

	@Override
	public String getId() {
		return id;
	}

	@Override
	public void close() {
	}

	@Override
	public void close(org.springframework.web.socket.CloseStatus status) {
	}

	@Override
	public URI getUri() {
		return null;
	}

	@Override
	public HttpHeaders getHandshakeHeaders() {
		return null;
	}

	@Override
	public Principal getPrincipal() {
		return null;
	}

	@Override
	public InetSocketAddress getLocalAddress() {
		return null;
	}

	@Override
	public InetSocketAddress getRemoteAddress() {
		return null;
	}

	@Override
	public Map<String, Object> getAttributes() {
		return Collections.emptyMap();
	}

	@Override
	public String getAcceptedProtocol() {
		return null;
	}

	@Override
	public void setTextMessageSizeLimit(int messageSizeLimit) {
	}

	@Override
	public int getTextMessageSizeLimit() {
		return 0;
	}

	@Override
	public void setBinaryMessageSizeLimit(int messageSizeLimit) {
	}

	@Override
	public int getBinaryMessageSizeLimit() {
		return 0;
	}

	@Override
	public List<org.springframework.web.socket.WebSocketExtension> getExtensions() {
		return Collections.emptyList();
	}
}
