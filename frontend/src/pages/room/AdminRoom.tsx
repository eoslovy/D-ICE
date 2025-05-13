import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GenerateQrCode from "../../components/QRcode";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
import { adminStore } from "../../stores/adminStore";
import { v7 } from "uuid";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
import { Users, Play } from "lucide-react";

export default function AdminRoom() {
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState("");
    const [userNickname, setUserNickname] = useState<string[]>([]);
    const [latestNickname, setLatestNickname] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);
    let requestId = v7();
    const roomCode = adminStore.getState().roomCode;
    useEffect(() => {
        console.log("USER_JOINED_ADMIN 이벤트 리스너 등록");
        adminWebSocketManager.on(
            "USER_JOINED_ADMIN",
            (payload: UserJoinedAdminMessage) => {
                console.log("새로운 유저 입장:", payload);

                setUserCount(payload.userCount);
                adminStore.getState().setUserCount(payload.userCount);
                setLatestNickname(payload.nickname);

                setUserNickname((prev) =>
                    prev.includes(payload.nickname)
                        ? prev
                        : [...prev, payload.nickname]
                );
            }
        );

        return () => {
            adminWebSocketManager.off(
                "USER_JOINED_ADMIN",
                (payload: UserJoinedAdminMessage) => {
                    console.log(
                        "USER_JOINED_ADMIN 이벤트 리스너 해제:",
                        payload
                    );
                }
            );
        };
    }, []);

    const initGame = async () => {
        if (userCount === 0 || userCount === null) {
            setErrorMessage(
                "게임을 시작하려면 최소한 한 명의 참여자가 있어야 합니다."
            );
            return;
        }
        try {
            const initRes = adminWebSocketManager.sendSessionInit(
                requestId,
                adminStore.getState().totalRound
            );
            // 게임 중계 방으로 이동
            if (initRes === true) {
                adminStore.getState().setStatus("INGAME");
                navigate(`/broadcast/${roomCode}`);
                requestId = v7();
            } else {
                setErrorMessage(
                    "게임 시작 요청에 실패했습니다. 다시 시도해주세요."
                );
                console.error("INIT 요청 실패");
            }
        } catch (error) {
            setErrorMessage("게임 시작 중 알 수 없는 오류가 발생했습니다.");
            console.error("게임 시작 중 오류:", error);
        }
    };

    return (
        <div className="game-container">
            <GameCard>
                {/* <h1 className="game-title">게임명</h1> */}
                <div className="animate-pulse mb-6">
                    <h2 className="game-subtitle">유저 입장 대기중...</h2>
                </div>

                <RoomCode code={String(roomCode)} />

                <div className="mb-6 flex items-center justify-center">
                    <GenerateQrCode roomCode={String(roomCode)} />
                </div>

                <div className="mb-6 items-center">
                    {userCount !== null && (
                        <div className="flex items-center justify-center mb-4">
                            <Users className="mr-2" size={24} />
                            <span className="text-xl font-semibold">
                                참여자: {userCount}명
                            </span>
                        </div>
                    )}

                    {latestNickname && (
                        <div className="text-center mb-4 p-2 bg-green-100 dark:bg-green-900 rounded-lg animate-pulse">
                            <p className="game-enter">
                                {latestNickname}님이 입장했습니다!
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center">
                        {userNickname.length > 0 ? (
                            userNickname.map(
                                (nickname: string, index: number) => (
                                    <div key={index} className="user-badge">
                                        {nickname}
                                    </div>
                                )
                            )
                        ) : (
                            <p>아직 참가자가 없습니다.</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={initGame}
                    className="btn btn-primary w-full flex items-center justify-center"
                    disabled={userCount === 0}
                >
                    <Play size={20} className="mr-2" />
                    게임 시작
                </button>

                {errorMessage && (
                    <p className="text-warning">
                        게임을 시작하려면 최소한 한 명의 참여자가 있어야 합니다.
                    </p>
                )}
            </GameCard>
        </div>
    );
}
