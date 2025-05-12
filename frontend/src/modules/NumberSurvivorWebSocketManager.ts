import { WebSocketManager } from './WebSocketManager';

interface NumberSurvivorMessage {
    type: string;
    [key: string]: any;
}

interface RoundStartMessage {
    type: "ROUND_START";
    round: number;
    timeLimit: number;
    maxNumber: number;
    resetEliminationStatus?: boolean;
    playerStatuses?: { [key: string]: boolean };
    allPlayersRevived?: boolean;
}

interface RoundResult {
    type: "ROUND_RESULT";
    round: number;
    numberSelections: { [key: number]: { userId: string; nickname: string }[] };
    survivors: { userId: string; nickname: string }[];
    eliminated: { userId: string; nickname: string }[];
}

interface GameOverMessage {
    type: "GAME_OVER";
    winners: any[];
    resetLocalStorage?: boolean;
    closeConnection?: boolean;
}

interface WaitingMessage {
    type: "WAITING";
    message: string;
    currentPlayers: number;
}

// 추가된 메시지 타입들
interface WaitingCountdownMessage {
    type: "WAITING_COUNTDOWN";
    message: string;
    timeLeft: number;
    currentPlayers: number;
}

interface PrepareStartMessage {
    type: "PREPARE_START";
    message: string;
    timeLeft: number;
    currentPlayers: number;
}

interface PrepareCountdownMessage {
    type: "PREPARE_COUNTDOWN";
    message: string;
    timeLeft: number;
    currentPlayers: number;
}

interface GamePreparingMessage {
    type: "GAME_PREPARING";
    message: string;
    currentPlayers: number;
}

interface GameInProgressMessage {
    type: "GAME_IN_PROGRESS";
    message: string;
}

type NumberSurvivorReceiveTypeMap = {
    ROUND_START: RoundStartMessage;
    ROUND_RESULT: RoundResult;
    GAME_OVER: GameOverMessage;
    WAITING: WaitingMessage;
    WAITING_COUNTDOWN: WaitingCountdownMessage;
    PREPARE_START: PrepareStartMessage;
    PREPARE_COUNTDOWN: PrepareCountdownMessage;
    GAME_PREPARING: GamePreparingMessage;
    GAME_IN_PROGRESS: GameInProgressMessage;
};

class NumberSurvivorWebSocketManager extends WebSocketManager<NumberSurvivorReceiveTypeMap> {
    constructor() {
        super();
        // this.setServerURL('ws://localhost/ws/number-survivor');
        this.setServerURL('ws://localhost:18087/ws/number-survivor');
    }

    connect(): void {
        if (this.isConnected()) {
            console.log('[NumberSurvivorWebSocketManager] Already connected, skipping connect()');
            return;
        }
        
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.log('[NumberSurvivorWebSocketManager] Already connecting, skipping connect()');
            return;
        }
        
        console.log('[NumberSurvivorWebSocketManager] Connecting to WebSocket...');
        super.connect();
        this.setUpOnMessage();
    }

    sendJoin(userId: string, roomId: string, nickname: string): void {
        this.send({
            type: 'NUMBER_SURVIVOR_JOIN',
            userId,
            roomId,
            nickname
        });
    }

    sendStartGame(userId: string, roomId: string): void {
        this.send({
            type: 'NUMBER_SURVIVOR_START',
            userId,
            roomId
        });
    }

    sendNumberSelection(userId: string, roomId: string, selectedNumber: number): void {
        this.send({
            type: 'NUMBER_SURVIVOR_SELECT',
            userId,
            roomId,
            selectedNumber
        });
    }

    private setUpOnMessage() {
        if (!this.ws) return;
        this.ws.onmessage = (event) => {
            let message: NumberSurvivorMessage;
            try {
                message = JSON.parse(event.data);
                console.log('[NumberSurvivorWebSocketManager] Received message:', message);
                
                if (message.type === 'GAME_OVER' && (message as GameOverMessage).closeConnection) {
                    console.log('[NumberSurvivorWebSocketManager] Closing connection due to game over');
                    this.emit<keyof NumberSurvivorReceiveTypeMap>(
                        message.type as keyof NumberSurvivorReceiveTypeMap,
                        message
                    );
                    
                    setTimeout(() => {
                        this.disconnect();
                    }, 500);
                    return;
                }
                
                this.emit<keyof NumberSurvivorReceiveTypeMap>(
                    message.type as keyof NumberSurvivorReceiveTypeMap,
                    message
                );
            } catch (e) {
                console.error(
                    "[NumberSurvivorWebSocketManager] Failed to parse message:",
                    event.data,
                    e
                );
                this.emit("raw_message", event.data);
            }
        };
    }
}

const numberSurvivorWebSocketManager = new NumberSurvivorWebSocketManager();
export default numberSurvivorWebSocketManager; 