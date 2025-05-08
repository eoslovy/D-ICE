import { useState, useEffect } from "react";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import BackgroundAnimation from "../../components/BackgroundAnimation";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
import Result from "../../components/Result";
import FinalResult from "../../components/FinalResult";
import { Users, Play, Clock } from "lucide-react";

export default function BroadcastRoom() {
    const roomCode = localStorage.getItem("roomCode") || "000000";
    const userCount = localStorage.getItem("userCount") || "0";
    const totalRound = localStorage.getItem("totalRound") || "1";
    const [currentRound, setCurrentRound] = useState(1);
    const [nextGame, setNextGame] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [gameResults, setGameResults] = useState<string| null>(null);
    let requestId = uuidv7();

    useEffect(() => {
        console.log("NEXT_GAME 이벤트 리스너 등록");
        adminWebSocketManager.on("NEXT_GAME", (payload: NextGameMessage) => {
            console.log("NEXT_GAME 응답 성공:", payload);
            setCurrentRound(payload.currentRound);
            setNextGame(payload.gameType);
            setIsLoading(false);
        });

        // 게임 결과 이벤트 리스너 (실제 이벤트 이름은 API에 맞게 수정 필요)
        adminWebSocketManager.on("AGGREGATED_ADMIN", (payload: AggregatedAdminMessage) => {
            console.log("게임 결과 수신:", payload);
            setGameResults(payload.currentRound);
            setShowResults(true);
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

    const isFinalResult =
        gameResults?.isFinalResult || testResults.isFinalResult;

    return (
        <div className="game-container">
            <BackgroundAnimation />

            {showResults ? (
                <div className="relative z-10 w-full max-w-4xl p-6 mx-auto rounded-2xl shadow-lg bg-opacity-95 backdrop-blur-sm bg-quaternary">
                    {isFinalResult ? (
                        <FinalResult
                            players={
                                gameResults?.players || testResults.players
                            }
                            gameTitle={
                                gameResults?.gameTitle || testResults.gameTitle
                            }
                            onContinue={handleContinue}
                        />
                    ) : (
                        <Result
                            players={
                                gameResults?.players || testResults.players
                            }
                            gameTitle={
                                gameResults?.gameTitle || testResults.gameTitle
                            }
                            isFinalResult={false}
                            onContinue={handleContinue}
                        />
                    )}
                </div>
            ) : (
                <GameCard>
                    <h1 className="game-title">D-Ice Game</h1>

                    <RoomCode code={roomCode} />

                    <div className="game-info mb-6">
                        <div className="flex items-center">
                            <Users className="mr-2" size={20} />
                            <span>플레이어: {userCount}</span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="mr-2" size={20} />
                            <span>
                                라운드: {currentRound}/{totalRound}
                            </span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="game-subtitle">
                            {nextGame === null ? (
                                <div className="animate-pulse">
                                    다음 게임 선택 중...
                                </div>
                            ) : (
                                <div>
                                    다음 게임:{" "}
                                    <span className="text-quinary">
                                        {nextGame}
                                    </span>
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
                                <span className="animate-pulse">
                                    시작 중...
                                </span>
                            ) : (
                                <>
                                    <Play size={20} className="mr-2" />
                                    게임 시작
                                </>
                            )}
                        </button>
                    )}
                </GameCard>
            )}
        </div>
    );
}
