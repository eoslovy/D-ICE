package com.party.backbone.websocket.model;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.message.user.BroadcastRequestMessage;
import com.party.backbone.websocket.message.user.CheckEndedMessage;
import com.party.backbone.websocket.message.user.SubmitMessage;
import com.party.backbone.websocket.message.user.UserJoinMessage;
import com.party.backbone.websocket.message.user.UserReconnectMessage;

import lombok.Getter;

@Getter
public enum UserMessageType implements MessageType {
	JOIN(UserJoinMessage.class),
	SUBMIT(SubmitMessage.class),
	BROADCAST_REQUEST(BroadcastRequestMessage.class),
	USER_RECONNECT(UserReconnectMessage.class),
	CHECK_ENDED(CheckEndedMessage.class),
	;
	private final Class<? extends GameMessage> messageClass;

	UserMessageType(Class<? extends GameMessage> messageClass) {
		this.messageClass = messageClass;
	}

	private static final Map<Class<? extends GameMessage>, UserMessageType> TYPE_MAP =
		Arrays.stream(values()).collect(Collectors.toMap(UserMessageType::getMessageClass, Function.identity()));

	public static UserMessageType fromMessage(GameMessage message) {
		return TYPE_MAP.get(message.getClass());
	}
}
