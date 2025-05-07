package com.party.backbone.websocket.message.server;

import java.util.List;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.GameType;
import com.party.backbone.websocket.model.PlaceInfo;
import com.party.backbone.websocket.model.RankingInfo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AggregatedAdminMessage implements GameMessage {
	private int currentRound;
	private int totalRound;
	private GameType gameType;
	private List<RankingInfo> roundRanking; // 이번 라운드 3등까지의 정보 length 3
	private List<RankingInfo> overallRanking; // 전체
	private PlaceInfo firstPlace;
	private PlaceInfo lastPlace;
}
