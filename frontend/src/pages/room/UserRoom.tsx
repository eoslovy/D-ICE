import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GenerateQrCode from "../../components/QRcode";
import userWebSocketManager from "../../modules/UserWebSocketManager";
import GameCard from "../../components/GameCard";
import RoomCode from "../../components/RoomCode";
import { Clock } from "lucide-react";
import { userStore } from "../../stores/userStore";

export default function UserRoom() {
    const navigate = useNavigate();

    const roomCode = userStore.getState().roomCode;
    const nickname = userStore.getState().nickname;

    useEffect(() => {
        console.log("ENTER_GAME 이벤트 리스너 등록");
        userWebSocketManager.on("ENTER_GAME", (payload: EnterGameMessage) => {
            console.log("게임 세션 입장:", payload);
            userStore.getState().setStatus("INGAME");
            navigate(`/game`);
        });
        return () => {
            userWebSocketManager.off("ENTER_GAME");
            console.log("UserRoom 이벤트 리스너 해제");
        };
    }, []);

    return (
        <div className="game-container">
            <GameCard>
                <div className="animate-pulse mb-6">
                    <div className="flex items-center justify-center">
                        <Clock className="mr-2" size={24} />
                        <span className="text-xl">
                            시작 대기중
                        </span>
                    </div>
                </div>

                <RoomCode code={String(roomCode)} />

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
                    <GenerateQrCode roomCode={String(roomCode)} />
                </div>
                <p className="text-sm mt-2 text-center">주변의 미참여자에게 코드를 공유해주세요!</p>
            </GameCard>
        </div>
    );
}
