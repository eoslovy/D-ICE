package com.party.backbone.websocket.message;

public interface IdempotentMessage extends GameMessage {
	String getRequestId();
}
