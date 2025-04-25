package com.party.backbone.websocket.model;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.server.AggregatedAdminMessage;
import com.party.backbone.websocket.message.server.AggregatedClientMessage;
import com.party.backbone.websocket.message.server.CreatedMessage;
import com.party.backbone.websocket.message.server.EndAdminMessage;
import com.party.backbone.websocket.message.server.EndClientMessage;
import com.party.backbone.websocket.message.server.ErrorMessage;
import com.party.backbone.websocket.message.server.HeartbeatMessage;
import com.party.backbone.websocket.message.server.JoinedAdminMessage;
import com.party.backbone.websocket.message.server.JoinedClientMessage;
import com.party.backbone.websocket.message.server.WaitMessage;

import lombok.Getter;

@Getter
public enum ServerMessageType implements MessageType {
	CREATED(CreatedMessage.class),
	HEARTBEAT(HeartbeatMessage.class),
	WAIT(WaitMessage.class),
	JOINED_CLIENT(JoinedClientMessage.class),
	AGGREGATED_CLIENT(AggregatedClientMessage.class),
	JOINED_ADMIN(JoinedAdminMessage.class),
	AGGREGATED_ADMIN(AggregatedAdminMessage.class),
	END_CLIENT(EndClientMessage.class),
	END_ADMIN(EndAdminMessage.class),
	ERROR(ErrorMessage.class);

	private final Class<? extends GameMessage> messageClass;

	ServerMessageType(Class<? extends GameMessage> messageClass) {
		this.messageClass = messageClass;
	}

	private static final Map<Class<? extends GameMessage>, ServerMessageType> TYPE_MAP =
		Arrays.stream(values()).collect(Collectors.toMap(ServerMessageType::getMessageClass, Function.identity()));

	public static ServerMessageType fromMessage(GameMessage message) {
		return TYPE_MAP.get(message.getClass());
	}
}
