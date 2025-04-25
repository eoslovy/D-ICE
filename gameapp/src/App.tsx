import { useState, useEffect } from 'react';
import PhaserGame from './PhaserGame';

export default function App() {
  const [showWarning, setShowWarning] = useState(false);

  // Check orientation on mobile
  useEffect(() => {
    const checkOrientation = () => {
      if (window.innerWidth > window.innerHeight && window.innerHeight < 500) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    window.addEventListener('resize', checkOrientation);
    checkOrientation();

    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return (
    <div className="game-container">
      <PhaserGame />
      
      {showWarning && (
        <div className="orientation-warning">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📱 ↻</div>
          <p>Please rotate your device to portrait mode</p>
        </div>
      )}
    </div>
  );
}