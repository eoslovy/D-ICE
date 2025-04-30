// Template for creating a Phaser game scene
import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class MyAwesomeGame extends Scene {
    // Core game elements
    private camera: Phaser.Cameras.Scene2D.Camera;
    private background: Phaser.GameObjects.Image;
    
    // Game interface elements
    private scoreText: Phaser.GameObjects.Text;
    private timerText: Phaser.GameObjects.Text;
    private countdownText: Phaser.GameObjects.Text;
    
    // Game state
    private score: number = 0;
    private timeRemaining: number = 30; // 30 seconds game
    private gameStarted: boolean = false;
    private countdownTimer: Phaser.Time.TimerEvent;
    private gameTimer: Phaser.Time.TimerEvent;

    // Game objects
    private objectPool: Map<string, Phaser.GameObjects.Group>;
    // Some private variables for game state

    constructor() {
        // Call the parent constructor with the scene key
        super('MyAwesomeGame');
    }

    init() {
        // Reset all game state variables
        this.score = 0;
        this.timeRemaining = 30;
        this.gameStarted = false;
        
        // Clear any lingering timers
        if (this.countdownTimer) this.countdownTimer.remove();
        if (this.gameTimer) this.gameTimer.remove();
    }

    create() {
        // Setup camera and background
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x222222);
        
        const width = this.camera.width;
        const height = this.camera.height;
        
        // Setup background (use a gradient pattern if available)
        if (this.textures.exists('background')) {
            this.background = this.add.image(width/2, height/2, 'background')
                .setDisplaySize(width, height);
        } else {
            // Create a simple gradient background if no texture
            const bgGradient = this.add.graphics();
            bgGradient.fillGradientStyle(0x111111, 0x111111, 0x333333, 0x333333, 1);
            bgGradient.fillRect(0, 0, width, height);
        }
        
        // Set up object pool
        this.objectPool = new Map();
        
        // Create UI elements
        this.setupUI();
        
        // Start countdown
        this.startCountdown();
        
        // Connect to EventBus
        EventBus.emit('current-scene-ready', this);
    }
    
    setupUI() {
        // Setting up UI Elements
        const width = this.camera.width;
        const height = this.camera.height;
        
        // Score text at top left
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setScrollFactor(0);
        
        // Timer at top right
        this.timerText = this.add.text(width - 20, 20, '30s', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 0).setScrollFactor(0);
        
        // Countdown text in center (only shows at start)
        this.countdownText = this.add.text(width/2, height/2, '3', {
            fontFamily: 'Arial Black',
            fontSize: '128px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
    }
    
    startCountdown() {
        // Countdown logic for game start
        let count = 3;
        this.countdownText.setText(count.toString());
        
        // Play countdown sound if available
        if (this.sound.get('countdown')) {
            this.sound.play('countdown');
        }
        
        this.countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                count--;
                if (count > 0) {
                    this.countdownText.setText(count.toString());
                    // Play countdown sound if available
                    if (this.sound.get('countdown')) {
                        this.sound.play('countdown');
                    }
                } else {
                    this.countdownText.setText('GO!');
                    // Play start sound if available
                    if (this.sound.get('start')) {
                        this.sound.play('start');
                    }
                    
                    // Start the game after "GO" shows for 0.5 seconds
                    this.time.delayedCall(500, () => {
                        this.countdownText.setVisible(false);
                        this.startGame();
                    });
                }
            },
            repeat: 2
        });
    }
    
    startGame() {
        // Game start logic
        this.gameStarted = true;
        
        // Start game timer
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            repeat: this.timeRemaining - 1
        });
        
        // Your Game Logic Here
        this.gameLogic();
    }
    
    updateTimer() {
        // Update timer text
        this.timeRemaining--;
        this.timerText.setText(this.timeRemaining + 's');
        
        // Flash timer when low
        if (this.timeRemaining <= 10) {
            this.timerText.setColor(this.timeRemaining % 2 === 0 ? '#ff0000' : '#ffffff');
        }
        
        // End game when time runs out
        if (this.timeRemaining <= 0) {
            this.endGame();
        }
    }
    
    updateScore(points: number) {
        // Update score and display
        this.score += points;
        this.scoreText.setText('Score: ' + this.score);
        
        // Create floating score popup
        this.createTextPopup(this.camera.width / 2, this.camera.height / 2, points.toString());
        
        // Play score sound if available
        if (this.sound.get('score')) {
            this.sound.play('score');
        }
    }

    createTextPopup(x: number, y: number, text: string, config: Phaser.Types.GameObjects.Text.TextStyle = {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    }) {
        // Create floating score text
        const popupText = this.add.text(x, y, text, config).setOrigin(0.5);
        
        // Animate the text
        this.tweens.add({
            targets: popupText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power1',
            onComplete: () => {
                popupText.destroy();
            }
        });
        
        // Add to object pool
        let textPopupsGroup = this.objectPool.get('textPopups');
        if (textPopupsGroup) {
            textPopupsGroup.add(popupText);
        }
        else {
            textPopupsGroup = this.add.group({
                classType: Phaser.GameObjects.Text,
                defaultKey: 'textPopup',
                maxSize: 100,
                runChildUpdate: true
            });
            textPopupsGroup.add(popupText);
        }
    }
    
    createParticleEffect(x: number, y: number, particleType: string = 'star', config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
        speed: 200,
        lifespan: 800,
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        blendMode: 'ADD',
        quantity: 1,
        angle: { min: 0, max: 360 },
    }) {
        // Create particle explosion
        
        const emitter = this.add.particles(x, y, particleType, config);
        
        // play emitter
        emitter.start();
        // Stop the emitter after a short time
        this.time.delayedCall(100, () => {
            emitter.stop();
        });
        // Add to object pool
        let particleGroup = this.objectPool.get('particles');
        if (particleGroup) {
            particleGroup.add(emitter);
        }
        else {
            particleGroup = this.add.group({
                classType: Phaser.GameObjects.Particles.ParticleEmitter,
                defaultKey: 'particle',
                maxSize: 100,
                runChildUpdate: true
            });
            particleGroup.add(emitter);
        }
    }
    
    endGame() {
        // End game logic
        this.gameStarted = false;

        // Stop all timers
        if (this.gameTimer) this.gameTimer.remove();
        
        // Clear all targets with proper cleanup
        this.objectPool.forEach((group) => {
            group.getChildren().forEach((child) => {
                if (child instanceof Phaser.GameObjects.Sprite) {
                    child.destroy();
                }
            });
        });
        this.objectPool.clear();
        
        // Stop all active tweens
        this.tweens.killAll();
        
        // Show game over message
        const width = this.camera.width;
        const height = this.camera.height;
        
        this.add.text(width/2, height/2, 'Time\'s Up!', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        
        // Show final score
        this.add.text(width/2, height/2 + 100, 'Final Score: ' + this.score, {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        
        // Play game over sound if available
        if (this.sound.get('gameover')) {
            this.sound.play('gameover');
        }
        
        // Delay before transitioning to game over scene
        this.time.delayedCall(3000, () => {
            // Clean up any remaining objects before transitioning
            this.tweens.killAll();
            this.scene.start('GameOver', { 
                score: this.score,
                gameType: 'Clicker'
            });
        });
    }
    
    changeScene() {
        this.scene.start('GameOver', { 
            score: this.score,
            gameType: 'Clicker'
        });
    }

    update() {
        // Any per-frame updates can go here
    }
    
    gameLogic() {
        // Implement game logic here (Called exactly once after countdown)
        
    }
}
