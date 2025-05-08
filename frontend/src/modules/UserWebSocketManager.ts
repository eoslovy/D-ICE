import { WebSocketManager } from "./WebSocketManager";
import { v7 as uuidv7 } from "uuid";
import { userStore } from "../stores/userStore";

class UserWebSocketManager extends WebSocketManager<UserReceiveTypeMap> {
    connect(): void {
        super.connect();
        this.setUpOnMessage();
    }

    sendUserReconnect(requestId: string, userId: string): void {
        const userReconnectMessage: UserReconnectMessage = {
            type: "USER_RECONNECT",
            userId: userId,
            requestId: requestId,
        }
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

    private setUpOnMessage() {
        if (!this.ws) return;
        this.ws.onmessage = (event) => {
            let message: ReceiveMessage;
            try {
                message = JSON.parse(event.data);
                // console.debug('[WebSocketManager] Message received:', message);

                // --- Handle Response Validation ---
                if (this.isReceiveMessageWithRequestId(message)) {
                    if (this.pendingRequests.has(message.requestId)) {
                        const timeoutId = this.pendingRequests.get(
                            message.requestId
                        );
                        clearTimeout(timeoutId); // Clear the timeout for this request
                        this.pendingRequests.delete(message.requestId); // Remove from pending requests
                    } else {
                        console.warn(
                            `[WebSocketManager] Received response for unknown requestId: ${message.requestId}`
                        );
                        this.emit(
                            "unknown_requestId",
                            message.requestId,
                            message
                        );
                        return; // Ignore unknown requestId
                    }
                }
                // --- End Response Validation ---

                this.emit<keyof UserReceiveTypeMap>(
                    message.type as keyof UserReceiveTypeMap,
                    message
                );
            } catch (e) {
                console.error(
                    "[WebSocketManager] Failed to parse message:",
                    event.data,
                    e
                );
                this.emit("raw_message", event.data);
            }
        };
    }
}

const userWebSocketManager = new UserWebSocketManager();

export default userWebSocketManager;

