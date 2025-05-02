package com.springcloudgateway.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class MemberInfoResponse {
    private final Integer id;
    private final String name;
    private final String oauthProvider;
} 