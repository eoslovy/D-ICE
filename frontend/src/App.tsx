import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PhaserGame from './PhaserGame';

export default function App() {
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

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
        <div className="orientation-warning">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📱 ↻</div>
          <p>Please rotate your device to portrait mode</p>
        </div>
      )}
    </div>
  );
}