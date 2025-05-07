package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.web.socket.WebSocketSession;

import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.IdempotentMessage;
import com.sun.jdi.request.DuplicateRequestException;

public abstract class GameMessageHandler<T extends GameMessage> {
	protected final IdempotencyRedisRepository idempotencyRedisRepository;

	protected GameMessageHandler(IdempotencyRedisRepository idempotencyRedisRepository) {
		this.idempotencyRedisRepository = idempotencyRedisRepository;
	}

	public final void handle(T message, String roomCode, WebSocketSession session) throws IOException {
		preHandle(message, roomCode);
		doHandle(message, roomCode, session);
		postHandle(message, roomCode);
	}

	private void preHandle(T message, String roomCode) {
		if (!(message instanceof IdempotentMessage idempotentMessage)) {
			return;
		}
		if (!idempotencyRedisRepository.isRequestIdProcessed(roomCode, idempotentMessage.getRequestId())) {
			throw new DuplicateRequestException("Request already processed: " + idempotentMessage.getRequestId());
		}
	}

	private void postHandle(T message, String roomCode) {
		if (!(message instanceof IdempotentMessage idempotentMessage)) {
			return;
		}
		idempotencyRedisRepository.markRequestIdProcessed(roomCode, idempotentMessage.getRequestId());
	}

	protected abstract void doHandle(T message, String roomCode, WebSocketSession session) throws IOException;
}
