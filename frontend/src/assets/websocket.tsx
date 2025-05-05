// import webSocketManager from "../modules/WebSocketManager";
// import { v7 as uuidv7 } from "uuid";

// export const WebSocketAdmin = {
//     connectToAdmin(roomCode:string, administratorId:string) {
//         const WS_URL = `ws://${import.meta.env.VITE_API_URL || "localhost:8080"}/ws/game/admin/${roomCode}`;
//         console.log(`[WebSocketAdmin] connectToAdmin 호출됨. URL: ${WS_URL}`);
//         webSocketManager.setServerURL(WS_URL);

//         // 로컬 스토리지에 roomCode와 administratorId를 저장해 재연결 시 사용
//         localStorage.setItem("roomCode", roomCode);
//         localStorage.setItem("administratorId", administratorId);

//         // WebSocket 연결 확인 및 재연결 로직
//         if (webSocketManager.getReadyState() !== WebSocket.OPEN) {
//             webSocketManager.connect();
//         }

//         webSocketManager.off("connect");
//         webSocketManager.on("connect", () => {
//             const requestId = uuidv7(); // UUID 생성
//             const adminJoinMessage = {
//                 type: "ADMIN_JOIN",
//                 requestId,
//                 administratorId,
//             };

//             webSocketManager.send(adminJoinMessage);
//             console.log("관리자 입장 메시지 전송:", adminJoinMessage);
//         });

//         webSocketManager.off("message");
//         webSocketManager.on("message", (message) => {
//             console.log("WebSocket 메시지 수신:", message);

//             let parsedMessage;
//         try {
//             // 메시지가 문자열인지 확인 후 파싱
//             if (typeof message === "string") {
//                 parsedMessage = JSON.parse(message);
//             } else {
//                 parsedMessage = message; // 이미 객체인 경우 그대로 사용
//             }

//             if (parsedMessage.type === "ADMIN_JOINED") {
//                 console.log("관리자 입장 메시지 처리:", parsedMessage);
//             }
//         } catch (error) {
//             console.error("메시지 파싱 중 오류:", error);
//         }
//         });

//         webSocketManager.off("disconnect");
//         webSocketManager.on("disconnect", (event) => {
//             console.log("WebSocket 연결 해제:", event);
//             // 연결이 끊어지면 재연결 시도
//             this.reconnectAdmin();
//         });
//     },

//     // 관리자 재연결 메소드 추가
//     reconnectAdmin() {
//         const roomCode = localStorage.getItem("roomCode");
//         const administratorId = localStorage.getItem("administratorId");

//         if (roomCode && administratorId) {
//             console.log("관리자 재연결 시도 중...");
//             setTimeout(() => {
//                 this.connectToAdmin(roomCode, administratorId);
//             }, 2000); // 2초 후 재연결 시도
//         } else {
//             console.error("재연결에 필요한 정보가 없습니다.");
//         }
//     },

//     startGame() {
//         const requestId = uuidv7(); // UUID 생성
//         const startGameMessage = {
//             type: "INIT",
//             requestId,
//             administatorId: localStorage.getItem("administratorId"),
//             totalRound: parseInt(localStorage.getItem("rounds") || "0", 10),
//         };

//         // WebSocket 연결 상태 확인 및 재연결 로직
//         if (webSocketManager.getReadyState() !== WebSocket.OPEN) {
//             console.log("WebSocket이 닫혀 있습니다. 재연결 시도 중...");
//             webSocketManager.connect();

//             webSocketManager.on("connect", () => {
//                 webSocketManager.send(startGameMessage);
//                 console.log("게임을 시작합니다.", startGameMessage);
//             });
//         } else {
//             webSocketManager.send(startGameMessage);
//             console.log("게임을 시작합니다.", startGameMessage);
//         }
//     },

//     joinedUser(callback: (nickname: string, userCount: number) => void) {
//         webSocketManager.on("message", (message) => {
//             console.log("WebSocket 메시지 수신:", message);

//             try {
//                 const parsedMessage = JSON.parse(message);

//                 if (parsedMessage.type === "USER_JOINED_ADMIN") {
//                     const { nickname, userCount } = parsedMessage;
//                     console.log("유저 정보 저장 완료:", { nickname, userCount });
//                     callback(nickname, userCount);
//                 }
//             } catch (error) {
//                 console.error("메시지 파싱 중 오류:", error);
//             }
//         });
//     },

//     disconnect() {
//         webSocketManager.disconnect();
//     }
// };

