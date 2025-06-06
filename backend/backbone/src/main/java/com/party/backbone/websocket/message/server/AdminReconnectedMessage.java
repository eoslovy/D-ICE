package com.party.backbone.websocket.message.server;

import com.party.backbone.websocket.message.GameMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminReconnectedMessage implements GameMessage {
	private String requestId;
	private String userId;
}
