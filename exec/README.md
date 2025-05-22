#서비스 버전

JVM = Amazone-Correto:jdk17
nginx = 1.25
nosql = redis:7.2.0
docker-compose = 2.33.1

#IDE

INTELLIJ
VSCODE
CURSOR

#환경변수
환경변수.env = .ENV

일반 통합개발환경 백엔드/프론트엔드 = docker-compose.yml
프론트/백엔드 배포용 설정 = docker-compose.deploy.yml

#배포 특이사항

GITLAB-CI 를 통한 배포
CI-CD파이프라인 Gitlab-runner사용
DOCKER-COMPOSE의 환경변수(GITLAB-CI 기반)
배포용 DOCKER-COMPOSE파일 분리