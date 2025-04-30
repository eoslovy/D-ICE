package com.party.backbone.websocket.message.admin;

import com.party.backbone.websocket.message.GameMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitMessage implements GameMessage {
	private String requestId;
	private String administratorId;
	private int totalRound;
}
