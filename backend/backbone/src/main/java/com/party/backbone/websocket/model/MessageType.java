package com.party.backbone.websocket.model;

import com.party.backbone.websocket.message.GameMessage;

public interface MessageType {
	Class<? extends GameMessage> getMessageClass();

	String name();
}