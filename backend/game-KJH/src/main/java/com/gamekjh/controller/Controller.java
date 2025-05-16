package com.gamekjh.controller;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gamekjh.utils.MinioClientUtil;

import io.minio.errors.ErrorResponseException;
import io.minio.errors.InsufficientDataException;
import io.minio.errors.InternalException;
import io.minio.errors.InvalidResponseException;
import io.minio.errors.ServerException;
import io.minio.errors.XmlParserException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@Slf4j
public class Controller {

	private final MinioClientUtil minioClientUtil;

	@GetMapping("put")
	public ResponseEntity<String> providePostPresignedUrl() throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		log.info("PresignedUrl: put 요청 들어왔음");

		return ResponseEntity.ok(minioClientUtil.replaceUrl(minioClientUtil.newPutPresignedUrl(1,11, 111)));
	}

	@GetMapping("get")
	public ResponseEntity<String> provideGetPresignedUrl() throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		log.info("PresignedUrl: get 요청 들어왔음");
		return ResponseEntity.ok(minioClientUtil.replaceUrl(minioClientUtil.newGetPresignedUrl(1,11,111)));
	}
}
