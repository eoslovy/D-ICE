package com.gameydg.numberSurvivor.repository;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
@RequiredArgsConstructor
public class RoomRedisRepositoryImpl implements RoomRedisRepository {
    private static final String PENDING_AGGREGATION_KEY = "pendingAggregationRooms";
    private final RedisTemplate<String, String> redisTemplate;

    @Override
    public void setAggregationTime(String roomId) {
        long currentMs = System.currentTimeMillis();
        long aggregationTime = currentMs + 5000;  // 현재 시간 + 5초
        
        // 기존 집계 시간이 있다면 제거 후 새로 추가
        redisTemplate.opsForZSet().remove(PENDING_AGGREGATION_KEY, roomId);
        redisTemplate.opsForZSet().add(PENDING_AGGREGATION_KEY, roomId, aggregationTime);
        
        log.info("[RoomRedis] 집계 시간 설정 [방ID: {}, 집계시간: {}]", roomId, aggregationTime);
    }
} 