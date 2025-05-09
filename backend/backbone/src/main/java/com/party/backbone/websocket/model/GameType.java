package com.party.backbone.websocket.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.Getter;

@Getter
public enum GameType {
	Reaction(60000),
	Clicker(60000),
	PerfectCircle(30000),
	;
	private static final GameType[] GAME_TYPES = values();

	private final long duration;

	GameType(long duration) {
		this.duration = duration;
	}

	public static List<GameType> pickRandomList(int round) {
		if (round > GAME_TYPES.length) {
			throw new IllegalArgumentException("round cannot exceed available game types.");
		}

		List<GameType> list = new ArrayList<>(List.of(GAME_TYPES));
		Collections.shuffle(list);
		return list.subList(0, round);
	}
}
