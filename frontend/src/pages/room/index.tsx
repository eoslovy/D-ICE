import { useState, useEffect } from "react";
import GenerateQrCode from "../../components/QRcode";
import { WebSocketAdmin } from "../../assets/websocket";
import { useNavigate } from "react-router-dom";

export default function Room() {
    const [nickname, setNickname] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);
    const isAdmin = localStorage.getItem("administratorId") != null;
    const roomCode = localStorage.getItem("roomCode") || "000000";
    const navigate = useNavigate();

    useEffect(() => {
        // WebSocket 메시지를 수신할 때 상태 업데이트
        WebSocketAdmin.joinedUser((receivedNickname: string, receivedUserCount: number) => {
            setNickname(receivedNickname);
            setUserCount(receivedUserCount);
        });

        return () => {
            WebSocketAdmin.disconnect(); // 컴포넌트 언마운트 시 WebSocket 연결 해제
        };
    }, []);

    const startGame = async () => {
        try {
            WebSocketAdmin.startGame();
        } catch (error) {
            console.error("게임 시작 중 오류:", error);
        }
    };

    const saveNickname = () => {
        if (nickname) {
            console.log("닉네임 저장:", nickname);
            localStorage.setItem("nickname", nickname);
            
            // WebSocket을 통해 서버에 닉네임 변경 알림 (선택 사항)
            // WebSocketAdmin.updateNickname(nickname);
        }
    };

    const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newNickname = e.target.value;
        setNickname(newNickname);
        localStorage.setItem("nickname", newNickname);
    };

    const deleteRoom = () => {
        localStorage.removeItem("roomCode");
        localStorage.removeItem("administratorId");
        localStorage.removeItem("rounds");
        navigate("/select");
    }


    return (
        <div>
            <h1>시작 대기중...</h1>
            {nickname && <p>{nickname}님이 입장하셨습니다!</p>}
            <h3>방 번호: {roomCode}</h3>
            {userCount == null && <p>현재 입장한 인원이 없습니다.</p>}
            {userCount !== null && <p>현재 인원: {userCount}명</p>}

            <GenerateQrCode roomCode={roomCode} />
            {isAdmin && (
                <div>
                    <button
                    onClick={startGame}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                    게임 시작
                </button>

                <button
                    onClick={deleteRoom}
                    className="ml-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                >
                    방 삭제
                </button>
                </div>
            )}

            {!isAdmin && (
                <div>
                    <input
                        type="text"
                        value={nickname || ""}
                        onChange={handleNicknameChange}
                        className="bg-gray-200 border rounded px-3 py-2"
                        placeholder="닉네임을 입력하세요"
                    />
                    <button
                        onClick={saveNickname}
                        className="ml-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                    >
                        닉네임 저장
                    </button>
                </div>
            )}
        </div>
    );
}