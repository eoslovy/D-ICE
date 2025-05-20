package com.party.backbone.websocket.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import lombok.Getter;

@Getter
public enum GameType {
	Reaction(45000),
	Clicker(30000),
	PerfectCircle(15000),
	Mugungwha(45000),
	Wirewalk(30000),
	Josephus(45000),
	Dye(30000),
	Knight(30000),
	GraphHigh(45000),
	Panopticon(30000),
	Dice(30000),
	ColorHunterG(25000),
	NumberSurvivor(70000),
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
