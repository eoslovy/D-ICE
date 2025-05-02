package com.party.backbone.websocket.message.server;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.GameType;
import com.party.backbone.websocket.model.RankingInfo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AggregatedAdminMessage implements GameMessage {
	private String requestId;
	private int round;
	private GameType gameType;
	private RankingInfo[] roundRanking; // 이번 라운드 3등까지의 정보 length 3
	private RankingInfo[] overallRanking; // 전체
}
