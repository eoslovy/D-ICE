import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../assets/api";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";

export default function Set() {
    const navigate = useNavigate();
    const [rounds, setRounds] = useState(3);
    let requestId = uuidv7();
    const createRoom = async () => {
        try {
            const data = await API.createRoom();
            console.log("방 생성 성공:", data);

            const { roomCode, administratorId } = data;

            const WS_URL = `ws://${
                import.meta.env.VITE_API_URL || "localhost:8080"
            }/ws/game/admin/${roomCode}`;

            adminWebSocketManager.setServerURL(WS_URL);
            adminWebSocketManager.connect();

            localStorage.setItem("roomCode", roomCode);
            localStorage.setItem("administratorId", administratorId);

            adminWebSocketManager.on(
                "ADMIN_JOINED",
                (payload: AdminJoinedMessage) => {
                    console.log(payload.requestId);
                }
            );

            // WebSocket 연결 및 관리자 입장
            // WebSocketAdmin.connectToAdmin(roomCode, administratorId);
            adminWebSocketManager.on("connect", () =>
                adminWebSocketManager.sendAdminJoin(requestId)
            );
            // 방 코드 저장 및 페이지 이동
            localStorage.setItem("roomCode", roomCode);
            localStorage.setItem("rounds", String(rounds));
            navigate(`/${roomCode}`);
        } catch (error) {
            console.error("방 생성 중 오류:", error);
        } finally {
            requestId = uuidv7();
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">게임 방 설정</h1>
            <div className="mb-4">
                <label className="block mb-2">라운드 수 (더미):</label>
                <select
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="p-2 rounded bg-gray-700 text-white"
                >
                    {Array.from({ length: 8 }, (_, i) => i + 3).map((round) => (
                        <option key={round} value={round}>
                            {round}
                        </option>
                    ))}
                </select>
            </div>
            <button
                onClick={createRoom}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
                방 생성
            </button>
        </div>
    );
}
