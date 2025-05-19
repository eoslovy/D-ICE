package com.party.backbone.websocket.model;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.server.AdminJoinedMessage;
import com.party.backbone.websocket.message.server.AggregatedAdminMessage;
import com.party.backbone.websocket.message.server.AggregatedUserMessage;
import com.party.backbone.websocket.message.server.EndMessage;
import com.party.backbone.websocket.message.server.ErrorMessage;
import com.party.backbone.websocket.message.server.HeartbeatMessage;
import com.party.backbone.websocket.message.server.JoinedAdminMessage;
import com.party.backbone.websocket.message.server.JoinedUserMessage;
import com.party.backbone.websocket.message.server.NextGameMessage;
import com.party.backbone.websocket.message.server.WaitMessage;

import lombok.Getter;

@Getter
public enum ServerMessageType implements MessageType {
	ADMIN_JOINED(AdminJoinedMessage.class),
	HEARTBEAT(HeartbeatMessage.class),
	NEXT_GAME(NextGameMessage.class),
	WAIT(WaitMessage.class),
	USER_JOINED(JoinedUserMessage.class),
	USER_JOINED_ADMIN(JoinedAdminMessage.class),
	AGGREGATED_USER(AggregatedUserMessage.class),
	AGGREGATED_ADMIN(AggregatedAdminMessage.class),
	END(EndMessage.class),
	SERVER_ERROR(ErrorMessage.class),
	;

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
