"use client";
import { useEffect, useRef } from 'react';

export default function PhaserGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initPhaser() {
      if (gameContainerRef.current) {
        // Dynamically import Phaser and your game configuration
        const Phaser = (await import('phaser')).default;
        const { default: config } = await import('./game/main');
        
        // Calculate dimensions based on current window height
        const currentHeight = window.innerHeight;
        // Maintain aspect ratio (720:1280 = 9:16 approximately)
        const aspectRatio = 9/16;
        const calculatedWidth = Math.min(currentHeight * aspectRatio, window.innerWidth);
        
        // Create a new game instance with height matched to window
        const game = new Phaser.Game({
          ...config,
          parent: gameContainerRef.current,
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: calculatedWidth, // Width based on aspect ratio
            height: currentHeight,  // Match current window height
            min: {
              width: 320,
              height: 480
            },
            max: {
              width: 1080,
              height: 1920
            }
          }
        });

        // Cleanup function
        return () => {
          game.destroy(true);
        };
      }
    }

    initPhaser();
  }, []);

  return <div ref={gameContainerRef} style={{ width: '100%', height: '100%' }} />;
}
