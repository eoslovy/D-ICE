package com.party.backbone.websocket.dispatch.handler;

import com.party.backbone.websocket.model.UserMessageType;

public interface UserMessageHandler {
	UserMessageType getMessageType();
}
