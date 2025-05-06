import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GenerateQrCode from "../../components/QRcode";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
// import { WebSocketAdmin } from "../../assets/websocket";
import { v7 } from "uuid";

export default function AdminRoom() {
    const navigate = useNavigate();
    const [userNickname, setUserNickname] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);
    let requestId = v7();
    const roomCode = localStorage.getItem("roomCode") || "000000";

    useEffect(() => {
        // USER_JOINED_ADMIN 메시지 수신 이벤트 리스너 등록
        adminWebSocketManager.on(
            "USER_JOINED_ADMIN",
            (payload: UserJoinedAdminMessage) => {
                console.log("새로운 유저 입장:", payload);

                setUserCount(payload.userCount);
                setUserNickname(payload.nickname);
            }
        );

        // return () => {
        //     adminWebSocketManager.disconnect(); // 컴포넌트 언마운트 시 WebSocket 연결 해제
        // };
    }, []);

    const initGame = async () => {
        try {
            // 임시로 라운드 수 1로 고정
            adminWebSocketManager.sendSessionInit(requestId, 1);
            // 게임 중계 방으로 이동
            navigate(`/broadcast/${roomCode}`);

        } catch (error) {
            console.error("게임 시작 중 오류:", error);
        } finally {
            requestId = v7();
        }
    };

    

    return (
        <div>
            <h1>시작 대기중...</h1>
            {userNickname && <p>{userNickname}님이 입장하셨습니다!</p>}
            {userCount !== null && <p>현재 인원: {userCount}명</p>}

            <GenerateQrCode roomCode={roomCode} />
            <button
                onClick={initGame}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
                게임 시작
            </button>
        </div>
    );
}
