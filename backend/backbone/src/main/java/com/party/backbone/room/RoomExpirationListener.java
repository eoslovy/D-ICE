package com.party.backbone.room;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.listener.KeyExpirationEventMessageListener;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

@Component
public class RoomExpirationListener extends KeyExpirationEventMessageListener {

	private final RoomRedisRepository roomRepository;

	public RoomExpirationListener(RedisMessageListenerContainer listenerContainer,
		RoomRedisRepository roomRepository) {
		super(listenerContainer);
		this.roomRepository = roomRepository;
	}

	@Override
	public void onMessage(Message message, byte[] pattern) {
		String expiredKey = message.toString();
		if (expiredKey.startsWith("room:")) {
			String roomCode = expiredKey.split(":")[1];
			roomRepository.deleteRoom(roomCode);
		}
	}
}