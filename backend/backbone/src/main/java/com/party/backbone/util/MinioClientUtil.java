package com.party.backbone.util;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
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
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class MinioClientUtil {
	@Value("${BUCKET_BASE_URL}")
	private String bucketBaseUrl;
	private final MinioClient minioInternalClient;

	Map<String, String> reqParams = new HashMap<String, String>();

	public MinioClientUtil(MinioClient minioInternalClient) {
		this.minioInternalClient = minioInternalClient;
		reqParams.put("response-content-type", "video/webm");
	}

	//Bucket의 min String length는 3임

	public GetPresignedObjectUrlArgs getPresignedObjectUrlArgs(String bucket, String round, String userId,
		Method httpMethod) {
		return GetPresignedObjectUrlArgs.builder()
			.bucket("room" + bucket)
			.expiry(300, TimeUnit.MINUTES)
			.method(httpMethod)
			.object(round + "/" + userId)
			.extraQueryParams(reqParams)
			.build();
	}

	public String newPutPresignedUrl(String roomCode, Integer roundNum, String userId) throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {
		BucketExistsArgs bucketExistsArgs = BucketExistsArgs.builder().bucket("room" + roomCode).build();

		if (!minioInternalClient.bucketExists(bucketExistsArgs)) {
			minioInternalClient.makeBucket(MakeBucketArgs.builder().bucket("room" + roomCode).build());
		}
		String putPresignedUrl = minioInternalClient.getPresignedObjectUrl(
			getPresignedObjectUrlArgs(roomCode, roundNum.toString(), userId, Method.PUT));
		log.info("put presigned url 발급 {}", putPresignedUrl);
		return replaceUrl(putPresignedUrl);
	}

	public String newGetPresignedUrl(String roomCode, Integer roundNum, String userId) throws
		ServerException,
		InsufficientDataException,
		ErrorResponseException,
		IOException,
		NoSuchAlgorithmException,
		InvalidKeyException,
		InvalidResponseException,
		XmlParserException,
		InternalException {

		BucketExistsArgs bucketExistsArgs = BucketExistsArgs.builder().bucket("room" + roomCode).build();

		if (!minioInternalClient.bucketExists(bucketExistsArgs)) {
			minioInternalClient.makeBucket(MakeBucketArgs.builder().bucket("room" + roomCode).build());
		}
		String getPresignedUrl = minioInternalClient.getPresignedObjectUrl(
			getPresignedObjectUrlArgs(roomCode, roundNum.toString(), userId, Method.GET));
		log.info("get presigned url 발급 :{}", getPresignedUrl);
		return replaceUrl(getPresignedUrl);
	}

	public String replaceUrl(String url) {
		//replacement를 bucket api로 변경
		return url.replace("http://minio-bucket:9000", bucketBaseUrl);
	}
}
