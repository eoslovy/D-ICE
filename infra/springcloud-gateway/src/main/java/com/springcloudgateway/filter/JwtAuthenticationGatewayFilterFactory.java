package com.springcloudgateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;

import com.springcloudgateway.dto.MemberInfoResponse;

import reactor.core.publisher.Mono;

@Component("jwt-authentication")
public class JwtAuthenticationGatewayFilterFactory
	extends AbstractGatewayFilterFactory<JwtAuthenticationGatewayFilterFactory.Config> {

	private static final String MEMBER_ID_HEADER = "X-MEMBER-ID";
	private static final String IS_BOT_HEADER = "X-IS-BOT";
	private static final String ACCESS_TOKEN_COOKIE_NAME = "access-token";
	// private final String verifyUrl;

	private final WebClient webClient;

	public JwtAuthenticationGatewayFilterFactory(
		// @Value("${verify-url}") String verifyUrl,
		WebClient.Builder webClientBuilder
	) {
		super(Config.class);
		// this.verifyUrl = verifyUrl;
		this.webClient = webClientBuilder.build();
	}

	@Override
	public GatewayFilter apply(Config config) {
		return (exchange, chain) -> {
			var cookie = exchange.getRequest()
				.getCookies()
				.getFirst(ACCESS_TOKEN_COOKIE_NAME);

			if (cookie == null) {
				return unauthorized(exchange);
			}

			return fetchMemberInfo(cookie)
				.flatMap(member -> {
					boolean isBot = "BOT".equals(member.getOauthProvider());

					// 요청 헤더에 사용자 정보 추가
					ServerHttpRequest mutatedRequest = exchange.getRequest()
						.mutate()
						.header(MEMBER_ID_HEADER, String.valueOf(member.getId()))
						.header(IS_BOT_HEADER, String.valueOf(isBot))
						.build();

					ServerWebExchange mutatedExchange = exchange.mutate()
						.request(mutatedRequest)
						.build();

					return chain.filter(mutatedExchange);
				})
				.onErrorResume(e -> unauthorized(exchange));

		};
	}

	private Mono<Void> unauthorized(ServerWebExchange exchange) {
		exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
		return exchange.getResponse().setComplete();
	}

	private Mono<MemberInfoResponse> fetchMemberInfo(HttpCookie accessTokenCookie) {
		return webClient.get()
			.uri("http://member-service:8080/auth/internal/verify-token")
			.header("X-INTERNAL-CALL", "true")
			.cookies(cookies -> {
				cookies.add(accessTokenCookie.getName(), accessTokenCookie.getValue());
			})
			.retrieve()
			.bodyToMono(MemberInfoResponse.class);
	}

	public static class Config {
		// 필요한 설정 프로퍼티를 여기에 추가
	}
} 