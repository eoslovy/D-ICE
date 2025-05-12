package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;
import java.util.Objects;

import org.springframework.web.socket.WebSocketSession;

import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.dispatch.repository.IdempotencyRedisRepository;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.IdempotentMessage;
import com.party.backbone.websocket.message.admin.AdminMessage;
import com.party.backbone.websocket.message.user.UserMessage;
import com.sun.jdi.request.DuplicateRequestException;

public abstract class GameMessageHandler<T extends GameMessage> {
	protected final IdempotencyRedisRepository idempotencyRedisRepository;
	protected final RoomRedisRepository roomRepository;

	protected GameMessageHandler(IdempotencyRedisRepository idempotencyRedisRepository,
		RoomRedisRepository roomRepository) {
		this.idempotencyRedisRepository = idempotencyRedisRepository;
		this.roomRepository = roomRepository;
	}

	public final void handle(T message, String roomCode, WebSocketSession session) throws IOException {
		checkIdempotencyBefore(message, roomCode);
		validateAdministrator(message, roomCode);
		validateUser(message, roomCode);
		doHandle(message, roomCode, session);
		markProcessedAfter(message, roomCode);
	}

	private void validateAdministrator(T message, String roomCode) {
		if (!(message instanceof AdminMessage adminMessage)) {
			return;
		}
		String expectedId = roomRepository.getAdministratorIdOfRoom(roomCode);
		if (!Objects.equals(expectedId, adminMessage.getAdministratorId())) {
			throw new IllegalArgumentException(
				"[validateAdministrator] Wrong administratorId : " + adminMessage.getAdministratorId() + " for room : "
					+ roomCode);
		}
	}

	private void validateUser(T message, String roomCode) {
		if (!(message instanceof UserMessage userMessage)) {
			return;
		}
		if (Boolean.FALSE.equals(roomRepository.hasPlayer(roomCode, userMessage.getUserId()))) {
			throw new IllegalArgumentException(
				"[validateUser] Wrong userId : " + userMessage.getUserId() + " for room : "
					+ roomCode);
		}
	}

	private void checkIdempotencyBefore(T message, String roomCode) {
		if (!(message instanceof IdempotentMessage idempotentMessage)) {
			return;
		}
		if (idempotencyRedisRepository.isRequestIdProcessed(roomCode, idempotentMessage.getRequestId())) {
			throw new DuplicateRequestException("Request already processed: " + idempotentMessage.getRequestId());
		}
	}

	private void markProcessedAfter(T message, String roomCode) {
		if (!(message instanceof IdempotentMessage idempotentMessage)) {
			return;
		}
		idempotencyRedisRepository.markRequestIdProcessed(roomCode, idempotentMessage.getRequestId());
	}

	protected abstract void doHandle(T message, String roomCode, WebSocketSession session) throws IOException;
}
