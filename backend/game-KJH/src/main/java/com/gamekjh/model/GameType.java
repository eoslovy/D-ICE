package com.gamekjh.model;

import java.util.function.Supplier;

import com.gamekjh.dto.GameInfo;
import com.gamekjh.dto.GraphHigh;

public enum GameType {
	GameGraphHigh(()-> {
		GraphHigh graphHigh = GraphHigh.builder().build();
		graphHigh.init();

		return graphHigh;
	});

	private final Supplier<GameInfo> builder;

	GameType(Supplier<GameInfo> builder) {
		this.builder = builder;
	}
	public GameInfo getGameInfo() {
		return builder.get();
	}
}
