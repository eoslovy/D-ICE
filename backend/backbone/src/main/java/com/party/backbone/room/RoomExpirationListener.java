package com.party.backbone.room;

import java.util.List;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.listener.KeyExpirationEventMessageListener;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import com.party.backbone.websocket.handler.SessionRegistry;

@Component
public class RoomExpirationListener extends KeyExpirationEventMessageListener {

	private final RoomRedisRepository roomRepository;
	private final SessionRegistry sessionRegistry;

	public RoomExpirationListener(RedisMessageListenerContainer listenerContainer,
		RoomRedisRepository roomRepository, SessionRegistry sessionRegistry) {
		super(listenerContainer);
		this.roomRepository = roomRepository;
		this.sessionRegistry = sessionRegistry;
	}

	@Override
	public void onMessage(Message message, byte[] pattern) {
		String expiredKey = message.toString();
		if (expiredKey.startsWith("room:")) {
			String roomCode = expiredKey.split(":")[1];
			String administratorId = roomRepository.getAdministratorIdOfRoom(roomCode);
			sessionRegistry.closeSession(administratorId);
			sessionRegistry.unregister(administratorId);
			List<String> userIds = roomRepository.getUserIds(roomCode);
			sessionRegistry.closeSessionAll(userIds);
			sessionRegistry.unregisterAll(userIds);
			roomRepository.deleteRoom(roomCode);
		}
	}
}