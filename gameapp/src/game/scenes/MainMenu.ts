import Phaser from 'phaser';

export class GameOver extends Phaser.Scene {
  private score: number = 0;

  constructor() {
    super({ key: 'GameOver' });
  }

  init(data) {
    this.score = data.score || 0;
  }

  create() {
    const width = this.sys.game.canvas.width;
    const height = this.sys.game.canvas.height;

    // Add background
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

    // Game Over text
    this.add.text(width / 2, height * 0.3, 'GAME OVER', {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: '#ff0000'
    }).setOrigin(0.5);

    // Score text
    this.add.text(width / 2, height * 0.45, `SCORE: ${this.score}`, {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Replay button
    const buttonWidth = width * 0.6;
    const buttonHeight = 80;

    const replayButton = this.add.container(width / 2, height * 0.6);

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x4a4a4a, 1);
    buttonBg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);

    const buttonBorder = this.add.graphics();
    buttonBorder.lineStyle(2, 0xffffff, 0.8);
    buttonBorder.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);

    const buttonText = this.add.text(0, 0, 'PLAY AGAIN', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    replayButton.add([buttonBg, buttonBorder, buttonText]);
    replayButton.setSize(buttonWidth, buttonHeight);
    replayButton.setInteractive();

    replayButton.on('pointerdown', () => {
      buttonBg.clear();
      buttonBg.fillStyle(0x3a3a3a, 1);
      buttonBg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);
    });

    replayButton.on('pointerup', () => {
      this.scene.start('Game');
      buttonBg.clear();
      buttonBg.fillStyle(0x4a4a4a, 1);
      buttonBg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);
    });

    // Menu button
    const menuButton = this.add.container(width / 2, height * 0.75);

    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x4a4a4a, 1);
    menuBg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);

    const menuBorder = this.add.graphics();
    menuBorder.lineStyle(2, 0xffffff, 0.8);
    menuBorder.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);

    const menuText = this.add.text(0, 0, 'MAIN MENU', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    menuButton.add([menuBg, menuBorder, menuText]);
    menuButton.setSize(buttonWidth, buttonHeight);
    menuButton.setInteractive();

    menuButton.on('pointerdown', () => {
      menuBg.clear();
      menuBg.fillStyle(0x3a3a3a, 1);
      menuBg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);
    });

    menuButton.on('pointerup', () => {
      this.scene.start('MainMenu');
      menuBg.clear();
      menuBg.fillStyle(0x4a4a4a, 1);
      menuBg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);
    });
  }
}

export class MainMenu extends Phaser.Scene {
  private logo: Phaser.GameObjects.Image;
  private startButton: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Add background
    this.add.tileSprite(0, 0, width, height, 'bg')
      .setOrigin(0)
      .setScrollFactor(0);

    // Add logo
    this.logo = this.add.image(width / 2, height * 0.3, 'logo')
      .setOrigin(0.5);

    // Scale logo based on screen size
    const logoScale = Math.min(width / this.logo.width * 0.7, height / this.logo.height * 0.2);
    this.logo.setScale(logoScale);

    // Create start button
    this.startButton = this.createButton(width / 2, height * 0.6, 'START GAME', () => {
      this.scene.start('Game');
    });

    // Add title text
    this.add.text(width / 2, height * 0.2, 'SPACE SHOOTER', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Add tap instruction
    this.add.text(width / 2, height * 0.8, 'Tap to move\nTap bottom area to shoot', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
  }

  createButton(x: number, y: number, text: string, callback: Function): Phaser.GameObjects.Container {
    const width = this.cameras.main.width;
    const buttonWidth = width * 0.6;
    const buttonHeight = 80;

    const container = this.add.container(x, y);

    // Button background
    const background = this.add.graphics();
    background.fillStyle(0x4a4a4a, 1);
    background.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);

    // Button border
    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.8);
    border.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([background, border, buttonText]);

    // Make interactive
    container.setSize(buttonWidth, buttonHeight);
    container.setInteractive();

    container.on('pointerdown', () => {
      background.clear();
      background.fillStyle(0x3a3a3a, 1);
      background.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);
    });

    container.on('pointerup', () => {
      callback();
      background.clear();
      background.fillStyle(0x4a4a4a, 1);
      background.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);
    });

    return container;
  }
}
