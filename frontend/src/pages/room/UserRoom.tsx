import { useNavigate } from "react-router-dom";
import GenerateQrCode from "../../components/QRcode";
import userWebSocketManager from "../../modules/UserWebSocketManager";

export default function UserRoom() {
    const navigate = useNavigate();
    
    const roomCode = localStorage.getItem("roomCode") || "000000";
    const nickname = localStorage.getItem("nickname") || null;

    userWebSocketManager.on(
        "ENTER_GAME",
        (payload: UserJoinedMessage) => {
            console.log("게임 세션 입장:", payload);
            navigate(`/game`);
        }
    );

    return (
        <div>
            <h1>시작 대기중...</h1>
            {nickname && <p>{nickname}님이 입장하셨습니다!</p>}

            <GenerateQrCode roomCode={roomCode} />
        </div>
    );
}
