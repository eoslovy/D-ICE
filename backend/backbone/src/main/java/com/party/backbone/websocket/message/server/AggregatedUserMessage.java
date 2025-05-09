package com.party.backbone.websocket.message.server;

import java.util.List;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.GameType;
import com.party.backbone.websocket.model.RankingInfo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AggregatedUserMessage implements GameMessage {
	private int currentRound;
	private int totalRound;
	private GameType gameType;
	private int currentScore;
	private int totalScore;
	private String rankRecord; // round 별 순위를 `|` 를 구분자로 기록
	private int roundRank;
	private int overallRank;
	private List<RankingInfo> roundRanking;
	private List<RankingInfo> overallRanking;
	private String videoUploadUrl;
}
