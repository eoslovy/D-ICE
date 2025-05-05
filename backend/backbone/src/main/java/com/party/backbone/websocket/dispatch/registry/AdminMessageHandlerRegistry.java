package com.party.backbone.websocket.dispatch.registry;

import java.util.EnumMap;
import java.util.Map;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import com.party.backbone.websocket.dispatch.handler.AdminMessageHandler;
import com.party.backbone.websocket.message.GameMessage;
import com.party.backbone.websocket.model.AdminMessageType;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class AdminMessageHandlerRegistry implements ApplicationContextAware {
	private final Map<AdminMessageType, AdminMessageHandler<? extends GameMessage>> handlerMap = new EnumMap<>(
		AdminMessageType.class);

	@Override
	public void setApplicationContext(ApplicationContext applicationContext) {
		var beans = applicationContext.getBeansOfType(AdminMessageHandler.class);
		for (AdminMessageHandler<?> handler : beans.values()) {
			AdminMessageType type = handler.getMessageType();
			if (type != null) {
				handlerMap.put(type, handler);
			}
		}
	}

	@SuppressWarnings("unchecked")
	public <T extends GameMessage> AdminMessageHandler<T> getHandler(AdminMessageType type) {
		try {
			return (AdminMessageHandler<T>)handlerMap.get(type);
		} catch (NullPointerException exception) {
			log.error("{} Invalid type {} for user", this.getClass().getSimpleName(), type);
		}
		throw new IllegalArgumentException("Invalid message type for admin: " + type);
	}
}
