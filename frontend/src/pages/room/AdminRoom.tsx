import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GenerateQrCode from "../../components/QRcode";
import adminWebSocketManager from "../../modules/AdminWebSocketManager";
<<<<<<< HEAD
import { adminStore } from "../../stores/adminStore";
import { v7 } from "uuid";

export default function AdminRoom() {
    const navigate = useNavigate();
    const [userNickname, setUserNickname] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);
    let requestId = v7();
    const roomCode = adminStore.getState().roomCode;
=======
// import { WebSocketAdmin } from "../../assets/websocket";
import { v7 } from "uuid";
import BackgroundAnimation from "../../components/BackgroundAnimation";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
import DarkModeToggle from "../../components/DarkModeToggle";
import { Users, Play } from "lucide-react";

interface UserJoinedAdminMessage {
    nickname: string;
    userCount: number;
}

export default function AdminRoom() {
    const navigate = useNavigate();
    const [userNickname, setUserNickname] = useState<string[]>([]);
    const [latestNickname, setLatestNickname] = useState<string | null>(null);
    const [userCount, setUserCount] = useState<number | null>(null);
    let requestId = v7();
    const roomCode = localStorage.getItem("roomCode") || "000000";
>>>>>>> a9028b3bb9235a1c8128430e4c999078d58131b4

    useEffect(() => {
        console.log("USER_JOINED_ADMIN 이벤트 리스너 등록");
        adminWebSocketManager.on(
            "USER_JOINED_ADMIN",
            (payload: UserJoinedAdminMessage) => {
                console.log("새로운 유저 입장:", payload);

                setUserCount(payload.userCount);
<<<<<<< HEAD
                setUserNickname(payload.nickname);
=======
                setLatestNickname(payload.nickname);

                setUserNickname((prev) =>
                    prev.includes(payload.nickname)
                        ? prev
                        : [...prev, payload.nickname]
                );
>>>>>>> a9028b3bb9235a1c8128430e4c999078d58131b4
            }
        );

        return () => {
<<<<<<< HEAD
            adminWebSocketManager.off("USER_JOINED_ADMIN", (payload: UserJoinedAdminMessage) => {
                console.log("USER_JOINED_ADMIN 이벤트 리스너 해제:", payload);
            });
=======
            adminWebSocketManager.off(
                "USER_JOINED_ADMIN",
                (payload: UserJoinedAdminMessage) => {
                    console.log(
                        "USER_JOINED_ADMIN 이벤트 리스너 해제:",
                        payload
                    );
                }
            );
>>>>>>> a9028b3bb9235a1c8128430e4c999078d58131b4
        };
    }, []);

    const initGame = async () => {
        try {
            // 임시로 라운드 수 1로 고정
            adminWebSocketManager.sendSessionInit(requestId, 1);
            // 게임 중계 방으로 이동
            navigate(`/broadcast/${roomCode}`);
<<<<<<< HEAD

=======
>>>>>>> a9028b3bb9235a1c8128430e4c999078d58131b4
        } catch (error) {
            console.error("게임 시작 중 오류:", error);
        } finally {
            requestId = v7();
        }
    };

<<<<<<< HEAD
    

    return (
        <div>
            <h1>시작 대기중...</h1>
            {userNickname && <p>{userNickname}님이 입장하셨습니다!</p>}
            {userCount !== null && <p>현재 인원: {userCount}명</p>}

            <GenerateQrCode roomCode={roomCode} />
            <button
                onClick={initGame}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
                게임 시작
            </button>
=======
    return (
        <div className="game-container">
            <BackgroundAnimation />
            <DarkModeToggle />

            <GameCard>
                {/* <h1 className="game-title">게임명</h1> */}
                <div className="animate-pulse mb-6">
                    <h2 className="game-subtitle">유저 입장 대기중...</h2>
                </div>

                <RoomCode code={roomCode} />

                <div className="mb-6 flex items-center justify-center">
                    <GenerateQrCode roomCode={roomCode} />
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
                            <p className="font-medium">
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

                {userCount === 0 && (
                    <p className="text-sm text-warning mt-2">
                        게임을 시작하려면 최소한 한 명의 참여자가 있어야 합니다.
                    </p>
                )}
            </GameCard>
>>>>>>> a9028b3bb9235a1c8128430e4c999078d58131b4
        </div>
    );
}
