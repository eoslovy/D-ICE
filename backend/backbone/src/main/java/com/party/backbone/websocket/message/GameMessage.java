package com.party.backbone.websocket.message;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.party.backbone.websocket.message.admin.AdminJoinMessage;
import com.party.backbone.websocket.message.admin.HeartbeatAckMessage;
import com.party.backbone.websocket.message.admin.InitMessage;
import com.party.backbone.websocket.message.admin.StartGameMessage;
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
import com.party.backbone.websocket.message.user.SubmitMessage;
import com.party.backbone.websocket.message.user.UserJoinMessage;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
	@JsonSubTypes.Type(value = AdminJoinMessage.class, name = "ADMIN_JOIN"),
	@JsonSubTypes.Type(value = AdminJoinedMessage.class, name = "ADMIN_JOINED"),
	@JsonSubTypes.Type(value = HeartbeatMessage.class, name = "HEARTBEAT"),
	@JsonSubTypes.Type(value = HeartbeatAckMessage.class, name = "HEARTBEAT_ACK"),
	@JsonSubTypes.Type(value = UserJoinMessage.class, name = "USER_JOIN"),
	@JsonSubTypes.Type(value = JoinedUserMessage.class, name = "USER_JOINED"),
	@JsonSubTypes.Type(value = JoinedAdminMessage.class, name = "USER_JOINED_ADMIN"),
	@JsonSubTypes.Type(value = InitMessage.class, name = "INIT"),
	@JsonSubTypes.Type(value = NextGameMessage.class, name = "NEXT_GAME"),
	@JsonSubTypes.Type(value = StartGameMessage.class, name = "START_GAME"),
	@JsonSubTypes.Type(value = WaitMessage.class, name = "WAIT"),
	@JsonSubTypes.Type(value = SubmitMessage.class, name = "SUBMIT"),
	@JsonSubTypes.Type(value = AggregatedUserMessage.class, name = "AGGREGATED_USER"),
	@JsonSubTypes.Type(value = AggregatedAdminMessage.class, name = "AGGREGATED_ADMIN"),
	@JsonSubTypes.Type(value = EndMessage.class, name = "END"),
	@JsonSubTypes.Type(value = ErrorMessage.class, name = "ERROR"),
})
public interface GameMessage {
}