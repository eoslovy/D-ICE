import React, { useState, useEffect } from 'react';
import webSocketManager from "./WebSocketManager";
import {v7 as uuid} from "uuid";

// Default Base URL (can be overridden by input)
const DEFAULT_BASE_URL = "localhost:8080";

interface TestModulesProps {
  onTriggerParticleEffect: () => void;
  onTriggerSpriteShowcase: (spriteKey?: string) => void;
  onTriggerMessage: (text: string, size?: number, duration?: number, float?: boolean) => void;
}

export default function TestModules(props: TestModulesProps) {
  const [roomId, setRoomId] = useState<string>("wasted");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [isConsoleVisible, setIsConsoleVisible] = useState<boolean>(false);
  const [wsMessage, setWsMessage] = useState<string>("");

  // --- State for Base URL input ---
  const [baseUrlInput, setBaseUrlInput] = useState<string>(DEFAULT_BASE_URL);

  // --- Construct URLs dynamically ---
  const getWsUrl = () => `ws://${baseUrlInput}/ws/game/user`;
  const getHttpUrl = () => `http://${baseUrlInput}`;

  const handleConnect = () => {
    const id = uuid();
    // Use the dynamic URL getter
    const url = `${getWsUrl()}/${roomId}`;
    webSocketManager.setServerURL(url);
    webSocketManager.connect();
  };

  const handleDisconnect = () => {
    webSocketManager.disconnect();
  };

  const handleSendMessage = () => {
    if (!wsMessage.trim()) return;
    // user wsMessage as JSON if it is a valid JSON string else send it as a string
    let message;
    try {
      message = JSON.parse(wsMessage);
    } catch (e) {
      message = { type: "echo", message: wsMessage };
    }
 
    webSocketManager.send(message);
  };

  const sendhttpRequest = () => {
    // Use the dynamic URL getter
    const url = `${getHttpUrl()}/rooms`;
    setIsLoading(true);
    setHttpError(null);

    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) return response.json();
        throw new Error("Received non-JSON response from /rooms endpoint");
      })
      .then(data => {
        console.log("HTTP Response:", data);
        if (data && typeof data.roomCode === 'string') {
          setRoomId(data.roomCode);
        } else {
          setHttpError("Response did not contain a valid 'roomCode'.");
        }
      })
      .catch(error => {
        console.error("HTTP Request failed:", error);
        setHttpError(error.message || "An unknown error occurred.");
      })
      .finally(() => setIsLoading(false));
  };

  // --- Call functions from props ---
  const handleTriggerEffect = () => { props.onTriggerParticleEffect(); };
  const handleTriggerSpriteShowcase = () => { props.onTriggerSpriteShowcase(); };
  const handleTriggerMessage = () => { props.onTriggerMessage("Test Message!", 32, 3000, true); };

  const toggleConsole = () => { setIsConsoleVisible(prev => !prev); };

  // --- Styles ---
  const consoleStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50px',
    right: '10px',
    width: '450px',
    maxHeight: 'calc(100vh - 70px)',
    overflowY: 'auto',
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    color: '#e0e0e0',
    padding: '15px',
    fontFamily: 'monospace',
    border: '1px solid #555',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    fontSize: '12px',
  };

  const toggleButtonStyle: React.CSSProperties = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 1001,
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
  };

  const inputStyle: React.CSSProperties = {
    marginRight: '10px',
    padding: '5px',
    border: '1px solid #ccc',
    borderRadius: '3px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '5px 10px',
    border: '1px solid #007bff',
    borderRadius: '3px',
    marginLeft: '5px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
  };

  const disabledButtonStyle: React.CSSProperties = {
    padding: '5px 10px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    marginLeft: '5px',
    backgroundColor: '#ccc',
    color: '#666',
    cursor: 'not-allowed',
  };

  return (
    <>
      <button onClick={toggleConsole} style={toggleButtonStyle}>
        {isConsoleVisible ? 'Hide Console' : 'Show Console'}
      </button>

      {isConsoleVisible && (
        <div style={consoleStyle}>
          <h1 style={{ fontSize: '16px', marginTop: '0', borderBottom: '1px solid #666', paddingBottom: '5px' }}>Test Console</h1>

          {/* --- Base URL Section --- */}
          <div style={{ marginBottom: '10px', padding: '8px', border: '1px solid #585', borderRadius: '4px', backgroundColor: 'rgba(0, 30, 0, 0.2)' }}>
            <label htmlFor="baseUrlInput" style={{ fontWeight: 'bold', marginRight: '10px', display: 'inline-block', minWidth: '70px' }}>Base URL:</label>
            <input
              id="baseUrlInput"
              type="text"
              value={baseUrlInput}
              onChange={(e) => setBaseUrlInput(e.target.value)}
              style={{ ...inputStyle, width: 'calc(100% - 90px)' }} // Adjust width
            />
          </div>
          {/* --- End Base URL Section --- */}

          {/* Room ID Section */}
          <div style={{ marginBottom: '10px', padding: '8px', border: '1px solid #558', borderRadius: '4px', backgroundColor: 'rgba(0, 0, 30, 0.2)' }}>
            <label htmlFor="roomIdInput" style={{ fontWeight: 'bold', marginRight: '10px', display: 'inline-block', minWidth: '70px' }}>Room ID:</label>
            <input id="roomIdInput" type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={inputStyle} />
            <button onClick={handleConnect} style={!roomId ? disabledButtonStyle : buttonStyle} disabled={!roomId}>Connect</button>
            <button onClick={handleDisconnect} style={buttonStyle}>Disconnect</button>
          </div>

          {/* Action Buttons Section */}
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Enter WS message"
              value={wsMessage}
              onChange={(e) => setWsMessage(e.target.value)}
              style={{ ...inputStyle, width: 'calc(100% - 210px)' }} // Adjust width based on buttons
            />
            <button onClick={handleSendMessage} style={buttonStyle} disabled={!wsMessage.trim()}>Send WS Msg</button>
            <button onClick={sendhttpRequest} style={isLoading ? disabledButtonStyle : buttonStyle} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
            {httpError && <p style={{ color: '#ff6b6b', marginTop: '5px', fontSize: '11px' }}>Error: {httpError}</p>}
          </div>

          {/* Overlay Controls Section */}
          <div style={{ marginTop: '15px', borderTop: '1px solid #666', paddingTop: '10px' }}>
            <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Overlay Controls</h2>
            <button onClick={handleTriggerEffect} style={buttonStyle}>Particle</button>
            <button onClick={handleTriggerSpriteShowcase} style={buttonStyle}>Sprite</button>
            <button onClick={handleTriggerMessage} style={buttonStyle}>Message</button>
          </div>
        </div>
      )}
    </>
  );
}
