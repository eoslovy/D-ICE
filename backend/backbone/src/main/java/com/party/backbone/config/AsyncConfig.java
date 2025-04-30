package com.party.backbone.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@EnableAsync
@Configuration
public class AsyncConfig {
	@Bean(name = "asyncTaskExecutor")
	public Executor asyncTaskExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(20);       // 기본 스레드 수
		executor.setMaxPoolSize(50);         // 최대 스레드 수
		executor.setQueueCapacity(1000);     // 큐 크기
		executor.setThreadNamePrefix("Async-");
		executor.initialize();
		return executor;
	}
}
