package com.party.backbone.room;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.KeyExpirationEventMessageListener;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

@Component
public class RoomExpirationListener extends KeyExpirationEventMessageListener {

	private final RedisTemplate<String, ?> redisTemplate;

	public RoomExpirationListener(RedisMessageListenerContainer listenerContainer,
		RedisTemplate<String, ?> redisTemplate) {
		super(listenerContainer);
		this.redisTemplate = redisTemplate;
	}

	@Override
	public void onMessage(Message message, byte[] pattern) {
		String expiredKey = message.toString();
		if (expiredKey.startsWith("room:")) {
			String roomCode = expiredKey.split(":")[1];
			redisTemplate.delete("room:" + roomCode + ":players");
		}
	}
}