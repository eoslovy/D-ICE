package com.gamekjh.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.minio.MinioClient;

@Configuration
public class MinioConfig {

	@Bean
	@Qualifier("internalMinio")
	public MinioClient minioInternal(){
		return MinioClient.builder()
			.endpoint("http://minio-bucket")
			.credentials("minioadmin", "minioadmin")
			.build();
	}

	@Bean
	@Qualifier("externalMinio")
	public MinioClient minioClient() {
		return MinioClient.builder()
			//.endpoint("http://localhost:9000")
			.endpoint("http://minio-bucket")
			.credentials("minioadmin", "minioadmin")
			.build();
	}
}
