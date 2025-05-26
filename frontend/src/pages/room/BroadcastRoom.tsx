import { useState, useEffect, useRef } from "react";
import { v7 as uuidv7 } from "uuid";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
// import Result from "../../components/Result";
// import FinalResult from "../../components/FinalResult";
import Result from "../../components/Results";
import { Users, Play, Clock, Gamepad2 } from "lucide-react";
import { adminStore } from "../../stores/adminStore";
import { useNavigate } from "react-router-dom";
import OverlayScreen, {
    OverlayScreenHandle,
} from "../../modules/OverlayScreen";

export default function BroadcastRoom() {
    const roomCode = adminStore.getState().roomCode;
    const userCount = adminStore.getState().userCount;
    const totalRound = adminStore.getState().totalRound;

    const [currentRound, setCurrentRound] = useState(1);
    const [nextGame, setNextGame] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAggregated, setIsAggregated] = useState(false);
    const [data, setData] = useState<AggregatedAdminMessage | null>(null);
    const [finalData, setFinalData] = useState<EndMessage | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [showFinalResult, setShowFinalResult] = useState(false);
    const [gameTimer, setGameTimer] = useState(0);
    const [status, setStatus] = useState("대기 중...");
    const timerRef = useRef(0);

    const navigate = useNavigate();
    let requestId = uuidv7();

    const overlayRef = useRef<OverlayScreenHandle>(null);

    const handleTriggerMessage = (
        text: string,
        fontSize: number = 48,
        duration: number = 3000,
        withEffect: boolean = true
    ) => {
        if (overlayRef.current) {
            overlayRef.current.triggerMessage(
                text,
                fontSize,
                duration,
                withEffect
            );
        }
    };

    useEffect(() => {
        if (isLoading && !isAggregated) {
            setStatus("게임 중...");
            timerRef.current = setInterval(() => {
                setGameTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setStatus("집계 중...");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isLoading, isAggregated]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (nextGame === null) {
                console.warn(
                    "NEXT_GAME 메시지를 받지 못해 기본값으로 설정합니다."
                );
                setNextGame("알 수 없음");
            }
        }, 5000); // 5초

        adminWebSocketManager.on("NEXT_GAME", (payload: NextGameMessage) => {
            clearTimeout(timeoutId); // 타임아웃 취소
            setCurrentRound(payload.currentRound);
            setNextGame(payload.gameType);
            setGameTimer(payload.duration / 1000);
            setIsAggregated(false);
            adminStore.getState().setGameType(payload.gameType);
            setIsLoading(false);
        });

        adminWebSocketManager.on(
            "AGGREGATED_ADMIN",
            (payload: AggregatedAdminMessage) => {
                setData(payload);
                setShowResults(true);
                setIsAggregated(true);
                setStatus("대기 중...");
            }
        );

        adminWebSocketManager.on(
            "BROADCAST",
            ({ payload }: BroadcastMessage) => {
                handleTriggerMessage(payload);
            }
        );

        adminWebSocketManager.on("END", (payload: EndMessage) => {
            setFinalData(payload);
        });

        adminWebSocketManager.on("SERVER_ERROR", (payload: ErrorMessage) => {
            if (payload.message.startsWith("[startGame]")) setIsLoading(false);
        });

        return () => {
            clearTimeout(timeoutId);
            adminWebSocketManager.off("NEXT_GAME");
            adminWebSocketManager.off("AGGREGATED_ADMIN");
            adminWebSocketManager.off("END");
            adminWebSocketManager.off("BROADCAST");
            adminWebSocketManager.off("SERVER_ERROR");
            console.log("BroadcastRoom 이벤트 리스너 해제");
        };
    }, []);

    const startGame = async () => {
        try {
            const startReq = adminWebSocketManager.sendStartGame(requestId);
            if (startReq === true) {
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
        adminWebSocketManager.disconnect();
        localStorage.removeItem("adminStore");
        sessionStorage.removeItem("isFinal");
        navigate("/select");
    };

    return (
        <div className="game-container">
            <OverlayScreen ref={overlayRef} />
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
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center flex-1">
                                <Users className="mr-2" size={20} />
                                <span>플레이어: {userCount}</span>
                            </div>

                            <div className="flex items-center justify-center flex-1">
                                <Gamepad2 className="mr-2" size={20} />
                                <span>
                                    라운드: {currentRound}/{totalRound}
                                </span>
                            </div>

                            <div className="flex items-center justify-end flex-1">
                                <Clock className="mr-2" size={20} />
                                <span className="fixed-timer-width">
                                    {status === "게임 중..."
                                        ? `${gameTimer}초`
                                        : status}
                                </span>
                            </div>
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
                                <span className="animate-pulse">{status}</span>
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
