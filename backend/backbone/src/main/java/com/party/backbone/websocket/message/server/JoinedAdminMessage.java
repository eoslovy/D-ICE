package com.party.backbone.websocket.message.server;

import com.party.backbone.websocket.message.GameMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JoinedAdminMessage implements GameMessage {
	private String requestId;
	private String roomCode;
	private String userId;
	private String nickname;
	private int userCount;
}
