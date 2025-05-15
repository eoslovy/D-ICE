import { useState, useEffect, useRef } from "react";
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
    const { connectWebSocket } = useWebSocket();
    
    // ref로 최신 값 관리
    const requestIdRef = useRef(uuidv7());
    const roomCodeRef = useRef("");
    const roundsRef = useRef(rounds);

    // rounds 변경 시 ref 동기화
    useEffect(() => {
        roundsRef.current = rounds;
    }, [rounds]);

    // 이벤트 핸들러 (의존성 없이 ref 사용)
    const handleAdminJoined = (payload: AdminJoinedMessage) => {
        console.log("관리자 입장 성공:", payload);
        adminStore.getState().setStatus("WAITING");
        adminStore.getState().setRoomCode(roomCodeRef.current);
        adminStore.getState().setTotalRound(roundsRef.current);
        requestIdRef.current = uuidv7();
        navigate(`/adminroom/${roomCodeRef.current}`);
    };

    const handleConnect = () => {
        console.log("WebSocket 연결 성공");
        const adminJoinReq = adminWebSocketManager.sendAdminJoin(requestIdRef.current);
        console.log(adminJoinReq ? "ADMIN_JOIN 요청 성공" : "ADMIN_JOIN 요청 실패");
    };

    // 이벤트 리스너 등록/해제 (마운트/언마운트 시 1회만 실행)
    useEffect(() => {
        adminWebSocketManager.on("ADMIN_JOINED", handleAdminJoined);
        adminWebSocketManager.on("connect", handleConnect);
        console.log("roomSettings 이벤트 리스너 등록");
        return () => {
            adminWebSocketManager.off("ADMIN_JOINED", handleAdminJoined);
            adminWebSocketManager.off("connect", handleConnect);
            console.log("roomSettings 이벤트 리스너 해제");
        };
    }, []);

    const createRoom = async () => {
        try {
            setIsCreating(true);
            const data = await API.createRoom();
            console.log("방 생성 성공:", data);

            const { roomCode, administratorId } = data;
            roomCodeRef.current = roomCode; // ref에 roomCode 저장
            adminStore.getState().setAdministratorId(administratorId);

            const ADMIN_WS_URL = `${import.meta.env.VITE_WEBSOCKET_URL}/backbone/ws/game/admin/${roomCode}`;
            connectWebSocket("admin", ADMIN_WS_URL);

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
                            <Loader className="animate-spin mr-2" size={20} />
                            방 생성 중....
                        </div>
                    ) : (
                        "방 생성"
                    )}
                </button>
            </GameCard>
        </div>
    );
}
