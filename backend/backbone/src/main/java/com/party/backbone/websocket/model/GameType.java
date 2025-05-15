package com.party.backbone.websocket.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.Getter;

@Getter
public enum GameType {
	Reaction(40000),
	Clicker(30000),
	PerfectCircle(15000),
	Mugungwha(30000),
	Wirewalk(30000),
	Josephus(30000),
	Dye(30000),
	Knight(30000),
	Panopticon(30000),
	NumberSurvivor(70000);
	Dice(30000);
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
