package com.party.backbone.room.model;

import java.time.Duration;

import lombok.Getter;

@Getter
public enum RoomStateTTL {
	CREATED(Duration.ofMinutes(15)),
	WAITING(Duration.ofMinutes(30)),
	PLAYING(Duration.ofMinutes(40)),
	ENDED(Duration.ofMinutes(5));

	private final Duration ttl;

	RoomStateTTL(Duration ttl) {
		this.ttl = ttl;
	}

}