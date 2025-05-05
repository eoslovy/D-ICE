import { WebSocketManager } from "./WebSocketManager";
import { v7 as uuidv7 } from "uuid";

class UserWebSocketManager extends WebSocketManager<UserReceiveTypeMap> {
    connect(): void {
        super.connect();
        this.setUpOnMessage();
    }

    sendUserJoin(requestId: string, nickname: string): void {
        // Use sendRequest
        this.sendRequest({ type: "USER_JOIN", nickname, requestId });
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
        const userId = localStorage.getItem("userId");
        if (!userId) {
            console.error(
                "[WebSocketManager] User ID not found in local storage."
            );
            return;
        }
        // Use sendRequest
        this.sendRequest({
            type: "SUBMIT",
            userId: userId,
            score: score,
            gameType: gameType,
            requestId,
        });
    }

    getUserNickname(): string {
        const nickname = localStorage.getItem("nickname");
        if (nickname) {
            return nickname;
        } else {
            const newNickname = `User_${uuidv7().substring(0, 8)}`;
            localStorage.setItem("nickname", newNickname);
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

