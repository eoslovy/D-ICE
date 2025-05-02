import { EventEmitter } from 'eventemitter3';
import { v7 as uuidv7 } from "uuid";

declare var WebSocket: {
    prototype: WebSocket;
    new(url: string | URL, protocols?: string | string[]): WebSocket;
    readonly CONNECTING: number;
    readonly OPEN: number;
    readonly CLOSING: number;
    readonly CLOSED: number;
};

class WebSocketManager extends EventEmitter {
    private ws: WebSocket | null = null;
    private url: string = ''; // Initialize url
    private reconnectInterval: number = 5000; // Reconnect every 5 seconds
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectTimer: number | null = null; // Use number for browser setTimeout
    private pendingRequests: Map<string, any> = new Map(); // Store pending requests timeout

    setServerURL(url: string): void {
        if (this.isConnected() || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
            console.warn('[WebSocketManager] Cannot change URL while connected or connecting. Please disconnect first.');
            return;
        }
        this.url = url;
    }

    connect(): void {
        if (!this.url) {
            console.error('[WebSocketManager] URL is not set. Call setServerURL first.');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[WebSocketManager] Already connected.');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.log('[WebSocketManager] Connection attempt already in progress.');
            return;
        }

        console.log(`[WebSocketManager] Connecting to ${this.url}...`);
        this.clearReconnectTimer(); // Clear any pending reconnect timers

        // Use the global WebSocket for browsers
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventListeners();
        } catch (error) {
            console.error('[WebSocketManager] Failed to create WebSocket:', error);
            this.handleDisconnect(undefined); // Treat creation failure as a disconnect
        }
    }

    private setupEventListeners(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('[WebSocketManager] Connected.');
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            this.clearReconnectTimer();
            this.emit('connect');
        };

        this.ws.onmessage = (event) => {
            let message: any;
            try {
                message = JSON.parse(event.data);
                // console.debug('[WebSocketManager] Message received:', message);

                // --- Handle Response Validation ---
                // if (message.requestId) {
                //     if (this.pendingRequests.has(message.requestId)) {
                //         const timeoutId = this.pendingRequests.get(message.requestId);
                //         clearTimeout(timeoutId); // Clear the timeout for this request
                //         this.pendingRequests.delete(message.requestId); // Remove from pending requests
                //     }
                //     else {
                //         console.warn(`[WebSocketManager] Received response for unknown requestId: ${message.requestId}`);
                //         this.emit('unknown_requestId', message.requestId, message);
                //         return; // Ignore unknown requestId
                //     }
                // }
                // --- End Response Validation ---

                // Emit specific events based on message type
                if (message.type && typeof message.type === 'string') {
                    if (message.type === 'CLIENT_JOINED' || message.type === 'USER_JOINED') {
                        if (message.userId) localStorage.setItem('userId', message.userId);
                        if (message.roomId) localStorage.setItem('roomId', message.roomId);
                    }
                    this.emit(message.type, message);
                }

                // Always emit the generic message event
                this.emit('message', message);

            } catch (e) {
                console.error('[WebSocketManager] Failed to parse message:', event.data, e);
                this.emit('raw_message', event.data);
            }
        };

        this.ws.onerror = (event) => {
            console.error('[WebSocketManager] Error:', event);
            this.emit('error', event);
        };

        this.ws.onclose = (event) => {
            console.log(`[WebSocketManager] Disconnected. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
            const wsInstance = this.ws; // Capture instance before clearing
            this.ws = null; // Clear the instance
            // Consider clearing pending requests or using timeouts
            this.pendingRequests.forEach((timeoutId) => {
                clearTimeout(timeoutId); // Clear all pending timeouts
            });
            this.pendingRequests.clear(); // Clear the pending requests map
            this.handleDisconnect(event);
            this.emit('disconnect', event); // Emit disconnect after handling
        };
    }

    private handleDisconnect(event?: CloseEvent): void {
        // Optional: Implement automatic reconnection logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocketManager] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval / 1000}s...`);
            this.clearReconnectTimer(); // Ensure no duplicate timers
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        } else {
            console.log('[WebSocketManager] Max reconnect attempts reached.');
            this.emit('reconnect_failed');
        }
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    
    // Just for normal send
    send(data: { type: string, [key: string]: any }): boolean {
        if (!this.isConnected()) {
            console.warn('[WebSocketManager] Cannot send message, WebSocket is not open.');
            return false;
        }
        try {
            this.ws?.send(JSON.stringify(data));
            // console.debug('[WebSocketManager] Message sent:', data);
            return true;
        } catch (error) {
            console.error('[WebSocketManager] Failed to send message:', error, data);
            return false;
        }
    }

    // --- Dedicated method for sending requests with tracked requestId ---
    private sendRequest(data: { type: string, [key: string]: any }): boolean {
        if (!this.isConnected()) {
            console.warn('[WebSocketManager] Cannot send request, WebSocket is not open.');
            return false;
        }
        try {
            // Generate and track requestId
            const requestId = uuidv7();
            const messageToSend = { ...data, requestId };
            this.ws?.send(JSON.stringify(messageToSend));
            // console.debug('[WebSocketManager] Request sent:', messageToSend);

            // Optional: Implement request timeout logic here
            this.pendingRequests.set(requestId, setTimeout(() => {
                console.warn(`[WebSocketManager] Request ${requestId} timed out.`);
                this.pendingRequests.delete(requestId); // Clean up pending request
            }, 5000)); // Example timeout of 5 seconds

            return true;
        } catch (error) {
            console.error('[WebSocketManager] Failed to send request:', error, data);
            // Consider removing requestId from pending set on send failure if possible/needed
            return false;
        }
    }

    disconnect(): void {
        this.clearReconnectTimer(); // Stop any reconnection attempts
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect after manual disconnect
        if (this.ws) {
            console.log('[WebSocketManager] Disconnecting...');
            this.ws.onclose = null; // Prevent handleDisconnect during manual close
            this.ws.close();
            this.ws = null;
            this.emit('disconnect', { code: 1000, reason: 'Manual disconnect', wasClean: true });
        } else {
            console.log('[WebSocketManager] Already disconnected.');
        }
    }

    isConnected(): boolean {
        return !!this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getReadyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED; // Return CLOSED if ws is null
    }

    getUserNickname(): string {
        const nickname = localStorage.getItem('nickname');
        if (nickname) {
            return nickname;
        } else {
            const newNickname = `User_${uuidv7().substring(0, 8)}`;
            localStorage.setItem('nickname', newNickname);
            return newNickname;
        }
    }

    // --- Update all send methods to use sendRequest ---
    sendAdminJoin(): void {
        const administratorId = localStorage.getItem('administratorId');
        if (!administratorId) {
            console.error('[WebSocketManager] Administrator ID not found in local storage.');
            return;
        }
        // Use sendRequest which handles requestId and pending set
        this.sendRequest({ type: 'ADMIN_JOIN', administratorId: administratorId });
    }

    sendSessionInit(totalRound: number): void {
        const administratorId = localStorage.getItem('administratorId');
        if (!administratorId) {
            console.error('[WebSocketManager] Administrator ID not found in local storage.');
            return;
        }
        // Use sendRequest
        this.sendRequest({ type: 'INIT', administratorId: administratorId, totalRound: totalRound });
    }

    sendStartGame(): void {
        const administratorId = localStorage.getItem('administratorId');
        if (!administratorId) {
            console.error('[WebSocketManager] Administrator ID not found in local storage.');
            return;
        }
        // Use sendRequest
        this.sendRequest({ type: 'START_GAME', administratorId: administratorId });
    }

    sendUserJoin(): void {
        const nickname = this.getUserNickname();
        // Use sendRequest
        this.sendRequest({ type: 'JOIN', nickname: nickname });
    }

    sendSubmit(score: number, gameType: string): void {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            console.error('[WebSocketManager] User ID not found in local storage.');
            return;
        }
        // Use sendRequest
        this.sendRequest({ type: 'SUBMIT', userId: userId, score: score, gameType: gameType });
    }
}

// Export a single instance (Singleton pattern)
const webSocketManager = new WebSocketManager();
export default webSocketManager;

// Or export the class if you need multiple instances
// export { WebSocketManager };