import Phaser from 'phaser';
import { Boot } from './scenes/common/Boot';
import { Preloader } from './scenes/common/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { Clicker } from './scenes/Clicker';
import { GameOver } from './scenes/GameOver';
import { Reaction } from './scenes/Reaction';
import { Roulette } from './scenes/common/Roulette';
import { PerfectCircleGame } from './scenes/PerfectCircleGame';
import { GameInstruction } from './scenes/common/GameInstruction';
import { NumberSurvivor } from './scenes/NumberSurvivor';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
    touch: {
      capture: true
    }
  },
  disableContextMenu: true,
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 300 },
      debug: false
    }
  },
  scene: [Boot, Preloader, MainMenu, GameOver, Roulette, Clicker, Reaction, GameInstruction, PerfectCircleGame, NumberSurvivor]
};

export default config;
