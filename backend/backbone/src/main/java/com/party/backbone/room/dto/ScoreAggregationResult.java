package com.party.backbone.room.dto;

import java.util.Map;

import com.party.backbone.websocket.model.GameType;

import lombok.Builder;

@Builder
public record ScoreAggregationResult(
	int currentRound,
	int totalRound,
	int roundPlayerCount,
	int totalPlayerCount,
	GameType gameType,
	Map<String, Integer> roundScoreMap,
	Map<String, Integer> totalScoreMap,
	Map<String, String> nicknameMap
) {
}