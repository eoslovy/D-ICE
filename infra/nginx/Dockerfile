# 1단계: 외부에서 빌드된 React 이미지 참조
ARG FRONTEND_IMAGE
FROM ${FRONTEND_IMAGE} as frontend

# 2단계: Nginx로 최종 이미지 구성
FROM nginx:1.25

ARG NGINX=local_nginx.conf
ENV NGINX_CONF=${NGINX}

# 기본 html 제거
RUN rm -rf /usr/share/nginx/html/*

# React 정적 파일 복사
COPY --from=frontend /dist /usr/share/nginx/html

# 커스텀 Nginx 설정 적용
COPY ${NGINX_CONF} /etc/nginx/nginx.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
