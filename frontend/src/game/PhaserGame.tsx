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
        const baseWidth = 720;
        const baseHeight = 1280;
        
        // Get container dimensions to calculate appropriate scaling
        // const containerWidth = gameContainerRef.current.clientWidth; 
        // const containerHeight = gameContainerRef.current.clientHeight;
        
        // Create a new game instance with fixed base dimensions
        const game = new Phaser.Game({
          ...config,
          parent: gameContainerRef.current,  