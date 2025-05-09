import React, { useState, useEffect } from 'react';
import potgManager from "./POTGManager"; // Import POTGManager
import { v7 as uuid } from "uuid";
import userWebSocketManager from './UserWebSocketManager';

// Default Base URL (can be overridden by input)
const DEFAULT_BASE_URL = "localhost:8080";

interface TestModulesProps {
  onTriggerMessage: (text: string, fontSize?: number, duration?: number, withEffect?: boolean) => void;
  onTriggerParticleEffect: () => void;
  onTriggerSpriteShowcase: () => void;
}

export default function TestModules(props: TestModulesProps) {
  const [roomId, setRoomId] = useState<string>("wasted");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [isConsoleVisible, setIsConsoleVisible] = useState<boolean>(false);

  // 메시지 입력을 위한 state 추가
  const [messageText, setMessageText] = useState<string>('');

  // --- State for sending messages ---
  const [nickname, setNickname] = useState<string>("TestUser");
  const [submitScore, setSubmitScore] = useState<number>(100);
  const [submitGameType, setSubmitGameType] = useState<string>("DefaultGame");

  // --- State for Base URL input ---
  const [baseUrlInput, setBaseUrlInput] = useState<string>(DEFAULT_BASE_URL);

  // --- State for POTG ---
  const [isPotgRecording, setIsPotgRecording] = useState<boolean>(potgManager.getIsRecording());
  const [potgVideoUrl, setPotgVideoUrl] = useState<string | null>(null);
  const [potgError, setPotgError] = useState<string | null>(null);

  // --- State for Raw WebSocket Message ---
  const [rawMessage, setRawMessage] = useState<string>('{\n  "type": "your_message_type",\n  "payload": {}\n}');
  const [rawMessageError, setRawMessageError] = useState<string | null>(null);

  // --- POTG Event Listeners ---
  useEffect(() => {
    const handleRecordingStarted = () => {
      console.log("[TestModules] POTG Recording Started");
      setIsPotgRecording(true);
      setPotgVideoUrl(null); // Clear previous video
      setPotgError(null);
    };

    const handleRecordingStopped = async () => {
      console.log("[TestModules] POTG Recording Stopped & Saved");
      setIsPotgRecording(false);
      // Load the blob and create a URL
      try {
        const blob = await potgManager.getStoredRecordingBlob();
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPotgVideoUrl(url);
          console.log("[TestModules] Created video URL:", url);
        } else {
          setPotgError("Failed to retrieve saved recording blob.");
        }
      } catch (error: any) {
        console.error("[TestModules] Error getting stored blob:", error);
        setPotgError(`Error retrieving blob: ${error.message}`);
      }
    };

    const handleRecordingError = (error: any) => {
      console.error("[TestModules] POTG Recording Error:", error);
      setIsPotgRecording(false);
      setPotgError(`Recording Error: ${error?.message || 'Unknown error'}`);
    };

    const handlePermissionDenied = () => {
      console.warn("[TestModules] POTG Permission Denied");
      setIsPotgRecording(false);
      setPotgError("Screen recording permission denied.");
    };

    // Add listeners
    potgManager.on('recording_started', handleRecordingStarted);
    potgManager.on('recording_stopped_saved', handleRecordingStopped);
    potgManager.on('recording_error', handleRecordingError);
    potgManager.on('permission_denied', handlePermissionDenied);

    // Cleanup listeners and Object URL
    return () => {
      potgManager.off('recording_started', handleRecordingStarted);
      potgManager.off('recording_stopped_saved', handleRecordingStopped);
      potgManager.off('recording_error', handleRecordingError);
      potgManager.off('permission_denied', handlePermissionDenied);

      // Revoke existing object URL on cleanup
      if (potgVideoUrl) {
        URL.revokeObjectURL(potgVideoUrl);
        console.log("[TestModules] Revoked video URL on cleanup:", potgVideoUrl);
      }
    };
  }, [potgVideoUrl]); // Re-run effect if potgVideoUrl changes to handle cleanup correctly

  // --- WebSocket Handlers ---
  const handleConnect = () => {
    const id = uuid();
    const url = `${import.meta.env.VITE_WEBSOCKET_URL}/ws/game/user/${roomId}`;
    userWebSocketManager.setServerURL(url);
    userWebSocketManager.connect();
  };

  const handleDisconnect = () => {
    userWebSocketManager.disconnect();
  };

  const handleSendMessage = () => {
    if (!nickname.trim()) return;
    const message = {
      type: "join",
      nickname,
    };
    userWebSocketManager.send(message);
  };

  const handleSendSubmit = () => {
    const message = {
      type: "submit",
      score: submitScore,
      gameType: submitGameType,
    };
    userWebSocketManager.send(message);
  };

  const sendhttpRequest = () => {
    const url = `http://${baseUrlInput}/rooms`;
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

  // --- Overlay Handlers ---
  const handleTriggerEffect = () => { props.onTriggerParticleEffect(); };
  const handleTriggerSpriteShowcase = () => { props.onTriggerSpriteShowcase(); };
  const handleTriggerMessage = () => {
    if (messageText.trim()) {
      props.onTriggerMessage(messageText, 32, 3000, true);
    } 
  };

  // --- Console Toggle ---
  const toggleConsole = () => { setIsConsoleVisible(prev => !prev); };

  // --- POTG Handlers ---
  const handleStartCanvasRecording = async () => { // Renamed
    setPotgError(null);
    setPotgVideoUrl(null);
    if (potgVideoUrl) { // Revoke old URL if exists
      URL.revokeObjectURL(potgVideoUrl);
    }

    // --- Call startCanvasRecording ---
    await potgManager.startCanvasRecording();
  };

  const handleStopPotgRecording = async () => {
    // --- Call stopRecording ---
    await potgManager.stopRecording();
    // Video URL is set in the 'recording_stopped_saved' event handler
  };

  // --- Raw WebSocket Send Handler ---
  const handleSendRawMessage = () => {
    setRawMessageError(null); // Clear previous error
    try {
      const messageObject = JSON.parse(rawMessage);
      userWebSocketManager.send(messageObject);
      console.log("[TestModules] Sent Raw WebSocket Message:", messageObject);
    } catch (error: any) {
      console.error("[TestModules] Invalid JSON for raw message:", error);
      setRawMessageError(`Invalid JSON: ${error.message}`);
    }
  };
  const testStartGame = () => {
    const testData = {
      type: 'WAIT',
      gameType: 'Clicker',
      startAt : 1745382394207, // long epoch ms 게임 시작 시각
      duration: 10000, // long ms 게임 지속시간 
      currentMs: 1745382384207, // long epoch ms 현재 시각 유저와 시간 align 용
    };
  
    // WebSocket 이벤트 에뮬레이션
    userWebSocketManager.emit('WAIT', testData);
  };
  

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

  const videoStyle: React.CSSProperties = {
    maxWidth: '100%',
    marginTop: '10px',
    border: '1px solid #777',
    borderRadius: '4px',
  };

  const textareaStyle: React.CSSProperties = {
    width: 'calc(100% - 12px)', // Adjust width to fit padding
    minHeight: '60px',
    padding: '5px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '11px',
    marginTop: '5px',
    marginBottom: '5px',
    display: 'block', // Ensure it takes full width
    boxSizing: 'border-box', // Include padding and border in the element's total width and height
  };
  const sectionStyle: React.CSSProperties = {
    marginTop: '15px',
    borderTop: '1px solid #666',
    paddingTop: '10px',
    marginBottom: '10px',
    padding: '8px',
    border: '1px solid #585',
    borderRadius: '4px',
    backgroundColor: 'rgba(0, 30, 0, 0.2)'
  };

  return (
    <>
      <button onClick={toggleConsole} style={toggleButtonStyle}>
        {isConsoleVisible ? 'Hide Console' : 'Show Console'}
      </button>

      {isConsoleVisible && (
        <div style={consoleStyle}>
          <h1 style={{ fontSize: '16px', marginTop: '0', borderBottom: '1px solid #666', paddingBottom: '5px' }}>Test Console</h1>

          {/* Base URL Section */}
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

          {/* Room ID Section */}
          <div style={{ marginBottom: '10px', padding: '8px', border: '1px solid #558', borderRadius: '4px', backgroundColor: 'rgba(0, 0, 30, 0.2)' }}>
            <label htmlFor="roomIdInput" style={{ fontWeight: 'bold', marginRight: '10px', display: 'inline-block', minWidth: '70px' }}>Room ID:</label>
            <input id="roomIdInput" type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={inputStyle} />
            <button onClick={handleConnect} style={!roomId ? disabledButtonStyle : buttonStyle} disabled={!roomId}>Connect</button>
            <button onClick={handleDisconnect} style={buttonStyle}>Disconnect</button>
          </div>

          {/* HTTP Request Button */}
          <div style={{ marginBottom: '10px' }}>
            <button onClick={sendhttpRequest} style={isLoading ? disabledButtonStyle : buttonStyle} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
            {httpError && <p style={{ color: '#ff6b6b', marginTop: '5px', fontSize: '11px' }}>Error: {httpError}</p>}
          </div>

          {/* --- Raw WebSocket Message Section --- */}
          <div style={{ marginTop: '15px', borderTop: '1px solid #666', paddingTop: '10px' }}>
            <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Send Raw WebSocket Message</h2>
            <textarea
              value={rawMessage}
              onChange={(e) => setRawMessage(e.target.value)}
              style={textareaStyle}
              placeholder='Enter valid JSON message here...'
            />
            <button onClick={handleSendRawMessage} style={buttonStyle}>
              Send Raw JSON
            </button>
            {rawMessageError && <p style={{ color: '#ff6b6b', marginTop: '5px', fontSize: '11px' }}>Error: {rawMessageError}</p>}
          </div>
          {/* --- End Raw WebSocket Message Section --- */}

          {/* Overlay Controls Section */}
          <div style={{ marginTop: '15px', borderTop: '1px solid #666', paddingTop: '10px' }}>
            <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>Overlay Controls</h2>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter message text..."
                style={inputStyle}
              />
            </div>
            <button onClick={handleTriggerEffect} style={buttonStyle}>Particle</button>
            <button onClick={handleTriggerSpriteShowcase} style={buttonStyle}>Sprite</button>
            <button 
              onClick={handleTriggerMessage} 
              style={messageText.trim() ? buttonStyle : disabledButtonStyle}
              disabled={!messageText.trim()}
            >
              Message
            </button>
          </div>
          {/* 게임 시작 테스트 버튼 추가 */}
          <div style={sectionStyle}>
            <h3>Game Start Test</h3>
            <button 
              onClick={testStartGame}
              style={buttonStyle}
            >
              Test Game Start
            </button>
          </div>

          {/* --- POTG Recording Section (Updated Button Handler) --- */}
          <div style={{ marginTop: '15px', borderTop: '1px solid #666', paddingTop: '10px' }}>
            <h2 style={{ fontSize: '14px', marginBottom: '8px' }}>POTG Recording (Canvas)</h2>
            {/* --- Updated onClick handler --- */}
            <button onClick={handleStartCanvasRecording} style={isPotgRecording ? disabledButtonStyle : buttonStyle} disabled={isPotgRecording}>
              Start Record
            </button>
            <button onClick={handleStopPotgRecording} style={!isPotgRecording ? disabledButtonStyle : buttonStyle} disabled={!isPotgRecording}>
              Stop Record
            </button>
            {potgError && <p style={{ color: '#ff6b6b', marginTop: '5px', fontSize: '11px' }}>Error: {potgError}</p>}
            {potgVideoUrl && (
              <div>
                <h4 style={{ fontSize: '12px', margin: '10px 0 5px 0' }}>Last Recording:</h4>
                <video src={potgVideoUrl} controls style={videoStyle}></video>
              </div>
            )}
          </div>
          {/* --- End POTG Recording Section --- */}
        </div>
      )}
    </>
  );
}
