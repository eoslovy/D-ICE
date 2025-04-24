import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene {
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
    
    // Target management
    private targets: Phaser.GameObjects.Group;
    private targetColors: number[] = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    private targetPoints: number[] = [1, 2, 3, 5, 10];
    
    // Animation elements
    // private particles: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor() {
        super('Game');
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
        
        // Create the targets group
        this.targets = this.add.group();
        
        // Create particle effects for clickable items
        // this.particles = this.add.particles(0, 0, 'star');
        
        // Create UI elements
        this.setupUI();
        
        // Start countdown
        this.startCountdown();
        
        // Connect to EventBus
        EventBus.emit('current-scene-ready', this);
    }
    
    setupUI() {
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
        this.gameStarted = true;
        
        // Start game timer
        this.gameTimer = this.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            repeat: this.timeRemaining - 1
        });
        
        // Start spawning targets
        this.spawnTarget();
        
        // Set interval for target spawning (adjust timing for difficulty)
        this.time.addEvent({
            delay: 700,
            callback: this.spawnTarget,
            callbackScope: this,
            repeat: this.timeRemaining * 2
        });
    }
    
    updateTimer() {
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
    
    spawnTarget() {
        if (!this.gameStarted || this.timeRemaining <= 0) return;
        
        const width = this.camera.width;
        const height = this.camera.height;
        
        // Random position (keep within safe margins)
        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(100, height - 200); // Leave space at bottom for mobile
        
        // Random size (smaller = higher points but harder to tap)
        const size = Phaser.Math.Between(50, 100);
        
        // Random type (index determines color and points)
        const typeIndex = Phaser.Math.Between(0, this.targetColors.length - 1);
        const points = this.targetPoints[typeIndex];
        const color = this.targetColors[typeIndex];
        
        // Create clickable target
        const target = this.add.circle(x, y, size, color)
            .setInteractive()
            .setData('points', points)
            .setData('scale', 1)
            .setAlpha(0);
            
        // Add a pulse animation
        this.tweens.add({
            targets: target,
            alpha: 1,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            repeat: -1
        });
        
        // Auto-remove after some time
        this.time.delayedCall(2000, () => {
            if (target.active) {
                this.tweens.add({
                    targets: target,
                    alpha: 0,
                    scale: 0.5,
                    duration: 300,
                    onComplete: () => {
                        target.destroy();
                    }
                });
            }
        });
        
        // Add click/tap handler
        target.on('pointerdown', () => {
            this.clickTarget(target);
        });
        
        // Add to group
        this.targets.add(target);
    }
    
    clickTarget(target) {
        if (!target.active) return;
        
        // Get points from target
        const points = target.getData('points');
        
        // Add score
        this.score += points;
        this.scoreText.setText('Score: ' + this.score);
        
        // Create score popup
        this.createScorePopup(target.x, target.y, points);
        
        // Create particle effect
        this.createParticleEffect(target.x, target.y, target.fillColor);
        
        // Play sound if available
        if (this.sound.get('click')) {
            this.sound.play('click');
        }
        
        // Remove target with scale animation
        this.tweens.add({
            targets: target,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                target.destroy();
            }
        });
    }
    
    createScorePopup(x, y, points) {
        // Create floating score text
        const pointsText = this.add.text(x, y, '+' + points, {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Animate the text
        this.tweens.add({
            targets: pointsText,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power1',
            onComplete: () => {
                pointsText.destroy();
            }
        });
    }
    
    createParticleEffect(x, y, color) {
        // Create particle explosion
        
        const emitter = this.add.particles(x, y, 'star', {
            speed: 200,
            lifespan: 800,
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            quantity: 10,
            angle: { min: 0, max: 360 },
            tint: color
        });
        
        // play emitter
        emitter.start();
        // Stop the emitter after a short time
        this.time.delayedCall(100, () => {
            emitter.stop();
            // Clean up emitter after particles fade out
            this.time.delayedCall(500, () => {
                emitter.destroy();
            });
        });
    }
    
    endGame() {
        // Stop all timers
        if (this.gameTimer) this.gameTimer.remove();
        
        // Clear all targets with proper cleanup
        this.targets.clear(true, true);
        
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
            this.scene.start('GameOver', { score: this.score });
        });
    }
    
    update() {
        // Any per-frame updates can go here
    }
    
    changeScene() {
        this.scene.start('GameOver', { score: this.score });
    }
}
