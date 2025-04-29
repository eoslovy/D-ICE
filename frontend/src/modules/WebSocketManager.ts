import { EventEmitter } from 'eventemitter3';

declare var WebSocket: {
    prototype: WebSocket;
    new(url: string | URL, protocols?: string | string[]): WebSocket;
    readonly CONNECTING: number;
    readonly OPEN: number;
    readonly CLOSING: number;
    readonly CLOSED: number;
};

const DEFAULT_SERVER_URL = 'ws://localhost:8080/ws/game/user';

class WebSocketManager extends EventEmitter {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectInterval: number = 5000; // Reconnect every 5 seconds
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectTimer: number | null = null; // Use number for browser setTimeout

    constructor(url: string = DEFAULT_SERVER_URL) {
        super();
        this.url = url;
    }

    connect(): void {
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
            try {
                const message = JSON.parse(event.data);
                // console.debug('[WebSocketManager] Message received:', message);
                // Emit specific events based on message type, or a generic one
                if (message.type) {
                    this.emit(message.type, message);
                }
                this.emit('message', message); // Emit generic message event
            } catch (e) {
                console.error('[WebSocketManager] Failed to parse message:', event.data, e);
                this.emit('raw_message', event.data); // Emit raw data if parsing fails
            }
        };

        this.ws.onerror = (event) => {
            // The 'error' event is usually followed by 'close'.
            // Specific error details might be limited in the browser 'error' event.
            console.error('[WebSocketManager] Error:', event);
            this.emit('error', event);
            // No automatic reconnect here, wait for the 'close' event.
        };

        this.ws.onclose = (event) => {
            console.log(`[WebSocketManager] Disconnected. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`);
            const wsInstance = this.ws; // Capture instance before clearing
            this.ws = null; // Clear the instance
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

    send(data: object): boolean {
        if (this.isConnected()) {
            try {
                this.ws?.send(JSON.stringify(data));
                // console.debug('[WebSocketManager] Message sent:', data);
                return true;
            } catch (error) {
                console.error('[WebSocketManager] Failed to send message:', error);
                return false;
            }
        } else {
            console.warn('[WebSocketManager] Cannot send message, WebSocket is not open.');
            // Optional: Queue message to send upon reconnection
            return false;
        }
    }

    disconnect(): void {
        this.clearReconnectTimer(); // Stop any reconnection attempts
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect after manual disconnect
        if (this.ws) {
            console.log('[WebSocketManager] Disconnecting...');
            this.ws.close();
            // The onclose handler will set this.ws to null
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
}

// Export a single instance (Singleton pattern)
const webSocketManager = new WebSocketManager();
export default webSocketManager;

// Or export the class if you need multiple instances
// export { WebSocketManager };