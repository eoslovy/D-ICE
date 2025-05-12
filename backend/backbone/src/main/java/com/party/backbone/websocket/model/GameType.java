package com.party.backbone.websocket.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.Getter;

@Getter
public enum GameType {
	Reaction(40000),
	Clicker(40000),
	PerfectCircle(10000),
	Mugungwha(40000),
	Wirewalk(40000),
	Josephus(40000),
	Dye(40000),
	Knight(40000),
	NumberSurvivor(60000)
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
