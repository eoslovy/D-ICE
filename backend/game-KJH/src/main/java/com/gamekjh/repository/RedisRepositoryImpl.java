package com.gamekjh.repository;

import org.springframework.stereotype.Repository;

@Repository
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
