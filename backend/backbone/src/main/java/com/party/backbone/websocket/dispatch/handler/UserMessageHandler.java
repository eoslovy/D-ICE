package com.party.backbone.websocket.dispatch.handler;

import java.io.IOException;

import org.springframework.web.socket.WebSocketSession;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.UserMessageType;

public interface UserMessageHandler<T extends GameMessage> {
	void handle(T message, String roomCode, WebSocketSession session) throws IOException;

	UserMessageType getMessageType();
}
