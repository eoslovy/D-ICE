import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PhaserGame from './PhaserGame';
import webSocketManager from '../modules/WebSocketManager';
import OverlayScreen, { OverlayScreenHandle } from '../modules/OverlayScreen';
// Test Modules import
import TestModules from '../modules/TestModules';

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

  // OverlayScreen ref to call methods on the Phaser game instance
  const overlayRef = useRef<OverlayScreenHandle>(null);
  const handleTriggerEffect = () => {
    if (overlayRef.current) {
      overlayRef.current.triggerParticleEffect(); // Call the method on the Phaser game instance
    }
  }

  const handleTriggerSpriteShowcase = () => {
    if (overlayRef.current) {
      overlayRef.current.triggerSpriteShowcase(); // Call the method on the Phaser game instance
    }
  }

  const handleTriggerMessage = (text: string, fontSize: number = 32, duration: number = 3000, withEffect: boolean = true) => {
    if (overlayRef.current) {
      overlayRef.current.triggerMessage(text, fontSize, duration, withEffect);
    }
  };

  return (
    <div className="game-container">
      {/* Conditionally render PhaserGame based on connection or other logic if needed */}
      <div id="phaser-game-container" style={{ width: '100%', height: '100%' }}>
        <PhaserGame />
      </div>

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
      {/* OverlayScreen component for Phaser game overlay */}
      <OverlayScreen ref={overlayRef} />
      {/* Test Modules for debugging and development. Disable on production level. */}
      <TestModules 
        onTriggerMessage={handleTriggerMessage}
        onTriggerParticleEffect={handleTriggerEffect}
        onTriggerSpriteShowcase={handleTriggerSpriteShowcase}
      />
      {/* Warning message for mobile orientation */}
      {showWarning && (
        <div className="warning-message" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'rgba(255, 0, 0, 0.8)', color: '#fff', padding: '10px', borderRadius: '5px' }}>
          Please rotate your device to portrait mode for a better experience.
        </div>
      )}
    </div>
  );
}