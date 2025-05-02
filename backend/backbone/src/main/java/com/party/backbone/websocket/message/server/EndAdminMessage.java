package com.party.backbone.websocket.message.server;

import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.RankingInfo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EndAdminMessage implements GameMessage {
	private String requestId;
	private RankingInfo[] overallRanking;
}
