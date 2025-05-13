import { useState, useEffect } from "react";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
// import Result from "../../components/Result";
// import FinalResult from "../../components/FinalResult";
import Result from "../../components/Results";
import { Users, Play, Clock } from "lucide-react";
import { adminStore } from "../../stores/adminStore";
import { useNavigate } from "react-router-dom";

export default function BroadcastRoom() {
    const roomCode = adminStore.getState().roomCode;
    const userCount = adminStore.getState().userCount;
    const totalRound = adminStore.getState().totalRound;

    const [currentRound, setCurrentRound] = useState(1);
    const [nextGame, setNextGame] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<AggregatedAdminMessage | null>(null);
    const [finalData, setFinalData] = useState<EndMessage | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [showFinalResult, setShowFinalResult] = useState(false);

    const navigate = useNavigate();
    let requestId = uuidv7();

    useEffect(() => {
        adminWebSocketManager.on("NEXT_GAME", (payload: NextGameMessage) => {
            setCurrentRound(payload.currentRound);
            setNextGame(payload.gameType);
            adminStore.getState().setGameType(payload.gameType);
            setIsLoading(false);
        });

        adminWebSocketManager.on("AGGREGATED_ADMIN", (payload: AggregatedAdminMessage) => {
            setData(payload);
            setShowResults(true);
        });

        adminWebSocketManager.on("END", (payload: EndMessage) => {
            setFinalData(payload);
        });

        return () => {
            adminWebSocketManager.off("NEXT_GAME", () => {});
            adminWebSocketManager.off("AGGREGATED_ADMIN", () => {});
            adminWebSocketManager.off("END", () => {});
        };
    }, []);

    const startGame = async () => {
        try {
            
            const startReq = adminWebSocketManager.sendStartGame(requestId);
            if (startReq === true){
                console.log("게임 시작 요청 성공", nextGame);
                setIsLoading(true);
                requestId = uuidv7();
            } else {
                setIsLoading(false);
                console.log("게임 시작 요청 실패", nextGame);
            }
        } catch (error) {
            console.error("게임 시작 중 오류:", error);
            setIsLoading(false);
        }
    };

    const handleContinue = () => {
        setShowResults(false);

        const finishedRound = data?.currentRound ?? 0;
        const isFinal = finishedRound === totalRound;

        if (isFinal) {
            setShowFinalResult(true);
        }
    };

    const handleGoLobby = () => {
        localStorage.removeItem("adminStore");
        navigate('/select');
    };

    return (
        <div className="game-container">
            {showResults && !showFinalResult ? (
                <div className="relative z-10 w-full max-w-4xl p-6 mx-auto rounded-2xl shadow-lg bg-opacity-95 backdrop-blur-sm bg-quaternary">
                    <Result data={data} onContinue={handleContinue} />
                </div>
            ) : showFinalResult ? (
                <div className="relative z-10 w-full max-w-4xl p-6 mx-auto rounded-2xl shadow-lg bg-opacity-95 backdrop-blur-sm bg-quaternary">
                    <Result
                        data={data}
                        finalData={finalData}
                        goLobby={handleGoLobby}
                        isFinalView={true}
                    />
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
                            <span>라운드: {currentRound}/{totalRound}</span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h2 className="game-subtitle">
                            {nextGame === null ? (
                                <div className="animate-pulse">다음 게임 선택 중...</div>
                            ) : (
                                <div>
                                    다음 게임: <span className="text-quinary">{nextGame}</span>
                                </div>
                            )}
                        </h2>
                    </div>

                    {nextGame !== null && (
                        <button
                            onClick={startGame}
                            disabled={isLoading}
                            className={`btn btn-primary w-full flex items-center justify-center ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            {isLoading ? (
                                <span className="animate-pulse">게임 중...</span>
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