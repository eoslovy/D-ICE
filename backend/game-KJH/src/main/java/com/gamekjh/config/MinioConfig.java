package com.gamekjh.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.minio.MinioClient;

@Configuration
public class MinioConfig {

	@Bean
	public MinioClient minioInternal(){
		return MinioClient.builder()
			.endpoint("http://minio-bucket:9000")
			.credentials("minioadmin", "minioadmin")
			.build();
	}
}
