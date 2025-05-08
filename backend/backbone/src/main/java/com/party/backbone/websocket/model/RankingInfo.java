package com.party.backbone.websocket.model;

public record RankingInfo(
	String userId,
	String nickname,
	int score,
	int rank
) {
}
