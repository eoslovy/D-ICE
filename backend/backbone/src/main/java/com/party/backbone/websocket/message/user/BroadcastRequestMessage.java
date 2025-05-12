package com.party.backbone.websocket.message.user;

import com.party.backbone.websocket.message.IdempotentMessage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BroadcastRequestMessage implements IdempotentMessage, UserMessage {
	private String requestId;
	private String userId;
	private String payload;
}
