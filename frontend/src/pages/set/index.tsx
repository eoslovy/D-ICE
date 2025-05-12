import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../assets/api";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import { useWebSocket } from "../../modules/WebSocketContext";
import GameCard from "../../components/GameCard";
import { Settings, Loader } from "lucide-react";
import { adminStore } from "../../stores/adminStore";

export default function Set() {
    const navigate = useNavigate();
    const [rounds, setRounds] = useState(1);
    const [isCreating, setIsCreating] = useState(false);
    let requestId = uuidv7();
    const { connectWebSocket } = useWebSocket();
    const createRoom = async () => {
        try {
            setIsCreating(true);
            const data = await API.createRoom();
            console.log("방 생성 성공:", data);

            const { roomCode, administratorId } = data;

            adminStore.getState().setAdministratorId(administratorId);
            
            const ADMIN_WS_URL = `${import.meta.env.VITE_WEBSOCKET_URL}/backbone/ws/game/admin/${roomCode}`;
            connectWebSocket("admin", ADMIN_WS_URL);

            adminWebSocketManager.on(
                "ADMIN_JOINED",
                (payload: AdminJoinedMessage) => {
                    console.log("관리자 입장 성공:", payload);

                    // 방 코드, 라운드 수 저장 및 페이지 이동
                    adminStore.getState().setStatus("WAITING");
                    adminStore.getState().setRoomCode(roomCode);
                    adminStore.getState().setTotalRound(rounds);
                    requestId = uuidv7();
                    navigate(`/adminroom/${roomCode}`);
                }
            );

            adminWebSocketManager.on("connect", () => {
                console.log("WebSocket 연결 성공");
                const adminJoinReq = adminWebSocketManager.sendAdminJoin(requestId);
                if(adminJoinReq === true){
                    console.log("ADMIN_JOIN 요청 성공");
                }else{
                    console.log("ADMIN_JOIN 요청 실패");
                }
                
            });
        } catch (error) {
            console.error("방 생성 중 오류:", error);
            setIsCreating(false);
        }
    };

    return (
        <div className="game-container">
            <GameCard>
                <h1 className="game-title">
                    <Settings className="inline-flex mr-2" size={28} />
                    라운드 선택
                </h1>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        라운드 수:
                    </label>
                    <select
                        value={rounds}
                        onChange={(e) => setRounds(Number(e.target.value))}
                        className="select-field"
                        disabled={isCreating}
                    >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(
                            (round) => (
                                <option key={round} value={round}>
                                    {round} 라운드
                                </option>
                            )
                        )}
                    </select>
                </div>

                <button
                    onClick={createRoom}
                    disabled={isCreating}
                    className={`btn btn-primary w-full ${
                        isCreating ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                >
                    {isCreating ? (
                        <div className="flex items-center justify-center">
                            <Loader className="animate-spin mr-2" size={20} />방
                            생성 중....
                        </div>
                    ) : (
                        "방 생성"
                    )}
                </button>
            </GameCard>
        </div>
    );
}