// export const WebSocketUser = {
//     joinRoom(roomCode: string, nickname: string): Promise<{ success: boolean; message?: string }> {
//         return new Promise((resolve, reject) => {
//             const WS_URL = `ws://${import.meta.env.VITE_API_URL || "localhost:8080"}/ws/game/user/${roomCode}`;
//             console.log(`[WebSocketUser] joinRoom 호출됨. URL: ${WS_URL}`);

//             // 기존 이벤트 리스너 제거
//             webSocketManager.off("connect");
//             webSocketManager.off("message");
//             webSocketManager.off("disconnect");
//             webSocketManager.off("error");

//             // 타임아웃 설정 (10초)
//             const timeout = setTimeout(() => {
//                 webSocketManager.disconnect(); // 연결 종료
//                 reject({ success: false, message: "연결 시간이 초과되었습니다." });
//                 cleanupListeners();
//             }, 10000);

//             // 리스너 정리 함수
//             const cleanupListeners = () => {
//                 webSocketManager.off("connect");
//                 webSocketManager.off("message");
//                 webSocketManager.off("disconnect");
//                 webSocketManager.off("error");
//             };

//             // 연결 해제 이벤트 처리
//             webSocketManager.on("disconnect", (event) => {
//                 console.log("WebSocket 연결 해제:", event);

//                 // 'Invalid room code' 오류 처리
//                 if (event.reason && event.reason.includes("Invalid room code")) {
//                     clearTimeout(timeout);
//                     webSocketManager.disconnect(); // 연결 종료
//                     reject({ success: false, message: "유효하지 않은 방 코드입니다." });
//                     cleanupListeners();
//                     return;
//                 }

//                 // 단순히 연결 해제 처리
//                 clearTimeout(timeout);
//                 webSocketManager.disconnect(); // 연결 종료
//                 reject({ success: false, message: "WebSocket 연결이 해제되었습니다." });
//                 cleanupListeners();
//             });

//             // 에러 이벤트 처리
//             webSocketManager.on("error", (error) => {
//                 clearTimeout(timeout);
//                 webSocketManager.disconnect(); // 연결 종료
//                 reject({ success: false, message: "WebSocket 연결 오류: " + error });
//                 cleanupListeners();
//             });

//             // 연결 성공 이벤트 처리
//             webSocketManager.on("connect", () => {
//                 console.log("WebSocket 연결됨, JOIN 메시지 전송");
//                 const joinRoomMessage = {
//                     type: "JOIN",
//                     requestId: uuidv7(),
//                     nickname: nickname,
//                 };
//                 webSocketManager.send(joinRoomMessage);
//             });

//             // 메시지 수신 이벤트 처리
//             webSocketManager.on("message", (message) => {
//                 try {
//                     const parsedMessage = JSON.parse(message);
//                     console.log("WebSocket 메시지 수신:", parsedMessage);

//                     // 에러 메시지 처리
//                     if (parsedMessage.type === "ERROR") {
//                         clearTimeout(timeout);
//                         webSocketManager.disconnect(); // 연결 종료
//                         reject({
//                             success: false,
//                             message: parsedMessage.message || "알 수 없는 오류가 발생했습니다."
//                         });
//                         cleanupListeners();
//                         return;
//                     }

//                     // 유저 입장 성공 처리
//                     if (parsedMessage.type === "USER_JOINED") {
//                         clearTimeout(timeout);

//                         const { userId, nickname } = parsedMessage;

//                         // 로컬 스토리지에 정보 저장
//                         localStorage.setItem("userId", userId);
//                         localStorage.setItem("nickname", nickname);
//                         localStorage.setItem("roomCode", roomCode);
//                         localStorage.setItem("userNickname", nickname);

//                         console.log("유저 정보 저장 완료:", { userId, nickname });
//                         resolve({ success: true });

//                         // 성공 후에는 기존 리스너 제거하지 않고 유지
//                         // 세션 동안 메시지를 계속 받아야 하기 때문
//                         return;
//                     }
//                 } catch (error) {
//                     console.error("메시지 파싱 중 오류:", error);
//                     webSocketManager.disconnect(); // 연결 종료
//                     reject({ success: false, message: "메시지 처리 중 오류가 발생했습니다." });
//                     cleanupListeners();
//                 }
//             });

//             // WebSocket 연결 시작
//             webSocketManager.setServerURL(WS_URL);
//             if (webSocketManager.getReadyState() !== WebSocket.OPEN) {
//                 webSocketManager.connect();
//             } else {
//                 // 이미 연결된 경우 바로 JOIN 메시지 전송
//                 const joinRoomMessage = {
//                     type: "JOIN",
//                     requestId: uuidv7(),
//                     nickname: nickname,
//                 };
//                 webSocketManager.send(joinRoomMessage);
//             }
//         });
//     },

//     disconnect() {
//         webSocketManager.disconnect();
//     }
// };
