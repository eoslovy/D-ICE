# Build stage
FROM gradle:7.4-jdk17 AS build

WORKDIR /app

COPY . .

RUN chmod +x ./gradlew

RUN ./gradlew clean build -x test

FROM gradle:7.4-jdk17 AS test

WORKDIR /app

COPY --from=build /app .

RUN ./gradlew test

FROM amazoncorretto:17-alpine AS run

WORKDIR /app

# builder에서 빌드된 JAR 파일 복사
COPY --from=build /app/build/libs/*.jar app.jar

# 앱 실행
ENTRYPOINT ["java", "-Xms512m", "-Xmx512m", "-jar", "app.jar"]