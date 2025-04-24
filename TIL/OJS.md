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

## 20250423 WebSocket 표준 관련

### 문제 상황

- 서버 입장에서 관리자 세션이 살아있는지 확인하는 방법을 어떻게 구현할 것인가?
- 그 메시지에 특정 정보(현재 room에 있는 user 수)를 담아서 보낼 수 있는가

### 해결 순서

1. 우선 WebSocket 표준에 heartbeat가 있는지 확인했다.
   - 있는줄 알았는데 없었다
2. 대신 PingMessage와 PongMessage는 구현되어 있었다. [참고](https://datatracker.ietf.org/doc/html/rfc6455#section-5.5.2)
3. 그리고 PingMessage에는 127바이트까지 데이터를 담아서 보낼 수 있다.,
4. 다만 PingMessage는 프로토콜 레벨에서 처리되기 때문에 클라이언트쪽에서 해당 데이터에 접근할 수 없다.
5. 따라서 Ping을 저런 용도로 사용하기 위해서는 커스텀 ping message를 만들어서 써야한다.
