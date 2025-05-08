import { WebSocketManager } from "./WebSocketManager";
import { adminStore } from "../stores/adminStore";

class AdminWebSocketManager extends WebSocketManager<AdminReceiveTypeMap> {


    connect(): void {
        super.connect();
        this.setUpOnMessage();
    }

    sendAdminJoin(requestId: string): void {
        const administratorId = adminStore.getState().administratorId;
        if (!administratorId) {
            console.error(
                "[WebSocketManager] Administrator ID not found in local storage."
            );
            return;
        }
        // Use sendRequest which handles requestId and pending set
        this.sendRequest({
            type: "ADMIN_JOIN",
            administratorId: administratorId,
            requestId,
        });
    }

    sendSessionInit(requestId: string, totalRound: number | null): void {
        const administratorId = adminStore.getState().administratorId;
        if (!administratorId) {
            console.error(
                "[WebSocketManager] Administrator ID not found in local storage."
            );
            return;
        }
        // Use sendRequest
        this.sendRequest({
            type: "INIT",
            administratorId,
            totalRound,
            requestId,
        });
    }

    sendStartGame(requestId: string): void {
        const administratorId = adminStore.getState().administratorId;
        if (!administratorId) {
            console.error(
                "[WebSocketManager] Administrator ID not found in local storage."
            );
            return;
        }
        // Use sendRequest
        this.sendRequest({
            type: "START_GAME",
            administratorId,
            requestId,
        });
    }

    private setUpOnMessage() {
        if (!this.ws) return;
        this.ws.onmessage = (event) => {
            let message: ReceiveMessage;
            try {
                message = JSON.parse(event.data);
                // console.debug('[WebSocketManager] Message received:', message);

                // 유저 입장 같은 메세지는 requestId를 체크할 수가 없음
                // --- Handle Response Validation ---
                // if (this.isReceiveMessageWithRequestId(message)) {
                //     if (this.pendingRequests.has(message.requestId)) {
                //         const timeoutId = this.pendingRequests.get(
                //             message.requestId
                //         );
                //         clearTimeout(timeoutId); // Clear the timeout for this request
                //         this.pendingRequests.delete(message.requestId); // Remove from pending requests
                //     } else {
                //         console.warn(
                //             `[WebSocketManager] Received response for unknown requestId: ${message.requestId}`
                //         );
                //         this.emit(
                //             "unknown_requestId",
                //             message.requestId,
                //             message
                //         );
                //         return; // Ignore unknown requestId
                //     }
                // }
                // --- End Response Validation ---

                this.emit<keyof AdminReceiveTypeMap>(
                    message.type as keyof AdminReceiveTypeMap,
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

const adminWebSocketManager = new AdminWebSocketManager();

export default adminWebSocketManager;

