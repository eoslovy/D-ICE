package com.party.backbone.websocket.dispatch.repository;

import java.time.Duration;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class IdempotencyRedisRepository {
	private final RedisTemplate<String, String> redisTemplate;

	public IdempotencyRedisRepository(RedisTemplate<String, String> redisTemplate) {
		this.redisTemplate = redisTemplate;
	}

	public boolean checkAndSetRequestId(String roomCode, String requestId) {
		String key = buildKey(roomCode, requestId);
		Boolean success = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofMinutes(10)); // TTL 예시
		return Boolean.TRUE.equals(success);
	}

	private String buildKey(String roomCode, String requestId) {
		return "idempotency:" + roomCode + ":" + requestId;
	}
}
