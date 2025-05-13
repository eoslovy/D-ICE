package com.gamekjh.config;

import java.util.Map;

import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketConfigurer {

	private final ApplicationContext applicationContext;

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		Map<String, WebSocketHandler> handlers = applicationContext.getBeansOfType(WebSocketHandler.class);
		log.info("registerWebSocketHandlers"+handlers);

		handlers.forEach((beanName, handler) -> {
			String path = resolvePathFromHandler(beanName, handler);
			registry.addHandler(handler, path).setAllowedOrigins("*");
		});
	}

	private String resolvePathFromHandler(String beanName, WebSocketHandler handler) {
		return "/ws/" + beanName.toLowerCase().replace("websockethandler", "");
	}
}
