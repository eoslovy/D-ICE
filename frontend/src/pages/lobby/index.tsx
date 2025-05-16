import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import userWebSocketManager from "../../modules/UserWebSocketManager";
import { useWebSocket } from "../../modules/WebSocketContext";
import { v7 as uuidv7 } from "uuid";
import { userStore } from "../../stores/userStore";
import GameCard from "../../components/GameCard";
import { LogIn, Loader } from "lucide-react";

export default function Lobby() {
    const urlRoomCode = sessionStorage.getItem("urlRoomCode") || null;
    const [roomCodeInput, setroomCodeInput] = useState(
        urlRoomCode === null ? "" : urlRoomCode
    );
    const [nicknameInput, setnicknameInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const navigate = useNavigate();
    const { connectWebSocket } = useWebSocket();

    // ref로 최신 값 관리
    const roomCodeRef = useRef(roomCodeInput);
    const nicknameRef = useRef(nicknameInput);
    const requestIdRef = useRef(uuidv7());

    // ref 값 동기화
    useEffect(() => {
        roomCodeRef.current = roomCodeInput;
        nicknameRef.current = nicknameInput;
    }, [roomCodeInput, nicknameInput]);

    // 이벤트 핸들러 (의존성 없이 ref 사용)
    const handleUserJoined = (payload: UserJoinedMessage) => {
        console.log("유저 입장 성공:", payload);
        userStore.getState().setStatus("WAITING");
        userStore.getState().setUserId(payload.userId);
        userStore.getState().setRoomCode(roomCodeRef.current);
        userStore.getState().setNickname(nicknameRef.current);
        sessionStorage.removeItem("urlRoomCode");
        navigate(`/userroom/${roomCodeRef.current}`);
    };

    const handleConnect = () => {
        console.log("WebSocket 연결 성공");
        userWebSocketManager.sendUserJoin(
            requestIdRef.current,
            nicknameRef.current
        );
    };

    const handleDisconnect = (payload: unknown) => {
        const { code } = payload as { code: number; reason: string };
        if (code === 1008) {
            console.error("방 코드가 유효하지 않습니다. 연결 실패.");
            setErrorMessage("방 번호가 유효하지 않습니다. 다시 확인해 주세요.");
            setIsJoining(false);
        }
    };

    // 이벤트 리스너 등록/해제 (마운트/언마운트 시 1회만 실행)
    useEffect(() => {
        userWebSocketManager.on("USER_JOINED", handleUserJoined);
        userWebSocketManager.on("connect", handleConnect);
        userWebSocketManager.on("disconnect", handleDisconnect);
        console.log("Lobby 이벤트 리스너 등록");

        return () => {
            userWebSocketManager.off("USER_JOINED", handleUserJoined);
            userWebSocketManager.off("connect", handleConnect);
            userWebSocketManager.off("disconnect", handleDisconnect);
            console.log("Lobby 이벤트 리스너 해제");
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nicknameLength = [...nicknameInput].length;

        if (!nicknameInput || !roomCodeInput || nicknameLength > 12) {
            if (nicknameLength > 12) {
                setErrorMessage("닉네임을 12자 이하로 입력하세요.");
            } else if (!nicknameInput) {
                setErrorMessage("닉네임을 입력하세요.");
            } else {
                setErrorMessage("방 번호를 입력하세요.");
            }
            return;
        }

        try {
            setIsJoining(true);
            requestIdRef.current = uuidv7(); // 요청 ID 갱신

            const USER_WS_URL = `${
                import.meta.env.VITE_WEBSOCKET_URL
            }/backbone/ws/game/user/${roomCodeInput}`;
            connectWebSocket("user", USER_WS_URL);
        } catch (error: any) {
            console.error("방 입장 중 오류:", error);
            setIsJoining(false);
            setErrorMessage("방 입장에 실패했습니다. 다시 시도해주세요.");
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
                            setnicknameInput(e.target.value);
                            setErrorMessage("");
                        }}
                        className="input-field"
                        placeholder="닉네임을 12자 이하로 입력해주세요."
                        disabled={isJoining}
                    />

                    <input
                        id="urlRoomCode"
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => {
                            setroomCodeInput(e.target.value);
                            setErrorMessage("");
                        }}
                        className="input-field"
                        placeholder="방 번호를 입력해주세요."
                        disabled={urlRoomCode !== null || isJoining}
                    />

                    {urlRoomCode !== null && (
                        <button
                            type="button"
                            className={`btn btn-secondary flex items-center justify-center ${
                                isJoining ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                            onClick={() => {
                                sessionStorage.removeItem("urlRoomCode");
                                setroomCodeInput("");
                                setErrorMessage("");
                            }}
                            disabled={isJoining}
                        >
                            방 번호 초기화
                        </button>
                    )}

                    <button
                        type="submit"
                        className={`btn btn-primary flex items-center justify-center ${
                            isJoining ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        disabled={isJoining}
                    >
                        {isJoining ? (
                            <div className="flex items-center">
                                <Loader
                                    className="animate-spin mr-2"
                                    size={20}
                                />
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

                {errorMessage && <p className="text-warning">{errorMessage}</p>}
            </GameCard>
        </div>
    );
}
