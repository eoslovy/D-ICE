import { Scene } from 'phaser';
import { LoadManifestFromJSON } from '../../modules/gameutils/LoadSpritesManifest';
import { PopupSprite } from '../../modules/gameutils/PopupSptire';
import { PopupText } from '../../modules/gameutils/PopupText';
import { UITimer } from '../../modules/gameutils/UITimer';
import { UICountdown } from '../../modules/gameutils/UICountdown';
import { EventBus } from '../EventBus';

export class MyAwesomeGame extends Scene {
    // Common settings
    private timer: UITimer;
    private countdown: UICountdown;
    private gameStartedTime: number;
    private gameMustEndTime: number;
    private gameDuration: number;
    private popupText: PopupText;
    private popupSprite: PopupSprite;
    private gameStarted: boolean = false;
    private gameEnded: boolean = false;

    // game specific settings

    constructor() {
        super('MyAwesomeGame');
    }

    init() {
        this.gameStartedTime = 0;
        this.gameDuration = 20; // Default to 60 seconds if not provided
        this.gameStarted = false;
        this.gameEnded = false;

        // Add game initialization logic here
        // This is called once when the scene is created
        // this.gameMustEndTime = data.gameMustEndTime + this.gameDuration * 1000; // Convert to milliseconds   
    }

    preload() {
        // Add game specific asset loading here
        // This is called once before the scene is created
        this.load.start();
    }

    create() {
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);

        this.events.on('countdownFinished', () => {
            this.startGame();
        });

        this.events.on('timerFinished', () => {
            this.endGame();
        });

        this.countdown.startCountdown(3);

        // Add game specific create logic here
        // This is called once when the scene is created
    }

    startGame() {
        this.gameStartedTime = Date.now();
        this.timer.startTimer(this.gameDuration);
        this.gameStarted = true;
        this.gameEnded = false;

        // Add game start logic here
        // Called once when the game starts

    }

    endGame() {
        this.timer.stopTimer(true);
        this.time.removeAllEvents();
        this.gameEnded = true;
        this.gameStarted = false;

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.popupText.popupText('Game Over', this.cameras.main.centerX, this.cameras.main.centerY, 2000, {
                    fontSize: '128px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2,
                    align: 'center',
                    fontFamily: 'Jua',
                    fontStyle: 'bold',
                });
                this.result();
            }
        });

        // Add game end logic here
    }

    getFinalScore() {
        // Max Score is 100 points
        // Example: 0-10 seconds = 100 points, 10-20 seconds = 90 points, etc.
        const elapsedTime = Date.now() - this.gameStartedTime;
        const score = Math.min(100, elapsedTime / this.gameDuration * 100 + 10);
        return Math.floor(score);
    }

    result() {
        const elapsedTime = Date.now() - this.gameStartedTime;
        const finalScore = this.getFinalScore();

        // Result logic here

    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        // Update game logic here
        // This is called every frame
    }
}
