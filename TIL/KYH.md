# Today I learned

'김예현'

- 매일 한 작업
- 작업에서 배운 것 짧게 정리

### 2025-04-22

- 기획 회의 연장선
- React, NextJs 기초 설정
- 페이지 기획, 와이어프레임 제작

### 2025-04-23

- 기획 회의 연장선
- NextJs + Phaser3 템플릿 다운로드
    - tailwind 오류 발생
    - 내일 해결 후 global.css 완성 예정
    - 기본 페이지 select의 page.tsx로 변경 예정

### 2025-04-24

- tailwind 오류 해결 실패
- 템플릿 재다운 및 재설정

### 2025-04-25

- tailwind 해결 완료
- 개발환경 react+vite로 변경
  - 사유: 게임 개발측 phaser가 next와 호환이 잘 되지 않는다고 함

### 2025-04-28

- tailwind 재세팅
- 기초 페이지 세팅
  - select : roomCode가 session내에 존재하지 않을시 방 생성/참여 옵션 제공
  - lobby: 사용자가 게임 방에 참여하기 위해 코드를 입력하거나 qr코드를 촬영하여 해당 방에 참여
  - room (/${roomcode}): 게임 방
  - set (/roomSettings): 게임 방 생성 세팅

### 2025-04-29

- set 설정 변경
  - websocket, api 연결
- room에 qrcode 추가

### 2025-04-30

- 통신 구현
  - 관리자 방 생성, 시작
  - 사용자 입장