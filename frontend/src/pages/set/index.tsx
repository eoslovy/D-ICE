import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../assets/api";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import { useWebSocket } from "../../modules/WebSocketContext";
import BackgroundAnimation from "../../components/BackgroundAnimation";
import GameCard from "../../components/GameCard";
import DarkModeToggle from "../../components/DarkModeToggle";
import { Settings, Loader } from "lucide-react";

interface AdminJoinedMessage {
    // Define the structure of AdminJoinedMessage here.  For example:
    message: string;
}

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

            localStorage.setItem("administratorId", administratorId);

            const ADMIN_WS_URL = `ws://${
                import.meta.env.VITE_API_URL || "localhost:8080"
            }/ws/game/admin/${roomCode}`;
            connectWebSocket("admin", ADMIN_WS_URL);

            adminWebSocketManager.on(
                "ADMIN_JOINED",
                (payload: AdminJoinedMessage) => {
                    console.log("관리자 입장 성공:", payload);

                    // 방 코드, 라운드 수 저장 및 페이지 이동
                    localStorage.setItem("roomCode", roomCode);
                    localStorage.setItem("rounds", String(rounds));
                    navigate(`/adminroom/${roomCode}`);
                }
            );

            adminWebSocketManager.on("connect", () => {
                console.log("WebSocket 연결 성공");
                adminWebSocketManager.sendAdminJoin(requestId);
            });
        } catch (error) {
            console.error("방 생성 중 오류:", error);
            setIsCreating(false);
        } finally {
            requestId = uuidv7();
        }
    };

    return (
        <div className="game-container">
            <BackgroundAnimation />
            <DarkModeToggle />

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
