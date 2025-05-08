package com.party.backbone.websocket.message.server;

import java.util.List;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.RankingInfo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EndMessage implements GameMessage {
	private List<RankingInfo> overallRanking;
}
