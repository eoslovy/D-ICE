package com.party.backbone.websocket.model;

import java.util.Collection;
import java.util.EnumSet;
import java.util.concurrent.ThreadLocalRandom;

import lombok.Getter;

@Getter
public enum GameType {
	RSP(5000),
	;
	private static final GameType[] GAME_TYPES = values();

	private final long duration;

	GameType(long duration) {
		this.duration = duration;
	}

	public static GameType randomExcluding(Collection<GameType> exclude) {
		EnumSet<GameType> candidates = EnumSet.allOf(GameType.class);
		candidates.removeAll(exclude);

		if (candidates.isEmpty()) {
			throw new IllegalArgumentException("No available game types after exclusion.");
		}

		GameType[] candidateArray = candidates.toArray(new GameType[0]);

		return GAME_TYPES[ThreadLocalRandom.current().nextInt(GAME_TYPES.length)];
	}
}
