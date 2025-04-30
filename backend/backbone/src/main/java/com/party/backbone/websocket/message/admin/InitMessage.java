package com.party.backbone.websocket.message.admin;

import com.party.backbone.websocket.message.IdempotentMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitMessage implements IdempotentMessage {
	private String requestId;
	private String administratorId;
	private int totalRound;
}
