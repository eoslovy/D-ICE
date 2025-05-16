import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function PhaserGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    async function initPhaser() {
      if (gameContainerRef.current) {
        // Dynamically import Phaser and your game configuration
        const Phaser = (await import('phaser')).default;
        const { default: config } = await import('./Config.ts');
        
        // Use fixed dimensions that work well across devices
        // Instead of using full window height, use a reasonable base size
        
        // Get container dimensions to calculate appropriate scaling
        // const containerWidth = gameContainerRef.current.clientWidth; 
        // const containerHeight = gameContainerRef.current.clientHeight;
        const baseWidth = 720; // Fixed base width
        const baseHeight = window.innerHeight < window.innerWidth ? window.innerHeight : Math.floor(baseWidth * (window.innerHeight / window.innerWidth)); // Maintain aspect ratio

        // Create a new game instance with fixed base dimensions
        const game = new Phaser.Game({
          ...config,
          parent: gameContainerRef.current,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: baseWidth,
            height: baseHeight,
          }
        });
        
        // Store for cleanup
        gameInstanceRef.current = game;
      }
    }

    initPhaser();
    
    // Cleanup function
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={gameContainerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        maxHeight: '100vh',
        overflow: 'hidden' // Prevent scrolling
      }} 
    />
  );
}
