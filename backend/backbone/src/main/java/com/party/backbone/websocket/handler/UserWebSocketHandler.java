package com.party.backbone.websocket.handler;

import java.io.IOException;
import java.net.URI;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.party.backbone.room.RoomRedisRepository;
import com.party.backbone.websocket.dispatch.registry.UserMessageHandlerRegistry;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.server.ErrorMessage;
import com.party.backbone.websocket.model.UserMessageType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserWebSocketHandler extends TextWebSocketHandler {

	private final ObjectMapper objectMapper;
	private final UserMessageHandlerRegistry registry;
	private final RoomRedisRepository roomRepository;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws IOException {
		URI uri = session.getUri();
		assert uri != null;
		String path = uri.getPath();
		String prefix = "/ws/game/user/";
		if (!path.startsWith(prefix)) {
			session.close(CloseStatus.BAD_DATA.withReason("Invalid path"));
			return;
		}

		String roomCode = path.substring(prefix.length());

		if (!roomCode.matches("^\\d{6}$")) {
			session.close(CloseStatus.BAD_DATA.withReason("Invalid roomCode format"));
			return;
		}

		if (!roomRepository.exists(roomCode)) {
			session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid room code"));
			return;
		}
		session.getAttributes().put("roomCode", roomCode);
		log.info("[USER_WEBSOCKET] connection established: {}, room: {}", session.getId(), roomCode);
	}

	@Override
	public void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws IOException {
		GameMessage message = objectMapper.readValue(textMessage.getPayload(), GameMessage.class);
		String roomCode = (String)session.getAttributes().get("roomCode");
		try {
			log.info("[USER_WEBSOCKET] message : {}", message);
			UserMessageType type = UserMessageType.fromMessage(message);
			registry.getHandler(type).handle(message, roomCode, session);
		} catch (Exception e) {
			log.error("[{}] 예외 발생", this.getClass().getSimpleName(), e);
			session.sendMessage(
				new TextMessage(objectMapper.writeValueAsString(new ErrorMessage(message.getRequestId()))));
		}
	}

	@Override
	public void handleTransportError(WebSocketSession session, Throwable exception) {
		log.error("[USER_WEBSOCKET] error occurred: {}", exception.getMessage());
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
		log.info("[USER_WEBSOCKET] connected closed: {}, status: {}", session.getId(), status);
	}
}
