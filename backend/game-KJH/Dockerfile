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

COPY --from=build /app/build/libs/*.jar app.jar

ENTRYPOINT ["java", "-jar", "-Xms512m", "-Xmx512m", "app.jar"]