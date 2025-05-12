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

	public boolean isRequestIdProcessed(String roomCode, String requestId) {
		String key = buildKey(roomCode, requestId);
		return Boolean.TRUE.equals(redisTemplate.hasKey(key));
	}

	public void markRequestIdProcessed(String roomCode, String requestId) {
		String key = buildKey(roomCode, requestId);
		redisTemplate.opsForValue().set(key, "1", Duration.ofMinutes(10));
	}

	private String buildKey(String roomCode, String requestId) {
		return "idempotency:" + roomCode + ":" + requestId;
	}
}
