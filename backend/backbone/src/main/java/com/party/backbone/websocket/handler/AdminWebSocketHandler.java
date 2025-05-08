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
import com.party.backbone.websocket.dispatch.registry.AdminMessageHandlerRegistry;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.server.ErrorMessage;
import com.party.backbone.websocket.model.AdminMessageType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminWebSocketHandler extends TextWebSocketHandler {
	private final ObjectMapper objectMapper;
	private final AdminMessageHandlerRegistry registry;
	private final RoomRedisRepository roomRepository;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws IOException {
		URI uri = session.getUri();
		assert uri != null;
		String path = uri.getPath();
		String prefix = "/ws/game/admin/";
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
		log.info("[ADMIN_WEBSOCKET] connection established: {}, room: {}", session.getId(), roomCode);
	}

	@Override
	public void handleTextMessage(WebSocketSession session, TextMessage textMessage) throws IOException {
		try {
			GameMessage message = objectMapper.readValue(textMessage.getPayload(), GameMessage.class);
			String roomCode = (String)session.getAttributes().get("roomCode");
			log.info("[ADMIN_WEBSOCKET] message : {}", message);
			AdminMessageType type = AdminMessageType.fromMessage(message);
			registry.getHandler(type).handle(message, roomCode, session);
		} catch (Exception e) {
			log.error("[ADMIN_WEBSOCKET] 예외 발생", e);
			session.sendMessage(
				new TextMessage(
					objectMapper.writeValueAsString(new ErrorMessage(e.getMessage()))));
		}
	}

	@Override
	public void handleTransportError(WebSocketSession session, Throwable exception) {
		log.error("[ADMIN_WEBSOCKET] error occurred: {}", exception.getMessage());
	}
}
