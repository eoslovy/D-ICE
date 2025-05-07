import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../assets/api";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import { useWebSocket } from "../../modules/WebSocketContext";
import { adminStore } from "../../stores/adminStore";

export default function Set() {
    const navigate = useNavigate();
    const [totalRound, setTotalRound] = useState(1);
    let requestId = uuidv7();
    const { connectWebSocket } = useWebSocket();
    const createRoom = async () => {
        try {
            const data = await API.createRoom();
            console.log("방 생성 성공:", data);

            const { roomCode, administratorId } = data;

            adminStore.getState().setadministratorId(administratorId);

            const ADMIN_WS_URL = `ws://${
                import.meta.env.VITE_API_URL || "localhost:8080"
            }/ws/game/admin/${roomCode}`;
            connectWebSocket("admin", ADMIN_WS_URL);

            adminWebSocketManager.on(
                "ADMIN_JOINED",
                (payload: AdminJoinedMessage) => {
                    console.log("관리자 입장 성공:", payload);

                    // 방 코드, 라운드 수 저장 및 페이지 이동
                    adminStore.getState().setRoomCode(roomCode);
                    adminStore.getState().setTotalRound(totalRound);
                    navigate(`/adminroom/${roomCode}`);
                }
            );

            adminWebSocketManager.on("connect", () =>{
                console.log("WebSocket 연결 성공");
                adminWebSocketManager.sendAdminJoin(requestId);
            });

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
                    value={totalRound}
                    onChange={(e) => setTotalRound(Number(e.target.value))}
                    className="p-2 rounded bg-gray-700 text-white"
                >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((round) => (
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
