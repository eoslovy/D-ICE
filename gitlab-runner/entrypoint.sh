#!/bin/sh
set -e

echo "📌 GitLab Runner 등록 중..."

# .env 파일 로드
if [ -f .env ]; then
  . .env
  echo "📋 .env 값:"
  echo "  GITLAB_RUNNER_TOKEN=${GITLAB_RUNNER_TOKEN}"
else
  echo "❌ .env 파일을 찾을 수 없습니다."
  exit 1
fi

CONFIG_PATH="/etc/gitlab-runner/config.toml"
if [ -f "$CONFIG_PATH" ]; then
  echo "🧹 기존 config.toml 발견 → 삭제 중: $CONFIG_PATH"
  rm "$CONFIG_PATH"
else
  echo "✅ config.toml 없음 → 삭제 생략"
fi
#gitlab-runner unregister --token "${GITLAB_RUNNER_TOKEN}" --url https://lab.ssafy.com
#gitlab-runner unregister --token ${GITLAB_RUNNER_TOKEN} --url https://lab.ssafy.com
# GitLab Runner 등록
echo "✅ GitLab Runner 등록 시작..."
gitlab-runner register \
  --non-interactive \
  --url "https://lab.ssafy.com" \
  --registration-token "${GITLAB_RUNNER_TOKEN}" \
  --executor "docker" \
  --docker-image docker:latest \
  --description "alpine-runner"

echo "✅ GitLab Runner 등록 완료"

# config.toml 경로 (호스트나 컨테이너 위치에 따라 조정 가능)


echo "🛠 config.toml 설정 패치 중..."

# config.toml 수정
# 중복된 volumes, shm_size 설정이 없을 때만 추가
# privileged 중복 제거
sed -i '/^\s*privileged\s*=\s*false\s*$/d' "$CONFIG_PATH"
sed -i '/^\s*privileged\s*=\s*true\s*$/d' "$CONFIG_PATH"
sed -i '/^\s*volumes\s*=\s*\["\/cache"\]\s*$/d' "$CONFIG_PATH"
# ✅ privileged = true 삽입 (runners.docker 블록 바로 아래)
if ! grep -q '^\s*privileged\s*=\s*true\s*$' "$CONFIG_PATH"; then
  sed -i '/\[runners.docker\]/a privileged = true' "$CONFIG_PATH"
fi
# docker.sock 마운트
if ! grep -q 'volumes = \[.*docker.sock.*\]' "$CONFIG_PATH"; then
  sed -i '/\[runners.docker\]/a \
  volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock", "/var/lib/docker:/var/lib/docker"]' "$CONFIG_PATH"
fi

if ! grep -q 'shm_size' "$CONFIG_PATH"; then
  sed -i '/\[runners.docker\]/a \
  shm_size = 268435456' "$CONFIG_PATH"
fi
echo "✅ config.toml 설정 완료"

# Docker 이미지 미리 pull (Kubernetes 관련)
echo "📦 Kubernetes 관련 이미지 미리 다운로드 중..."
#docker pull kindest/node:v1.29.0
#docker pull registry.k8s.io/pause:3.9
#docker pull quay.io/coreos/etcd:v3.5.0
#docker pull k8s.gcr.io/kube-apiserver:v1.29.0
#docker pull bitnami/kubectl:1.32.3
if command -v apt-get >/dev/null 2>&1; then
  apt-get update && apt-get install -y gettext
elif command -v apk >/dev/null 2>&1; then
  apk update && apk add gettext
else
  echo "❌ 패키지 관리자 없음 (apt 또는 apk 필요)"
  exit 1
fi

# Docker 이미지 미리 pull (프로젝트 관련)
echo "📦 프로젝트 관련 이미지 미리 다운로드 중..."
#docker pull mysql:8.0
docker pull gradle:7.4-jdk17
docker pull node:22
docker pull nginx:1.25
docker pull redis:7.2
#docker pull bitnami/kafka:3.6
#docker pull bitnami/zookeeper:3.8

# GitLab Runner 실행
echo "🚀 GitLab Runner 실행 중..."
exec gitlab-runner run