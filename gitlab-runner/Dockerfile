# Dockerfile
FROM docker:20.10

# 필수 패키지 설치
RUN apk add --no-cache bash curl git && \
    curl -L --output /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64 && \
    chmod +x /usr/local/bin/gitlab-runner

COPY ./entrypoint.sh /entrypoint.sh
COPY .env /.env

# LF 변환 적용
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh


# GitLab Runner 실행
ENTRYPOINT ["/entrypoint.sh"]
