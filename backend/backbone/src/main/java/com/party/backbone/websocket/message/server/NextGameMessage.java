package com.party.backbone.websocket.message.server;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.GameType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NextGameMessage implements GameMessage {
	private GameType gameType;
	private int currentRound;
	private long duration;
}
