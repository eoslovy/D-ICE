package com.party.backbone.websocket.message.user;

import com.party.backbone.websocket.message.IdempotentMessage;
import com.party.backbone.websocket.model.GameType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmitMessage implements IdempotentMessage {
	private String requestId;
	private String userId;
	private int score;
	private String roomCode;
	private GameType gameType;
}
