import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GenerateQrCode from "../../components/QRcode";
import userWebSocketManager from "../../modules/UserWebSocketManager";
import { userStore } from "../../stores/userStore";

export default function UserRoom() {
    const navigate = useNavigate();
    
    const roomCode = userStore.getState().roomCode;
    const nickname = userStore.getState().nickname;

    useEffect(() =>{
        console.log("ENTER_GAME 이벤트 리스너 등록");
        userWebSocketManager.on(
            "ENTER_GAME",
            (payload: UserJoinedMessage) => {
                console.log("게임 세션 입장:", payload);
                navigate(`/game`);
            }
        );
        return () => {
            userWebSocketManager.off("ENTER_GAME", (payload: UserJoinedMessage) => {
                console.log("ENTER_GAME 이벤트 리스너 해제:", payload);
            });
        }
    }, []);

    return (
        <div>
            <h1>시작 대기중...</h1>
            {nickname && <p>{nickname}님이 입장하셨습니다!</p>}

            <GenerateQrCode roomCode={roomCode} />
        </div>
    );
}
