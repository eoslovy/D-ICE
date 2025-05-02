package com.party.backbone.websocket.broadcast;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncMessageSender {
	private final Executor executor;

	public void send(WebSocketSession session, String payloadText) {
		CompletableFuture.runAsync(() -> {
			long start = System.currentTimeMillis();
			try {
				if (session.isOpen()) {
					session.sendMessage(new TextMessage(payloadText));
				}
			} catch (IOException e) {
				log.error("[SendAsync] send failed. sessionId={}, error={}", session.getId(), e.getMessage());
			} finally {
				long end = System.currentTimeMillis();
				log.info("[SendAsync] sessionId={} sendDuration={}ms finishedAt={}",
					session.getId(), (end - start),
					LocalDateTime.ofInstant(Instant.ofEpochMilli(end), ZoneId.systemDefault()));
			}
		}, executor);
	}
}
