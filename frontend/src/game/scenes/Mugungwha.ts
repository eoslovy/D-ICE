import { Scene } from 'phaser';
import userWebSocketManager from '../../modules/UserWebSocketManager';
import { PopupSprite } from '../../modules/gameutils/PopupSptire';
import { PopupText } from '../../modules/gameutils/PopupText';
import { UITimer } from '../../modules/gameutils/UITimer';
import { UICountdown } from '../../modules/gameutils/UICountdown';

export class Mugungwha extends Scene {
    // Common settings
    private timer: UITimer;
    private countdown: UICountdown;
    private gameStartedTime: number;
    private gameMustEndTime: number;
    private gameDuration: number;
    private popupText: PopupText;
    private popupSprite: PopupSprite;

    // Game specific settings
    private distanceMoved: number;
    private lastDistance: number;
    private maxDistance: number = 10000; // Maximum distance to achieve 100 points
    private background: Phaser.GameObjects.TileSprite;
    private textPool: Phaser.GameObjects.Group;
    private watchingCounter: number;
    private isWatching: boolean;

    constructor() {
        super('Mugungwha');
    }

    init(data: any) {
        this.gameStartedTime = 0;
        this.distanceMoved = 0;
        this.lastDistance = 0;
        this.gameDuration = data.gameDuration || 60; // Default to 60 seconds if not provided
        this.watchingCounter = 0;
        this.isWatching = false;
        // this.gameMustEndTime = data.gameMustEndTime + this.gameDuration * 1000; // Convert to milliseconds   
    }

    create() {
        this.timer = new UITimer(this, 0, 0);
        this.countdown = new UICountdown(this, 0, 0);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);
        this.textPool = this.add.group(
            {
                classType: Phaser.GameObjects.Text,
                runChildUpdate: true,
                maxSize: 100,
                createCallback: (item: Phaser.GameObjects.GameObject) => {
                    item.setActive(false);
                    if (item instanceof Phaser.GameObjects.Text) {
                        item.setVisible(false);
                        item.setOrigin(0.5, 0.5);
                        item.setStyle({
                            fontSize: '20px',
                            fontFamily: 'Arial',
                            color: '#ffffff',
                            stroke: '#000000',
                            strokeThickness: 2,
                            align: 'center',
                        });
                    }
                }
            }
        );

        // game specific UI
        if (this.textures.exists('mugungwha_background')) {
            const bgTexture = this.textures.get('mugungwha_background');
            const bgWidth = bgTexture.getSourceImage().width;
            const bgHeight = bgTexture.getSourceImage().height;

            this.background = this.add.tileSprite(
                0,
                0,
                this.cameras.main.width,
                this.cameras.main.height,
                'mugungwha_background'
            ).setOrigin(0, 0);
        }
        else {
            console.warn('[Mugungwha] Background texture not found');
            this.cameras.main.setBackgroundColor('#abcdef');
        }

        this.events.on('countdownFinished', () => {
            this.startGame();
        });

        this.events.on('timerFinished', () => {
            this.endGame();
        });
    }

    startGame() {
        this.gameStartedTime = Date.now();
        this.timer.startTimer(this.gameDuration);    

        this.add.sprite(
            this.cameras.main.width / 2,
            this.cameras.main.height * 3 / 4,
            'mugungwha_button'
        ).setOrigin(0.5, 0.5).setInteractive().on('pointerdown', () => {
            if (this.isWatching) {
                this.popupText.popupText('앗!', undefined, undefined, 2000);
                this.endGame();
                return;
            }
            this.distanceMoved += 1; // Simulate distance moved
            const randomX = Phaser.Math.Between(0, this.cameras.main.width);
            const randomY = Phaser.Math.Between(0, this.cameras.main.height);
            const curText = this.textPool.get(randomX, randomY) as Phaser.GameObjects.Text;
            curText.setText(randomX & 1 ? '가자!' : 'Go!');
            curText.rotation = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
            curText.setTint(Phaser.Math.Between(0, 0xffffff));
            this.tweens.add({
                targets: curText,
                alpha: { from: 1, to: 0 },
                y: { from: randomY, to: randomY - 50 },
                duration: 300,
                ease: 'Linear',
                onComplete: () => {
                    if (this.textPool) {
                        this.textPool.killAndHide(curText);
                    }
                }
            });
        });
    }

    endGame() {
        this.timer.stopTimer();
        this.time.removeAllEvents();
        this.popupText.popupText('Game Over', undefined, undefined, 2000);
        this.result();
    }

    getFinalScore() {
        // Max Score is 100 points for maxDistance
        // Calculate score based on distance moved with logarithmic scaling
        const score = Math.min(100, Math.log(this.distanceMoved + 1) / Math.log(this.maxDistance + 1) * 100);
        return Math.floor(score);
    }

    result() {
        const elapsedTime = Date.now() - this.gameStartedTime;
        const finalScore = this.getFinalScore();

        // pop up result modal

    }

    update(time: number, delta: number) {
        if (this.background) {
            const distance_moved = this.distanceMoved - this.lastDistance;
            this.background.tilePositionX += this.distanceMoved;
        }
        this.lastDistance = this.distanceMoved;
        
        if (!this.isWatching) {
            this.watchingCounter += Phaser.Math.Between(0, 3);
            if (this.watchingCounter > 100) {
                this.isWatching = true;
                
                this.time.addEvent({
                    delay: 2000,
                    callback: () => {
                        this.isWatching = false;
                        this.watchingCounter = 0;
                    }
                });
            }
        }
    }
}
