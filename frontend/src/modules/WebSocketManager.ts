import { EventEmitter } from "eventemitter3";

declare var WebSocket: {
    prototype: WebSocket;
    new (url: string | URL, protocols?: string | string[]): WebSocket;
    readonly CONNECTING: number;
    readonly OPEN: number;
    readonly CLOSING: number;
    readonly CLOSED: number;
};

type CustomManagingEvent =
    | "connect"
    | "disconnect"
    | "raw_message"
    | "unknown_requestId"
    | "error"
    | "reconnect_failed"
    | "already_connected";

abstract class WebSocketManager<
    M extends Record<string, any>
> extends EventEmitter<(keyof M & string) | CustomManagingEvent> {
    protected ws: WebSocket | null = null;
    private url: string = ""; // Initialize url
    private reconnectInterval: number = 5000; // Reconnect every 5 seconds
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectTimer: number | null = null; // Use number for browser setTimeout
    private pendingMessages: Map<keyof M, any[]> = new Map(); // 각 type별 메시지 큐

    setServerURL(url: string): void {
        if (
            this.isConnected() ||
            (this.ws && this.ws.readyState === WebSocket.CONNECTING)
        ) {
            console.warn(
                "[WebSocketManager] Cannot change URL while connected or connecting. Please disconnect first."
            );
            return;
        }
        this.url = url;
    }

    connect(): void {
        if (!this.url) {
            console.error(
                "[WebSocketManager] URL is not set. Call setServerURL first."
            );
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log("[WebSocketManager] Already connected.");
            this.emit("already_connected"); // Already connected event
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.log(
                "[WebSocketManager] Connection attempt already in progress."
            );
            return;
        }

        console.log(`[WebSocketManager] Connecting to ${this.url}...`);
        this.clearReconnectTimer(); // Clear any pending reconnect timers

        // Use the global WebSocket for browsers
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventListeners();
        } catch (error) {
            console.error(
                "[WebSocketManager] Failed to create WebSocket:",
                error
            );
            this.handleDisconnect(undefined); // Treat creation failure as a disconnect
        }
    }

    private setupEventListeners(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log("[WebSocketManager] Connected.");
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            this.clearReconnectTimer();
            this.emit("connect");
        };

        this.ws.onerror = (event) => {
            console.error("[WebSocketManager] Error:", event);
            this.emit("error", event);
        };

        this.ws.onclose = (event) => {
            console.log(
                `[WebSocketManager] Disconnected. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`
            );
            const wsInstance = this.ws; // Capture instance before clearing
            this.ws = null; // Clear the instance
            // Clear the pending requests map
            this.handleDisconnect(event);
            this.emit("disconnect", event); // Emit disconnect after handling
        };

        this.ws.onmessage = (event) => {
            let msg: ReceiveMessage;
            try {
                console.log(`[WebSocketManager] 수신된 메시지: ${event.data}`);
                msg = JSON.parse(event.data);
                this.queueOrEmit(msg);
            } catch (e) {
                console.error(
                    "[WebSocketManager] 메시지 파싱 실패:",
                    event.data,
                    e
                );
                this.emit("raw_message", event.data);
            }
        };
    }

    private queueOrEmit(msg: ReceiveMessage) {
        const type = msg.type as
            | CustomManagingEvent
            | EventEmitter.EventNames<keyof M & string>;
        if (this.listenerCount(type) === 0) {
            const queue = this.pendingMessages.get(type as string) ?? [];
            queue.push(msg);
            this.pendingMessages.set(type as string, queue);
        } else {
            this.emit(type, msg);
        }
    }

    override on<
        K extends
            | CustomManagingEvent
            | EventEmitter.EventNames<keyof M & string>
    >(event: K, listener: (payload: M[K]) => void): this {
        super.on(event, listener);

        const queued = this.pendingMessages.get(event);
        if (queued) {
            queued.forEach((msg) => {
                try {
                    listener(msg);
                } catch (e) {
                    console.error(
                        `[WebSocketManager] 큐 처리 중 에러 (${event}):`,
                        e
                    );
                }
            });
            this.pendingMessages.delete(event);
        }

        return this;
    }

    private handleDisconnect(event?: CloseEvent): void {
        // Optional: Implement automatic reconnection logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
                `[WebSocketManager] Attempting reconnect (${
                    this.reconnectAttempts
                }/${this.maxReconnectAttempts}) in ${
                    this.reconnectInterval / 1000
                }s...`
            );
            this.clearReconnectTimer(); // Ensure no duplicate timers
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, this.reconnectInterval);
        } else {
            console.log("[WebSocketManager] Max reconnect attempts reached.");
            this.emit("reconnect_failed");
        }
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // Just for normal send
    send(data: { type: string; [key: string]: any }): boolean {
        if (!this.isConnected()) {
            console.warn(
                "[WebSocketManager] Cannot send message, WebSocket is not open."
            );
            return false;
        }
        try {
            this.ws?.send(JSON.stringify(data));
            // console.debug('[WebSocketManager] Message sent:', data);
            return true;
        } catch (error) {
            console.error(
                "[WebSocketManager] Failed to send message:",
                error,
                data
            );
            return false;
        }
    }

    // --- Dedicated method for sending requests with tracked requestId ---
    protected sendRequest<T extends SendMessage>(message: T): boolean {
        if (!this.isConnected()) {
            console.warn(
                "[WebSocketManager] Cannot send request, WebSocket is not open."
            );
            return false;
        }
        try {
            this.ws?.send(JSON.stringify(message));
            // console.debug('[WebSocketManager] Request sent:', messageToSend);

            return true;
        } catch (error) {
            console.error(
                "[WebSocketManager] Failed to send request:",
                error,
                message
            );
            // Consider removing requestId from pending set on send failure if possible/needed
            return false;
        }
    }

    disconnect(): void {
        this.clearReconnectTimer(); // Stop any reconnection attempts
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect after manual disconnect
        if (this.ws) {
            console.log("[WebSocketManager] Disconnecting...");
            this.ws.onclose = null; // Prevent handleDisconnect during manual close
            this.ws.close();
            this.ws = null;
            this.emit("disconnect", {
                code: 1000,
                reason: "Manual disconnect",
                wasClean: true,
            });
        } else {
            console.log("[WebSocketManager] Already disconnected.");
        }
    }

    isConnected(): boolean {
        return !!this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    getReadyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED; // Return CLOSED if ws is null
    }

    // --- Update all send methods to use sendRequest ---

    protected isReceiveMessageWithRequestId(
        msg: ReceiveMessage
    ): msg is Extract<ReceiveMessage, { requestId: string }> & {
        requestId: string;
    } {
        return "requestId" in msg && typeof msg.requestId === "string";
    }

    protected hasRequestId(
        msg: SendMessage
    ): msg is SendMessage & { requestId: string } {
        return "requestId" in msg && typeof msg.requestId === "string";
    }
}

// Export a single instance (Singleton pattern)
// const webSocketManager = new WebSocketManager();
// export default webSocketManager;

// Or export the class if you need multiple instances
export { WebSocketManager };











