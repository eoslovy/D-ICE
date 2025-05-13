package com.gamekjh.repository;

public class RedisRepositoryImpl implements RedisRepository {
	@Override
	public Boolean roomExistsAndGameTypeMatches(String roomId) {
		return Boolean.TRUE;
	}

	@Override
	public Boolean roomExistsAndGameStatusEnds(String roomId) {
		return Boolean.TRUE;
	}
}
