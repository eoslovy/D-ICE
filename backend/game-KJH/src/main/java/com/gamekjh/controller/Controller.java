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

@RestController
@RequiredArgsConstructor
public class Controller {

	private final MinioClientUtil minioClientUtil;

	@GetMapping("post")
	public ResponseEntity<String> hello() throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		System.out.println("post 요청 들어왔음");

		return ResponseEntity.ok(minioClientUtil.replaceUrl(minioClientUtil.newPostPresignedUrl(1,11, 111)));
	}

	@GetMapping("get")
	public ResponseEntity<String> gethello() throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		System.out.println("get 요청 들어왔음");
		return ResponseEntity.ok(minioClientUtil.replaceUrl(minioClientUtil.newGetPresignedUrl(1,11,111)));
	}
}
