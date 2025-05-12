import { WebSocketManager } from "./WebSocketManager";
import { adminStore } from "../stores/adminStore";

class AdminWebSocketManager extends WebSocketManager<AdminReceiveTypeMap> {
    connect(): void {
        super.connect();
    }

    getAdministratorId(): string | null {
        const administratorId = adminStore.getState().administratorId;
        if (!administratorId) {
            console.error(
                "[WebSocketManager] Administrator ID not found in local storage."
            );
            return null;
        }
        return administratorId;
    }
    sendAdminReconnect(requestId: string): boolean {
        const administratorId = this.getAdministratorId();
        if (!administratorId) return false;
        const adminReconnectMessage: AdminReconnectMessage = {
            type: "ADMIN_RECONNECT",
            administratorId: administratorId,
            requestId: requestId,
        };
        return this.sendRequest(adminReconnectMessage);
    }

    sendAdminJoin(requestId: string): boolean {
        const administratorId = this.getAdministratorId();
        if (!administratorId) return false;
        const adminJoinMessage: AdminJoinMessage = {
            type: "ADMIN_JOIN",
            administratorId: administratorId,
            requestId,
        };
        return this.sendRequest(adminJoinMessage);
    }

    sendSessionInit(requestId: string, totalRound: number): boolean {
        const administratorId = this.getAdministratorId();
        if (!administratorId) return false;
        const initMessage: InitMessage = {
            type: "INIT",
            administratorId,
            totalRound,
            requestId,
        };
        return this.sendRequest(initMessage);
    }

    sendStartGame(requestId: string): boolean {
        const administratorId = this.getAdministratorId();
        if (!administratorId) return false;
        const startGameMessage: StartGameMessage = {
            type: "START_GAME",
            administratorId,
            requestId,
        };
        return this.sendRequest(startGameMessage);
    }

    sendNextGameAck(currentRound: number) : boolean {
        const administratorId = this.getAdministratorId();
        if (!administratorId) return false;
        const nextGameAckMessage: NextGameAckMessage = {
            type: "NEXT_GAME_ACK",
            currentRound: currentRound,
            administratorId,
        }
        return this.sendRequest(nextGameAckMessage);
    }
}

const adminWebSocketManager = new AdminWebSocketManager();

export default adminWebSocketManager;



