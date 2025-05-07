package com.party.backbone.websocket.message.server;

import com.party.backbone.room.dto.RoundInfo;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.GameType;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class WaitMessage implements GameMessage {
	private GameType gameType;
	private long startAt;
	private long duration;
	private long currentMs;

	public WaitMessage(RoundInfo roundInfo) {
		this.gameType = roundInfo.gameType();
		this.startAt = roundInfo.startAt();
		this.duration = roundInfo.duration();
		this.currentMs = roundInfo.currentMs();
	}
}
