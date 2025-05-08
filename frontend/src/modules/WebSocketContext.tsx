import React, { createContext, useContext, useEffect, useState } from "react";
import userWebSocketManager from "./UserWebSocketManager";
import adminWebSocketManager from "./AdminWebSocketManager";

type WebSocketType = "user" | "admin" | null;

interface WebSocketContextType {
  connectWebSocket: (type: WebSocketType, url: string) => void;
  disconnectWebSocket: () => void;
  currentWebSocket: WebSocketType;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentWebSocket, setCurrentWebSocket] = useState<WebSocketType>(null);

  const connectWebSocket = (type: WebSocketType, url: string) => {
    if (type === "user") {
      userWebSocketManager.setServerURL(url);
      userWebSocketManager.connect();
      setCurrentWebSocket("user");
    } else if (type === "admin") {
      adminWebSocketManager.setServerURL(url);
      adminWebSocketManager.connect();
      setCurrentWebSocket("admin");
    }
  };

  const disconnectWebSocket = () => {
    if (currentWebSocket === "user") {
      userWebSocketManager.disconnect();
    } else if (currentWebSocket === "admin") {
      adminWebSocketManager.disconnect();
    }
    setCurrentWebSocket(null);
  };

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 연결 해제
      disconnectWebSocket();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        connectWebSocket,
        disconnectWebSocket,
        currentWebSocket,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};