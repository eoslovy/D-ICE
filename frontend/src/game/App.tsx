import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PhaserGame from './PhaserGame';
import webSocketManager from '../modules/WebSocketManager';

// Define props if you need to pass data to control connection
interface AppProps {
  // Example prop: maybe a room ID is needed to decide if we should connect
  roomId?: string;
  // Or a simple flag
  shouldConnect?: boolean;
}

// Use the props in the component definition (optional, adjust as needed)
export default function App({ roomId = "wasted", shouldConnect = true }: AppProps) {
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  // Check orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      // Consider adding a check for mobile devices if this warning is mobile-only
      if (window.innerWidth > window.innerHeight && window.innerHeight < 500) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    window.addEventListener('resize', checkOrientation);
    checkOrientation(); // Initial check

    return () => window.removeEventListener('resize', checkOrientation);
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Effect for WebSocket connection management
  useEffect(() => {
    // Only connect if the condition is met (e.g., shouldConnect prop is true)
    if (shouldConnect) {
      console.log('[App] Connecting WebSocket...');
      webSocketManager.connect();

      // Return a cleanup function to disconnect when the component unmounts
      // or when the 'shouldConnect' prop changes to false
      return () => {
        console.log('[App] Disconnecting WebSocket...');
        webSocketManager.disconnect();
      };
    } else {
      // Ensure disconnected if condition is false
      webSocketManager.disconnect();
    }
    // Add shouldConnect to dependency array if connection depends on it
  }, [shouldConnect]);

  return (
    <div className="game-container">
      {/* Conditionally render PhaserGame based on connection or other logic if needed */}
      <PhaserGame />

      <button
        onClick={() => navigate('/')}
        className="back-button"
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 100,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ← Back
      </button>

      {showWarning && (
        <div className="orientation-warning" style={{
          position: 'fixed', // Use fixed to overlay
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 200 // Ensure it's above other elements
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📱 ↻</div>
          <p>Please rotate your device to portrait mode</p>
        </div>
      )}
    </div>
  );
}