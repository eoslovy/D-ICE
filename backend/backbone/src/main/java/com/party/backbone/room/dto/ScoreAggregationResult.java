package com.party.backbone.room.dto;

import java.util.Map;

import com.party.backbone.websocket.model.GameType;

public record ScoreAggregationResult(
	int currentRound,
	int totalRound,
	GameType gameType,
	Map<String, Integer> roundScoreMap,
	Map<String, Integer> totalScoreMap,
	Map<String, String> nicknameMap
) {
}