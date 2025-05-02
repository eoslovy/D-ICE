package com.springcloudgateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.factory.rewrite.ModifyRequestBodyGatewayFilterFactory;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class RequestLoggingFilter implements GlobalFilter, Ordered {

	private final ModifyRequestBodyGatewayFilterFactory modifyRequestBodyGatewayFilterFactory;

	private static void logRequest(final ServerHttpRequest request, final String body) {

		log.info("Request Id: {}, URI: {}, Headers: {}, QueryParams: {}, Body: {}",
			request.getId(),
			request.getURI(),
			request.getHeaders(),
			request.getQueryParams(),
			body);
	}

	@Override
	public Mono<Void> filter(final ServerWebExchange exchange, final GatewayFilterChain chain) {

		return modifyRequestBodyGatewayFilterFactory
			.apply(modifyRequestBodyGatewayFilterConfig())
			.filter(exchange, chain);
	}

	private ModifyRequestBodyGatewayFilterFactory.Config modifyRequestBodyGatewayFilterConfig() {

		return new ModifyRequestBodyGatewayFilterFactory.Config()
			.setRewriteFunction(String.class, String.class, (exchange, body) -> {
					logRequest(exchange.getRequest(), body);
					return Mono.justOrEmpty(body);
				}
			);
	}

	@Override
	public int getOrder() {

		return Ordered.HIGHEST_PRECEDENCE;
	}
}