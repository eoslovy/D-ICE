package com.party.backbone.websocket.message.server;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.GameType;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AggregatedClientMessage implements GameMessage {
	private String requestId;
	private int round;
	private GameType gameType;
	private int score;
	private String rankRecord; // round 별 순위를 `|` 를 구분자로 기록
	private int roundRank;
	private int overallRank;
	private String videoUploadUrl;
}
