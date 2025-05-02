
FROM node:22 AS builder
WORKDIR /app
RUN npm install -g pnpm
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CREDIT_WEBSOCKET_URL
ENV NEXT_PUBLIC_CREDIT_WEBSOCKET_URL=$NEXT_PUBLIC_CREDIT_WEBSOCKET_URL

# 의존성 캐시를 위한 최소 COPY
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

##RUN npm format
##RUN npm lint

RUN npm run build || (echo "❌ React build failed" && exit 1)
FROM alpine AS react-static
WORKDIR /dist
COPY --from=builder /app/dist ./  
# 이 라인에서 오류가 나면 build 폴더가 없는 것
