package com.gamekjh.utils;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.errors.ErrorResponseException;
import io.minio.errors.InsufficientDataException;
import io.minio.errors.InternalException;
import io.minio.errors.InvalidResponseException;
import io.minio.errors.ServerException;
import io.minio.errors.XmlParserException;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;

@Component
public class MinioClientUtil {

	private final MinioClient minioInternalClient;
	private final MinioClient minioExternalClient;

	public MinioClientUtil(
		@Qualifier("internalMinio") MinioClient minioInternalClient,
		@Qualifier("externalMinio") MinioClient minioExternalClient
	) {
		this.minioInternalClient = minioInternalClient;
		this.minioExternalClient = minioExternalClient;
	}

	public GetPresignedObjectUrlArgs getPresignedObjectUrlArgs(String bucket, String round, String userId, Method httpMethod) {
		return GetPresignedObjectUrlArgs.builder()
			.bucket("room"+bucket)
			.expiry(300, TimeUnit.MINUTES)
			.method(httpMethod)
			.object(round + "/" + userId)
			.build();
	}

	public String newPostPresignedUrl(Integer roomId, Integer roundNum, Integer userId) throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {

		BucketExistsArgs bucketExistsArgs = BucketExistsArgs.builder().bucket("room"+roomId.toString()).build();
		
		if (!minioInternalClient.bucketExists(bucketExistsArgs)) {
			minioInternalClient.makeBucket(MakeBucketArgs.builder().bucket("room"+roomId.toString()).build());
		}
		System.out.println("여까지됨");
		String pUrl = minioExternalClient.getPresignedObjectUrl(
			getPresignedObjectUrlArgs(roomId.toString(), roundNum.toString(), userId.toString(), Method.PUT));
		System.out.println("pUrl발급"+pUrl);
		return pUrl;
	}

	public String newGetPresignedUrl(Integer roomId, Integer roundNum, Integer userId) throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {

		BucketExistsArgs bucketExistsArgs = BucketExistsArgs.builder().bucket(roomId.toString()).build();

		if (!minioInternalClient.bucketExists(bucketExistsArgs)) {
			minioInternalClient.makeBucket(MakeBucketArgs.builder().bucket(roomId.toString()).build());
		}
		String gUrl = minioExternalClient.getPresignedObjectUrl(
			getPresignedObjectUrlArgs(roomId.toString(), roundNum.toString(), userId.toString(), Method.GET));
		System.out.println("gUrl:"+gUrl);
		return gUrl;
	}

	public String replaceUrl(String url){

		//return url;
		//System.out.println("url:"+url);
		return url.replace("http://localhost:9000","https://localhost/bucket");
	}
}
