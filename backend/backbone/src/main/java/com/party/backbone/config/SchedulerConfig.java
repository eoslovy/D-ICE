package com.party.backbone.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.redis.spring.RedisLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "PT30S") // ShedLock 활성화, 기본 락 최대 유지 시간 30초
public class SchedulerConfig implements SchedulingConfigurer {

	@Value("${spring.profiles.active:default}")
	private String activeProfile;

	private final int MAX_CONCURRENT_ROOMS_PER_INSTANCE = 5;

	@Override
	public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
		ThreadPoolTaskScheduler taskScheduler = new ThreadPoolTaskScheduler();
		taskScheduler.setPoolSize(MAX_CONCURRENT_ROOMS_PER_INSTANCE);
		taskScheduler.setThreadNamePrefix("aggregation-scheduler-");
		taskScheduler.setErrorHandler(t -> {
			log.error("[Scheduler] Error in scheduled task: {}", t.getMessage());
		});
		taskScheduler.initialize();
		taskRegistrar.setTaskScheduler(taskScheduler);
	}

	@Bean
	public LockProvider lockProvider(RedisConnectionFactory connectionFactory) {
		return new RedisLockProvider(connectionFactory, "env:" + activeProfile);
	}
}