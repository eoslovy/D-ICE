import { WebSocketManager } from "./WebSocketManager";
import { adminStore } from "../stores/adminStore";

class AdminWebSocketManager extends WebSocketManager<AdminReceiveTypeMap> {
    connect(): void {
        super.connect();
    }

    sendAdminReconnect(requestId: string, administratorId: string): void {
        const adminReconnectMessage: AdminReconnectMessage = {
            type: "ADMIN_RECONNECT",
            administratorId: administratorId,
            requestId: requestId,
        };
        this.sendRequest(adminReconnectMessage);
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
}

const adminWebSocketManager = new AdminWebSocketManager();

export default adminWebSocketManager;



