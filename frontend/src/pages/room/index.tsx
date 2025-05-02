import { useState, useEffect } from "react";
import GenerateQrCode from "../../components/QRcode";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
// import { WebSocketAdmin } from "../../assets/websocket";
import { v7 } from "uuid";

export default function Room() {
    const [nickname, setNickname] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);
    let requestId = v7();
    // useEffect(() => {
    //     // WebSocket 메시지를 수신할 때 상태 업데이트
    //     WebSocketAdmin.joinedUser((receivedNickname: string, receivedUserCount: number) => {
    //         setNickname(receivedNickname);
    //         setUserCount(receivedUserCount);
    //     });

    //     return () => {
    //         WebSocketAdmin.disconnect(); // 컴포넌트 언마운트 시 WebSocket 연결 해제
    //     };
    // }, []);

    const startGame = async () => {
        try {
            adminWebSocketManager.sendSessionInit(requestId, 1);
        } catch (error) {
            console.error("게임 시작 중 오류:", error);
        } finally {
            requestId = v7();
        }
    };

    const isAdmin = localStorage.getItem("administratorId") != null;
    const roomCode = localStorage.getItem("roomCode") || "000000";

    return (
        <div>
            <h1>시작 대기중...</h1>
            {nickname && <p>{nickname}님이 입장하셨습니다!</p>}
            {userCount !== null && <p>현재 인원: {userCount}명</p>}

            <GenerateQrCode roomCode={roomCode} />
            {isAdmin && (
                <button
                    onClick={startGame}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                    게임 시작
                </button>
            )}
        </div>
    );
}
