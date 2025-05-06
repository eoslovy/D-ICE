import { useState, useEffect } from "react";
import GenerateQrCode from "../../components/QRcode";
import { useNavigate } from "react-router-dom";

export default function AdminRoom() {
    const [nickname, setNickname] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);
    const navigate = useNavigate();

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
            // WebSocketAdmin.startGame();
            console.log("게임 시작 요청");
        } catch (error) {
            console.error("게임 시작 중 오류:", error);
        }
    };

    const deleteRoom = async () => {
        localStorage.removeItem("roomCode");
        localStorage.removeItem("administratorId");
        localStorage.removeItem("rounds");
        navigate("/select", { replace: true });
    };

    const roomCode = localStorage.getItem("roomCode") || "000000";

    return (
        <div>
            <h1>시작 대기중...</h1>
            {nickname && <p>{nickname}님이 입장하셨습니다!</p>}
            {userCount !== null && <p>현재 인원: {userCount}명</p>}

            <h3>방 코드: {roomCode}</h3>

            <GenerateQrCode roomCode={roomCode} />
            <button
                    onClick={startGame}
                    className="btn btn-primary"
                >
                    게임 시작
            </button>
            <button
                    onClick={deleteRoom}
                    className="btn btn-secondary"
                >
                    방 삭제
            </button>
        </div>
    );
}
