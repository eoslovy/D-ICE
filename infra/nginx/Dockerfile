# 1단계: 외부에서 빌드된 React 이미지 참조
ARG FRONTEND_IMAGE
FROM ${FRONTEND_IMAGE:-alpine} AS frontend
RUN mkdir -p /dist
# 2단계: Nginx로 최종 이미지 구성
FROM nginx:1.25
ARG SERVER_DOMAIN
ARG CERT_DOMAIN
ARG NGINX=local_nginx.conf
ARG BUCKET_DOMAIN
ARG SSL_DIR
ENV NGINX_CONF=${NGINX}
ENV SERVER_DOMAIN=${SERVER_DOMAIN}
ENV BUCKET_DOMAIN=${BUCKET_DOMAIN}
ENV CERT_DOMAIN=${CERT_DOMAIN}
ENV SSL_DIR=${SSL_DIR}
# 기본 html 제거
RUN rm -rf /usr/share/nginx/html/*

# React 정적 파일 복사
COPY --from=frontend /dist /usr/share/nginx/${CERT_DOMAIN}

# 커스텀 Nginx 설정 적용
COPY ${NGINX_CONF} /etc/nginx/nginx.conf.template

RUN sh -c "envsubst '\$SERVER_DOMAIN \$SSL_DIR \$CERT_DOMAIN \$BUCKET_DOMAIN' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && cat /etc/nginx/nginx.conf"


EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
