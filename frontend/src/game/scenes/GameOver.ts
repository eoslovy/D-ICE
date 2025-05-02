import Phaser from 'phaser';

// Add interface for scene data
interface GameOverSceneData {
  score?: number;
}

export class GameOver extends Phaser.Scene {
  private finalScore: number = 0;
  
  constructor() {
    super({ key: 'GameOver' });
  }
  
  init(data: GameOverSceneData) {
    this.finalScore = data.score || 0;
  }
  
  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Add background
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0);
    
    // Game Over text and final score
    this.add.text(width / 2, height / 2, 
        'Game Over\nFinal Score: ' + this.finalScore, 
        { fontSize: '24px', color: '#ffffff', align: 'center' })
        .setOrigin(0.5);
    
    // Replay button
    const buttonWidth = width * 0.6;
    const buttonHeight = 80;
    
    const replayButton = this.add.container(width / 2, height * 0.6);
    
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x4a4a4a, 1);
    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 16);
    
    const buttonBorder = this.add.graphics();
    buttonBorder.lineStyle(2, 0xffffff, 0.8);
    buttonBorder.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 16);
    
    const buttonText = this.add.text(0, 0, 'PLAY AGAIN', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    replayButton.add([buttonBg, buttonBorder, buttonText]);
    replayButton.setSize(buttonWidth, buttonHeight);
    replayButton.setInteractive();
    
    replayButton.on('pointerup', () => {
      // Clean up current scene before starting new one
      this.tweens.killAll();
      this.scene.start('MainMenu'); // MainMenu 씬으로 전환
    });
    
    // Menu button
    const menuButton = this.add.container(width / 2, height * 0.75);
    
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x4a4a4a, 1);
    menuBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 16);
    
    const menuBorder = this.add.graphics();
    menuBorder.lineStyle(2, 0xffffff, 0.8);
    menuBorder.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 16);
    
    const menuText = this.add.text(0, 0, 'MAIN MENU', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    menuButton.add([menuBg, menuBorder, menuText]);
    menuButton.setSize(buttonWidth, buttonHeight);
    menuButton.setInteractive();
    
    menuButton.on('pointerup', () => {
      // Clean up current scene before starting new one
      this.tweens.killAll();
      this.scene.stop(); // 현재 게임 씬 정지
      this.scene.start('MainMenu');
    });
  }
}
