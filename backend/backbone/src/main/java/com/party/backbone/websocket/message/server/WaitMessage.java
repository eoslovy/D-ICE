package com.party.backbone.websocket.message.server;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.uuid.Generators;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.GameType;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class WaitMessage implements GameMessage {
	@JsonIgnore
	private final long DEFAULT_OFFSET = 10_000;
	private String requestId;
	private GameType gameType;
	private long startAt;
	private long duration;
	private long currentMs;

	public WaitMessage(GameType gameType) {
		this.gameType = gameType;
		requestId = Generators.timeBasedEpochGenerator().generate().toString();
		currentMs = System.currentTimeMillis();
		startAt = currentMs + DEFAULT_OFFSET;
		duration = gameType.getDuration();
	}
}
