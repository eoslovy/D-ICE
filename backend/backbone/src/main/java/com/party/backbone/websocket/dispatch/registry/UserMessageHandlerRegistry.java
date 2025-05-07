package com.party.backbone.websocket.dispatch.registry;

import java.util.EnumMap;
import java.util.Map;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import com.party.backbone.websocket.dispatch.handler.GameMessageHandler;
import com.party.backbone.websocket.dispatch.handler.UserMessageHandler;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.UserMessageType;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class UserMessageHandlerRegistry implements ApplicationContextAware {
	private final Map<UserMessageType, GameMessageHandler<? extends GameMessage>> handlerMap = new EnumMap<>(
		UserMessageType.class);

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) {
		var beans = applicationContext.getBeansOfType(UserMessageHandler.class);
		for (UserMessageHandler handler : beans.values()) {
			UserMessageType type = handler.getMessageType();
			if (type != null) {
				handlerMap.put(type, (GameMessageHandler<?>)handler);
			}
		}
	}

	@SuppressWarnings("unchecked")
	public <T extends GameMessage> GameMessageHandler<T> getHandler(UserMessageType type) {
		try {
			return (GameMessageHandler<T>)handlerMap.get(type);
		} catch (NullPointerException exception) {
			log.error("{} Invalid type {} for user", this.getClass().getSimpleName(), type);
		}
		throw new IllegalArgumentException("Invalid message type for user: " + type);
	}
}
