package com.party.backbone.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// @Configuration
// public class WebConfig implements WebMvcConfigurer {
//     @Override
//     public void addCorsMappings(CorsRegistry registry) {
//         registry.addMapping("/**") // 모든 경로에 대해 CORS 적용
//                 .allowedOrigins("http://localhost:3000") // 허용할 Origin
//                 .allowedMethods("GET", "POST", "PUT", "DELETE") // 허용할 HTTP 메서드
//                 .allowedHeaders("*") // 모든 헤더 허용
//                 .allowCredentials(true); // 인증 정보(쿠키 등) 허용
//     }
// }
