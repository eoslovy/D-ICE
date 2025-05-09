package com.party.backbone.websocket.model;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.admin.AdminJoinMessage;
import com.party.backbone.websocket.message.admin.AdminReconnectMessage;
import com.party.backbone.websocket.message.admin.HeartbeatAckMessage;
import com.party.backbone.websocket.message.admin.InitMessage;
import com.party.backbone.websocket.message.admin.StartGameMessage;

import lombok.Getter;

@Getter
public enum AdminMessageType implements MessageType {
	ADMIN_JOIN(AdminJoinMessage.class),
	INIT(InitMessage.class),
	ADMIN_RECONNECT(AdminReconnectMessage.class),
	HEARTBEAT_ACK(HeartbeatAckMessage.class),
	START_GAME(StartGameMessage.class),
	;
	private final Class<? extends GameMessage> messageClass;

	AdminMessageType(Class<? extends GameMessage> messageClass) {
		this.messageClass = messageClass;
	}

	private static final Map<Class<? extends GameMessage>, AdminMessageType> TYPE_MAP =
		Arrays.stream(values()).collect(Collectors.toMap(AdminMessageType::getMessageClass, Function.identity()));

	public static AdminMessageType fromMessage(GameMessage message) {
		return TYPE_MAP.get(message.getClass());
	}
}
