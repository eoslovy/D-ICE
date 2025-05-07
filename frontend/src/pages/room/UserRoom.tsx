import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GenerateQrCode from "../../components/QRcode";
import userWebSocketManager from "../../modules/UserWebSocketManager";
import BackgroundAnimation from "../../components/BackgroundAnimation";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
import { Clock } from "lucide-react";

interface UserJoinedMessage {
    roomId: string;
    userId: string;
}

export default function UserRoom() {
    const navigate = useNavigate();

    const roomCode = localStorage.getItem("roomCode") || "000000";
    const nickname = localStorage.getItem("nickname") || null;

    useEffect(() => {
        console.log("ENTER_GAME 이벤트 리스너 등록");
        userWebSocketManager.on("ENTER_GAME", (payload: UserJoinedMessage) => {
            console.log("게임 세션 입장:", payload);
            navigate(`/game`);
        });
        return () => {
            userWebSocketManager.off(
                "ENTER_GAME",
                (payload: UserJoinedMessage) => {
                    console.log("ENTER_GAME 이벤트 리스너 해제:", payload);
                }
            );
        };
    }, []);

    return (
        <div className="game-container">
            <BackgroundAnimation />

            <GameCard>
                {/* <h1 className="game-title">입장 성공!</h1> */}

                <div className="animate-pulse mb-6">
                    <div className="flex items-center justify-center">
                        <Clock className="mr-2" size={24} />
                        <span className="text-xl">
                            시작 대기중
                        </span>
                    </div>
                </div>

                <RoomCode code={roomCode} />

                {nickname && (
                    <div className="mb-6 text-center">
                        <div className="text-sm font-medium mb-1">
                            당신의 닉네임
                        </div>
                        <div className="user-badge text-base px-4 py-2">
                            {nickname}
                        </div>
                    </div>
                )}

                <div className="mb-6 flex flex-col items-center justify-center">
                    <GenerateQrCode roomCode={roomCode} />
                </div>
                <p className="text-sm mt-2 text-center">주변의 미참여자에게 코드를 공유해주세요!</p>
            </GameCard>
        </div>
    );
}
