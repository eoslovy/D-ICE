package com.party.backbone.websocket.message;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.party.backbone.websocket.message.admin.AdminJoinMessage;
import com.party.backbone.websocket.message.admin.HeartbeatAckMessage;
import com.party.backbone.websocket.message.admin.InitMessage;
import com.party.backbone.websocket.message.admin.NextGameMessage;
import com.party.backbone.websocket.message.server.AdminJoinedMessage;
import com.party.backbone.websocket.message.server.AggregatedAdminMessage;
import com.party.backbone.websocket.message.server.AggregatedClientMessage;
import com.party.backbone.websocket.message.server.EndAdminMessage;
import com.party.backbone.websocket.message.server.EndClientMessage;
import com.party.backbone.websocket.message.server.ErrorMessage;
import com.party.backbone.websocket.message.server.HeartbeatMessage;
import com.party.backbone.websocket.message.server.JoinedAdminMessage;
import com.party.backbone.websocket.message.server.JoinedClientMessage;
import com.party.backbone.websocket.message.server.WaitMessage;
import com.party.backbone.websocket.message.user.JoinMessage;
import com.party.backbone.websocket.message.user.SubmitMessage;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
	@JsonSubTypes.Type(value = AdminJoinMessage.class, name = "ADMIN_JOIN"),
	@JsonSubTypes.Type(value = AdminJoinedMessage.class, name = "ADMIN_JOINED"),
	@JsonSubTypes.Type(value = HeartbeatMessage.class, name = "HEARTBEAT"),
	@JsonSubTypes.Type(value = HeartbeatAckMessage.class, name = "HEARTBEAT_ACK"),
	@JsonSubTypes.Type(value = JoinMessage.class, name = "JOIN"),
	@JsonSubTypes.Type(value = JoinedClientMessage.class, name = "JOINED_CLIENT"),
	@JsonSubTypes.Type(value = JoinedAdminMessage.class, name = "JOINED_ADMIN"),
	@JsonSubTypes.Type(value = InitMessage.class, name = "INIT"),
	@JsonSubTypes.Type(value = WaitMessage.class, name = "WAIT"),
	@JsonSubTypes.Type(value = SubmitMessage.class, name = "SUBMIT"),
	@JsonSubTypes.Type(value = AggregatedClientMessage.class, name = "AGGREGATED_CLIENT"),
	@JsonSubTypes.Type(value = AggregatedAdminMessage.class, name = "AGGREGATED_ADMIN"),
	@JsonSubTypes.Type(value = NextGameMessage.class, name = "NEXT_GAME"),
	@JsonSubTypes.Type(value = EndClientMessage.class, name = "END_CLIENT"),
	@JsonSubTypes.Type(value = EndAdminMessage.class, name = "END_ADMIN"),
	@JsonSubTypes.Type(value = ErrorMessage.class, name = "ERROR"),
})
public interface GameMessage {
	String getRequestId();
}