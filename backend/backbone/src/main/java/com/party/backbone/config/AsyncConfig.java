package com.party.backbone.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@EnableAsync
@Configuration
public class AsyncConfig {
	public static Executor createDefaultAsyncExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(20);
		executor.setMaxPoolSize(50);
		executor.setQueueCapacity(1000);
		executor.setThreadNamePrefix("Async-");
		executor.initialize();
		return executor;
	}

	@Bean
	public Executor asyncTaskExecutor() {
		return createDefaultAsyncExecutor();
	}
}
