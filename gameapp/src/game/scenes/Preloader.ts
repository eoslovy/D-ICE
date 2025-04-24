import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
  constructor() {
    super({ key: 'Preloader' });
  }

  preload() {
    // Show loading progress
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Update progress bar
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
    
    // Clean up on complete
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });
    
    // Load assets
    this.load.image('bg', 'assets/bg.png');
    this.load.image('logo', 'assets/logo.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('player', 'https://examples.phaser.io/assets/sprites/phaser-dude.png');
    this.load.image('enemy', 'https://examples.phaser.io/assets/sprites/phaser-ship.png');
    this.load.image('laser', 'https://examples.phaser.io/assets/sprites/bullets.png');
  }

  create() {
    this.scene.start('MainMenu');
  }
}
