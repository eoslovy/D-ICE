package com.gamekjh.utils;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.concurrent.TimeUnit;

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
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class MinioClientUtil {

	//Bucket의 min String length는 3임
	private final MinioClient minioInternalClient;
	
	public GetPresignedObjectUrlArgs getPresignedObjectUrlArgs(String bucket, String round, String userId, Method httpMethod) {
		return GetPresignedObjectUrlArgs.builder()
			.bucket("room"+bucket)
			.expiry(300, TimeUnit.MINUTES)
			.method(httpMethod)
			.object(round + "/" + userId)
			.build();
	}

	public String newPutPresignedUrl(Integer roomId, Integer roundNum, Integer userId) throws
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
		String pUrl = minioInternalClient.getPresignedObjectUrl(
			getPresignedObjectUrlArgs(roomId.toString(), roundNum.toString(), userId.toString(), Method.PUT));
		log.info("pUrl발급"+pUrl);
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

		BucketExistsArgs bucketExistsArgs = BucketExistsArgs.builder().bucket("room"+roomId.toString()).build();

		if (!minioInternalClient.bucketExists(bucketExistsArgs)) {
			minioInternalClient.makeBucket(MakeBucketArgs.builder().bucket("room"+roomId.toString()).build());
		}
		String gUrl = minioInternalClient.getPresignedObjectUrl(
			getPresignedObjectUrlArgs(roomId.toString(), roundNum.toString(), userId.toString(), Method.GET));
		log.info("gUrl:"+gUrl);
		return gUrl;
	}

	public String replaceUrl(String url){

		//replacement를 bucket api로 변경
		return url.replace("http://minio-bucket:9000","https://localhost/bucket");
	}
}
