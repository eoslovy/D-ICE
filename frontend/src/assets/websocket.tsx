import webSocketManager from "../modules/WebSocketManager";
import { v7 as uuidv7 } from "uuid";

export const WebSocketService = {
    connectToAdmin(roomCode: string, administratorId: string) {
        const WS_URL = `ws://${import.meta.env.VITE_API_URL || "localhost:8080"}/ws/game/admin/${roomCode}`;
        webSocketManager.setServerURL(WS_URL);
        webSocketManager.connect();

        webSocketManager.on("connect", () => {
            const requestId = uuidv7(); // UUID 생성
            localStorage.setItem("administratorId", administratorId); // administratorId를 로컬 스토리지에 저장
            const adminJoinMessage = {
                type: "ADMIN_JOIN",
                requestId,
                administratorId,
            };

            webSocketManager.send(adminJoinMessage);
            console.log("관리자 입장 메시지 전송:", adminJoinMessage);
        });

        webSocketManager.on("message", (message) => {
            console.log("WebSocket 메시지 수신:", message);
        });

        webSocketManager.on("disconnect", (event) => {
            console.log("WebSocket 연결 해제:", event);
        });
    },

    startGame() {
        const requestId = uuidv7(); // UUID 생성
        const startGameMessage = {
            type: "INIT",
            requestId,
            administatorId: localStorage.getItem("administratorId"),
            totalRound: parseInt(localStorage.getItem("rounds") || "0", 10),
        };

        webSocketManager.send(startGameMessage);
        console.log("게임을 시작합니다.", startGameMessage);
    },

    disconnect() {
        webSocketManager.disconnect();
    },
};