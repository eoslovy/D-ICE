import { WebSocketManager } from "./WebSocketManager";
import { v7 as uuidv7 } from "uuid";
import { userStore } from "../stores/userStore";

class UserWebSocketManager extends WebSocketManager<UserReceiveTypeMap> {
    connect(): void {
        super.connect();
    }

    disconnect(): void {
        super.disconnect();
    }

    sendCheckEnded({
        requestId,
        userId,
    }: {
        requestId: string;
        userId: string;
    }): void {
        const checkEenedMessage: CheckEenedMessage = {
            type: "CHECK_ENDED",
            userId: userId,
            requestId: requestId,
        };
        this.sendRequest(checkEenedMessage);
    }

    sendUserReconnect(requestId: string, userId: string): void {
        const userReconnectMessage: UserReconnectMessage = {
            type: "USER_RECONNECT",
            userId: userId,
            requestId: requestId,
        };
        this.sendRequest(userReconnectMessage);
    }

    sendUserJoin(requestId: string, nickname: string): void {
        const userJoinMessage: UserJoinMessage = {
            type: "USER_JOIN",
            nickname: nickname,
            requestId: requestId,
        };
        this.sendRequest(userJoinMessage);
    }

    sendSubmit({
        score,
        gameType,
        requestId,
    }: {
        score: number;
        gameType: string;
        requestId: string;
    }): void {
        const userId = userStore.getState().userId;
        if (!userId) {
            console.error(
                "[WebSocketManager] User ID not found in local storage."
            );
            return;
        }

        const submitMessage: SubmitMessage = {
            type: "SUBMIT",
            userId: userId,
            score: score,
            gameType: gameType,
            requestId: requestId,
        };
        this.sendRequest(submitMessage);
    }

    sendBroadcast({
        requestId,
        payload,
    }: {
        requestId: string;
        payload: string;
    }): void {
        const userId = userStore.getState().userId;

        const broadcastRequestMessage: BroadcastRequestMessage = {
            type: "BROADCAST_REQUEST",
            userId,
            requestId,
            payload,
        };
        this.sendRequest(broadcastRequestMessage);
    }

    getUserNickname(): string {
        const nickname = userStore.getState().nickname;
        if (nickname) {
            return nickname;
        } else {
            const newNickname = `User_${uuidv7().substring(0, 8)}`;
            userStore.getState().setNickname(newNickname);
            return newNickname;
        }
    }
}

const userWebSocketManager = new UserWebSocketManager();

export default userWebSocketManager;
