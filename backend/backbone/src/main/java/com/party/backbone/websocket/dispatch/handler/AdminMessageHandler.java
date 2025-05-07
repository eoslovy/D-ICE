package com.party.backbone.websocket.dispatch.handler;

import com.party.backbone.websocket.model.AdminMessageType;

public interface AdminMessageHandler {
	AdminMessageType getMessageType();
}
