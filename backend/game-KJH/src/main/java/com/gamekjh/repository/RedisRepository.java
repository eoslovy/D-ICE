package com.gamekjh.repository;

public interface RedisRepository {

	//Todo 게임 상태 확인
	Boolean roomExistsAndGameTypeMatches(String roomId);
	Boolean roomExistsAndGameStatusEnds(String roomId);
	//1. 방 만들때 있는지
	//2. 방 없앨때 끝났는지
}
