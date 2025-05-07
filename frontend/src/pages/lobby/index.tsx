import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import userWebSocketManager from "../../modules/UserWebSocketManager";
import { useWebSocket } from "../../modules/WebSocketContext";
import { v7 as uuidv7 } from "uuid";
// import { WebSocketUser } from "../../assets/websocket";

export default function Lobby() {
    const [roomCodeInput, setroomCodeInput] = useState("");
    const [nicknameInput, setnicknameInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();
    const { connectWebSocket } = useWebSocket();
    let requestId = uuidv7();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nicknameInput) {
            setErrorMessage("닉네임을 입력하세요.");
            return;
        }

        if (!roomCodeInput && roomCodeInput === "000000") {
            // 방 코드가 비어있고 기본값인 경우
            setErrorMessage("방 번호를 입력하세요.");
            return;
        }

        try {
            const USER_WS_URL = `ws://${
                import.meta.env.VITE_API_URL || "localhost:8080"
            }/ws/game/user/${roomCodeInput}`;
            connectWebSocket("user", USER_WS_URL);

            userWebSocketManager.on(
                "USER_JOINED",
                (payload: UserJoinedMessage) => {
                    console.log("유저 입장 성공:", payload);

                    // 방 코드, 닉네임 저장 및 페이지 이동
                    localStorage.setItem("roomCode", roomCodeInput);
                    localStorage.setItem("nickname", nicknameInput);
                    navigate(`/userroom/${roomCodeInput}`);
                }
            );

            userWebSocketManager.on("connect", () => {
                console.log("WebSocket 연결 성공");
                userWebSocketManager.sendUserJoin(requestId, nicknameInput);
            });
 
        } catch (error: any) {
            // 서버 연결 실패, 유효하지 않은 방 코드 등의 오류 처리
            console.error("방 입장 중 오류:", error);
            setErrorMessage("방 입장에 실패했습니다. 다시 시도해주세요.");
        } finally {
            requestId = uuidv7();
        }
    };

    return (
        <div>
            <h1>Welcome</h1>

            <form onSubmit={handleSubmit} className="grid gap-4">
                <input
                    id="nickname"
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => {
                        setnicknameInput(e.target.value);
                        setErrorMessage("");
                    }}
                    className="flex-1 border rounded px-3 py-2 bg-white"
                    placeholder="닉네임을 입력하세요"
                />

                <div className="flex items-center">
                    {roomCode == "000000" && (
                        <input
                        id="roomCode"
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => {
                            setroomCodeInput(e.target.value);
                            setErrorMessage("");
                        }}
                        className="flex-1 border rounded px-3 py-2 bg-white"
                        placeholder="방 번호를 입력하세요"
                    />
                    )}
                </div>
                <button
                        type="submit"
                        className="btn btn-primary"
                    >
                        입장
                </button>
            </form>

            {/* 에러 메시지 출력 */}
            {errorMessage && (
                <p className="text-warning">{errorMessage}</p>
            )}
        </div>
    );
}
