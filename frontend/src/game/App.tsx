import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import PhaserGame from "./PhaserGame";
import OverlayScreen, { OverlayScreenHandle } from '../modules/OverlayScreen';

// Use the props in the component definition (optional, adjust as needed)
export default function App(/*{ roomId = "wasted", shouldConnect = true }: AppProps*/) {
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

  const BackButton = import.meta.env.PROD
    ? () => null // Return a component that renders nothing in production
    : () => {return<button
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
    </button>}

  const TestModules = import.meta.env.PROD
    ? () => null // Return a component that renders nothing in production
    : lazy(() => import("../modules/TestModules")); // Dynamically import in development

  return (
      <>
          {/* Conditionally render PhaserGame based on connection or other logic if needed */}
          <div id="phaser-game-container" className="w-full h-full z-10 relative">
              <PhaserGame />
          </div>
          <BackButton />
          {/* OverlayScreen component for Phaser game overlay */}
          <OverlayScreen ref={overlayRef} />
          {/* Test Modules for debugging and development. Disable on production level. */}
          {!import.meta.env.PROD && (
              <Suspense fallback={<div>Loading test modules...</div>}>
                  <TestModules
                      onTriggerMessage={handleTriggerMessage}
                      onTriggerParticleEffect={handleTriggerEffect}
                      onTriggerSpriteShowcase={handleTriggerSpriteShowcase}
                  />
              </Suspense>
          )}
          {/* Warning message for mobile orientation */}
          {showWarning && (
              <div
                  className="warning-message"
                  style={{
                      position: "absolute",
                      top: "20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 1000,
                      backgroundColor: "rgba(255, 0, 0, 0.8)",
                      color: "#fff",
                      padding: "10px",
                      borderRadius: "5px",
                  }}
              >
                  Please rotate your device to portrait mode for a better
                  experience.
              </div>
          )}
      </>
  );
}