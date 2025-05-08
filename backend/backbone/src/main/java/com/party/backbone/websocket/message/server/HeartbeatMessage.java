package com.party.backbone.websocket.message.server;

import com.party.backbone.websocket.message.GameMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HeartbeatMessage implements GameMessage {
	private String roomCode;
	private int userCount;
}
