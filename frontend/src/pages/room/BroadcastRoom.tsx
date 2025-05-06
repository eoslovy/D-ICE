import { useState, useEffect } from "react";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";


export default function BroadcastRoom() {
    const roomCode = localStorage.getItem("roomCode") || "000000";
    const userCount = localStorage.getItem("userCount") || "0";
    const totalRound = localStorage.getItem("totalRound") || "1";
    const [currentRound, setCurrentRound] = useState(1);
    const [nextGame, setNextGame] = useState<string | null>(null);
    let requestId = uuidv7();

    useEffect(() => {
        // NEXT_GAME 메시지 수신 이벤트 리스너 등록
        adminWebSocketManager.on(
            "NEXT_GAME",
            (payload: NextGameMessage) => {
                console.log("NEXT_GAME 응답 성공:", payload);
                setCurrentRound(payload.currentRound);
                setNextGame(payload.gameType);
            }
        );
    },[]);

    const startGame = async () => {
        try {
            console.log("게임 시작 요청:", roomCode);
            adminWebSocketManager.sendStartGame(requestId);
        } catch (error) {
            console.error("게임 시작 중 오류:", error);
        } finally {
            requestId = uuidv7();
        }
    }

    return (
        <div>
            <h1>다음 게임 대기중...</h1>
            <p>방 코드: {roomCode}</p>
            <p>총 인원: {userCount}명</p>
            <p>현재 라운드: {currentRound}/{totalRound} 라운드</p>
            {nextGame === null ? (
            <p>다음 게임 고르는중...</p>
            ) : (
                <div>
                <p>다음 게임: {nextGame}</p>
                <button
                    onClick={startGame}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                >
                    게임 시작
                </button>
                </div>
            )}
            
        </div>
        
    );
}