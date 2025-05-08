import { useState, useEffect } from "react";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import BackgroundAnimation from "../../components/BackgroundAnimation";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
import { Users, Play, Clock } from "lucide-react";
import { adminStore } from "../../stores/adminStore";

export default function BroadcastRoom() {
    const roomCode = adminStore.getState().roomCode;
    const userCount = adminStore.getState().userCount;
    const totalRound = adminStore.getState().totalRound;
    const [currentRound, setCurrentRound] = useState(1);
    const [nextGame, setNextGame] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    let requestId = uuidv7();

    useEffect(() => {
        console.log("NEXT_GAME 이벤트 리스너 등록");
        adminWebSocketManager.on("NEXT_GAME", (payload: NextGameMessage) => {
            console.log("NEXT_GAME 응답 성공:", payload);
            setCurrentRound(payload.currentRound);
            setNextGame(payload.gameType);
            setIsLoading(false);
        });
        return () => {
            adminWebSocketManager.off(
                "NEXT_GAME",
                (payload: NextGameMessage) => {
                    console.log("NEXT_GAME 이벤트 리스너 해제:", payload);
                }
            );
        };
    }, []);

    const startGame = async () => {
        try {
            setIsLoading(true);
            console.log("게임 시작 요청:", roomCode);
            adminWebSocketManager.sendStartGame(requestId);
        } catch (error) {
            console.error("게임 시작 중 오류:", error);
            setIsLoading(false);
        } finally {
            requestId = uuidv7();
        }
    };

    return (
        <div className="game-container">
            <BackgroundAnimation />

            <GameCard>
                <h1 className="game-title">D-Ice Game</h1>

                <RoomCode code={String(roomCode)} />

                <div className="game-info mb-6">
                    <div className="flex items-center">
                        <Users className="mr-2" size={20} />
                        <span>참여자: {userCount}</span>
                    </div>
                    <div className="flex items-center">
                        <Clock className="mr-2" size={20} />
                        <span>
                            진행도: {currentRound}/{totalRound}
                        </span>
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="game-subtitle">
                        {nextGame === null ? (
                            <div className="animate-pulse">
                                다음 게임을 선정중...
                            </div>
                        ) : (
                            <div>
                                다음 게임:{" "}
                                <span className="text-quinary">{nextGame}</span>
                            </div>
                        )}
                    </h2>
                </div>

                {nextGame !== null && (
                    <button
                        onClick={startGame}
                        disabled={isLoading}
                        className={`btn btn-primary w-full flex items-center justify-center ${
                            isLoading ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                    >
                        {isLoading ? (
                            <span className="animate-pulse">진행중...</span>
                        ) : (
                            <>
                                <Play size={20} className="mr-2" />
                                게임 시작
                            </>
                        )}
                    </button>
                )}
            </GameCard>
        </div>
    );
}
