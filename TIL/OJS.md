# TIL

## 20250421 Wear Os WebSocket

### 상황

- wear os를 사용하는 기기에서 서버와 직접 WebSocket 연결을 시도했는데 실패했다.

### 문제 및 해결 과정

1. `java.net.UnknownServiceException: CLEARTEXT communication to 192.168.0.11 not permitted by network security policy`

- Android 9 이상에서는 기본적으로 HTTP를 차단한다고 한다.
- network_security_config

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.0.11</domain>
    </domain-config>
</network-security-config>

```

`res/xml/network_security_config.xml`을 생성해서 해결했다. 2. `java.net.SocketException: socket failed: EPERM (Operation not permitted)`

- 무선 디버깅 중 보안상의 이유로 outbound connection이 차단된다고 한다.
  - wifi 디버깅 해제
  - 외부 tls 서버
  - 모바일 기기를 브릿지로 사용
    하는 방식으로 해결할 수 있다고 한다.

## 20250422 워치 adb 관련

### 문제 및 해결 과정

- wear os 디바이스를 안드로이드 스튜디오에 연결하는 데 문제가 발생했다.
- 집에서 iptime 공유기를 사용했을 때는 문제가 없었는데 ssafy에서는 안됐다.
- 실제로 패킷을 주고 받는 것 같긴 한데 `error: protocol fault (couldn't read status message): No error` 이런 에러가 발생했다.

### 해결 순서

1. 처음에는 ssafy 네트워크의 보안 문제이지 않을까 했다.
2. 그래서 모바일로 핫스팟을 켜서 연결을 시도했다.
3. 그러나 어느 네트워크든 상관없이 pairing의 후보로는 wear os 기기가 뜨는데 paring이 실패했다.
4. 다른 곳에 뭔가 문제가 있다고 판단하고 wifi 관련 설정들을 쭉 보다가 네트워크 설정에서 네트워크 프로필 유형을 발견했다.
5. ![[Pasted image 20250421152213.png]] 이 부분이 공용으로 되어있는 것을 보고 이것 때문일 수 있겠다고 생각했고 개인으로 바꾸니 해결됐다.

## 20250423 WebSocket heartbeat

### 문제 상황

- 서버 입장에서 관리자 세션이 살아있는지 확인하는 방법을 어떻게 구현할 것인가?
- 그 메시지에 특정 정보(현재 room에 있는 user 수)를 담아서 보낼 수 있는가

### 해결 순서

1. 우선 WebSocket 표준에 heartbeat가 있는지 확인했다.
   - 있는줄 알았는데 없었다
2. 대신 PingMessage와 PongMessage는 구현되어 있었다. [참고](https://datatracker.ietf.org/doc/html/rfc6455#section-5.5.2)
3. 그리고 PingMessage에는 127바이트까지 데이터를 담아서 보낼 수 있다.,
4. 다만 PingMessage는 프로토콜 레벨에서 처리되기 때문에 클라이언트쪽에서 해당 데이터에 접근할 수 없다.
5. 따라서 Ping을 저런 용도로 사용하기 위해서는 커스텀 heartbeat 를 만들어서 써야할 것 같다.

## 20250424 메시지 처리

### 문제 상황

- 메시지 타입별로 다른 방식으로 처리해야하는데 어떻게 하면 유연하고 확장성 있는 구조를 가져갈 수 있을까?

### 해결 순서

1. message 타입에 따른 switch

   ```### 목표

   ```

- 메시지 타입에 따라 유연하고 확장성 높은 핸들러 구조를 만들기

### 해결 방법

1. switch
   ```java
   switch (message.getType()) {
       case CREATE -> roomManager.handleCreate(...);
       case JOIN -> roomManager.handleJoin(...);
   }
   ```
   - 메시지 타입 수가 늘어날 수록 switch가 비대해진다
   - 메시지 dto와 타입이 명확히 연결되지 않는다(type이랑 dto가 다를 수 있음)
2. pattern matching
   ```java
       if (message instanceof CreateMessage m) {
           roomManager.handleCreate(m);
       } else if (message instanceof JoinMessage j) {
           roomManager.handleJoin(j);
       }
   ```
   - 메시지 dto 타입별 분기가 가능
3. pattern matching for switch

   ```java
       switch(message) {
           case CreateMessage createMessage -> roomManager.handleCreate(createMessage)
           case JoinMessage joinMessage -> roomManager.handlejoin(joinMessage)
       }
   ```

   - if - else if 구조에 비해 깔끔
   - java 17에서 preview로만 사용 가능

4. GameMessageHandler<T> 도입

   ```java
   public interface GameMessageHandler<T extends GameMessage> {
       void handle(T message, WebSocketSession session);
   }
   ```

   ```java
   for (GameMessageHandler<?> handler : beans) {
       Type genericInterface = handler.getClass().getGenericInterfaces()[0];
       Class<?> messageClass = ((ParameterizedType) genericInterface).getActualTypeArguments()[0];
       handlerMap.put(messageClass, handler);
   }
   ```

   - 핸들러 자동 등록 시 어떤 메시지 타입을 처리하는지 연결정보가 없다
   - reflection을 통해 runtime에서 확인

5. enum 기반 핸들러 매핑

   ```java
   public void setApplicationContext(ApplicationContext applicationContext) {
   	var beans = applicationContext.getBeansOfType(AdminMessageHandler.class);
   	for (AdminMessageHandler<?> handler : beans.values()) {
   		AdminMessageType type = handler.getMessageType();
   		if (type != null) {
   			handlerMap.put(type, handler);
   		}
   	}
   }

   ```

   - compile 단계에서 messageType을 보고 handler 등록

### 정리

- 자동화된 리플렉션보다 명시적 선언이 유지보수에 유리할 수 있다.

## 250428 멀티인스턴스, 웹소켓

### 문제 상황

- 멀티 인스턴스 환경에서 웹소켓 세션을 어떻게 관리할 것인가?
- 현재 기획에 따르면 backbone 서버는 admin과 연결되어 room을 생성하고
- client들이 해당 room에 접속하는 방식이다.
- 이 때 멀티 인스턴스가 된다면 어떻게 세션을 관리하고 로드 밸런싱할 것인가?

### 아이디어

1. 로드밸런싱 자체는 앞단에 맡기고 어떤 세션을 찾아야할 때 모든 인스턴스에 해당 id의 세션을 찾고 메시지를 보내도록 브로드캐스트
   - 이미 쓰고 있는 redis를 사용해보려고 함
   - redis pub/sub은 at most once(fire and forget)이기 때문에 메시지 유실에 대한 고려 필요
   - 다른 메시징 큐를 쓰더라도 결국 외부와의 통신이 필요 -> 성능 저하 + 유실 및 retry등 고려 지점 증가
2. roomCode 기반 해싱을 통해 특정 roomCode는 특정 인스턴스에만 연결되도록 하고 브로드캐스트 시에도 내부 hashMap만 보면 되도록 설계
   - 일반적인 해싱 -> 하나의 인스턴스에 몰릴 수 있음
   - 방 생성 시 서버별 부하를 체크하고(redis 등에 각각 현재 세션 수) 분배

## 20250429 Broadcast

### 문제 상황

- broadcast를 구현하는 과정에서 broadcast 자체는 여러 메시지 핸들러에서 사용할 수 있다고 판단했다.
- broadcast를 전문으로 맡는 Broadcaster를 만들기로 했다.
- 모든 메시지를 보내는 과정이 동기적으로 이뤄진다면 너무 오랜 시간을 기다려야 하기 때문에 비동기 + 병렬적으로 처리하고 싶었다.
- @Async와 CompletableFuture가 후보로 있었다.
  - 둘다 ThreadPoolExecutor를 사용하도록 커스텀할 수 있기 때문에 스레드 수나 큐 사이즈를 쉽게 조절할 수 있다.
  - 주요 차이점은 관리 주체와 체이닝, 에러 처리 등 세밀한 사용이 가능한지 여부로 보인다.

### 해결 방법

- @Async를 사용해도 큰 무리가 없어보여 @Asnyc로 비동기 메시징을 구현했다.
- BroadCaster는 sessions를 인자로 받아 각각의 소켓에 message를 보내는 raw한 역할만 맡고 실제로 보내는 것은 AsnycMessageSender 클래스에 위임했다.
- 사실 Broadcaster 내부에서 처리하고 싶었는데 Spring AOP의 작동 방식에 따라 내부 호출 문제가 있어서 전송만 맡는 새로운 Component를 생성했다.
- 구조적으로 얼마나 잘 짜여쪘는지는 다시 생각해봐야 할 것 같다.

## 20250430 Broadcaster test

- Broadcaster를 테스트 해볼 수 있게 만들어두고 싶었다.
- 1000명의 유저가 있다고 가정하고 MockWebSocketSession, MockRoomRedisRepository, MockSessionRegistry를 만들어서 테스트 환경을 구성했다.
- 테스트를 짜다 보니 왜 Spring에서 제공하는 것들을 무분별하게 사용하지 않는게 좋다 + Dependency Inversion의 중요성?을 느낄 수 있었다.

1. @Async를 사용했기 때문에 나머지를 다 mocking해두고도 `@SpringTest`를 사용해서 테스트해야했다.
   - 테스트 자체는 매우 가벼운데 테스트 시작하는데 매우 오랜시간이 걸렸다.
   - CompletableFuture로의 전환도 생각해봐야할 것 같다.
2. Mockito를 제대로 사용할 줄 모르고 원하는 동작을 하게 하려다보니(sessionId 생성 내지 userIds 설정) 구현체를 직접 Mock하려고 시도했고 결국 RoomRedisRepository와 SessionRegistry를 interface화 했다.
