import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import userWebSocketManager from "../../modules/UserWebSocketManager";
import { useWebSocket } from "../../modules/WebSocketContext";
import { v7 as uuidv7 } from "uuid";
import { userStore } from "../../stores/userStore";
import BackgroundAnimation from "../../components/BackgroundAnimation";
import GameCard from "../../components/GameCard"
import { LogIn, Loader } from "lucide-react"

export default function Lobby() {
    const urlRoomCode = sessionStorage.getItem("urlRoomCode") || null;
    const [roomCodeInput, setroomCodeInput] = useState(urlRoomCode === null ? "" : urlRoomCode);
    const [nicknameInput, setnicknameInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isJoining, setIsJoining] = useState(false)
    const navigate = useNavigate();
    const { connectWebSocket } = useWebSocket();
    let requestId = uuidv7();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nicknameInput) {
            setErrorMessage("닉네임을 입력하세요.");
            return;
        }

        if (!roomCodeInput) {
            setErrorMessage("방 번호를 입력하세요.");
            return;
        }

        try {
            setIsJoining(true);

            const USER_WS_URL = `ws://${
                import.meta.env.VITE_API_URL || "localhost:8080"
            }/ws/game/user/${roomCodeInput}`;
            connectWebSocket("user", USER_WS_URL);

            userWebSocketManager.on(
                "USER_JOINED",
                (payload: UserJoinedMessage) => {
                    console.log("유저 입장 성공:", payload);

                    // zustand에 상태 저장
                    userStore.getState().setStatus("WAITING");
                    userStore.getState().setUserId(payload.userId);
                    userStore.getState().setRoomCode(roomCodeInput);
                    userStore.getState().setNickname(nicknameInput);

                    sessionStorage.removeItem('urlRoomCode');

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
            setIsJoining(false)
            setErrorMessage("방 입장에 실패했습니다. 다시 시도해주세요.");
        } finally {
            requestId = uuidv7();
        }
    };

    return (
        <div className="game-container">
          <GameCard>
            <h1 className="game-title">Join Game</h1>
    
            <form onSubmit={handleSubmit} className="grid gap-4">
              <input
                id="nickname"
                type="text"
                value={nicknameInput}
                onChange={(e) => {
                  setnicknameInput(e.target.value)
                  setErrorMessage("")
                }}
                className="input-field"
                placeholder="닉네임을 입력해주세요."
                disabled={isJoining}
              />
    
              <input
                id="urlRoomCode"
                type="text"
                value={roomCodeInput}
                onChange={(e) => {
                  setroomCodeInput(e.target.value)
                  setErrorMessage("")
                }}
                className="input-field"
                placeholder="방 번호를 입력해주세요."
                disabled={urlRoomCode !== null || isJoining}
              />
              
              {urlRoomCode !== null && (
                <button
                  type="button"
                  className={`btn btn-secondary flex items-center justify-center ${isJoining ? "opacity-70 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    sessionStorage.removeItem("urlRoomCode"); // 로컬 스토리지에서 urlRoomCode 제거
                    setroomCodeInput(""); // 입력 필드 초기화
                    setErrorMessage(""); // 에러 메시지 초기화
                  }}
                  disabled={isJoining}
                >
                  방 번호 초기화
                </button>
              )}
    
              <button
                type="submit"
                className={`btn btn-primary flex items-center justify-center ${isJoining ? "opacity-70 cursor-not-allowed" : ""}`}
                disabled={isJoining}
              >
                {isJoining ? (
                  <div className="flex items-center">
                    <Loader className="animate-spin mr-2" size={20} />
                    참여중....
                  </div>
                ) : (
                  <>
                    <LogIn className="mr-2" size={20} />
                    게임 참여하기
                  </>
                )}
              </button>
            </form>
    
            {errorMessage && <p className="text-warning mt-4">{errorMessage}</p>}
          </GameCard>
        </div>
      );
}
