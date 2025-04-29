import Phaser from 'phaser';

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
    this.startButton = this.createButton(width / 2, height * 0.6, 'Clicker GAME', () => {
      this.scene.start('Clicker');
    });

    // Create start button
    this.startButton = this.createButton(width / 2, height * 0.5, '반응속도 게임', () => {
      this.scene.start('Reaction');
    });

    // Add title text
    this.add.text(width / 2, height * 0.2, 'TOUCH TOUCH', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Add tap instruction
    this.add.text(width / 2, height * 0.8, 'Tap to Get Scores!', {
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
