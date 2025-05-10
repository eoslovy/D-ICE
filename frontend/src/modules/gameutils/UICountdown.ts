export class UICountdown {
    private phaserScene: Phaser.Scene;
    private countdownText: Phaser.GameObjects.Text;
    private countdownLeft: number;
    private countdownTimer: Phaser.Time.TimerEvent;
    private countdownStarted: boolean = false;
    private countdownSound: Phaser.Sound.BaseSound;
    private countdownFinishedSound: Phaser.Sound.BaseSound;


    constructor(phaserScene: Phaser.Scene, x?: number, y?: number) {
        this.phaserScene = phaserScene;
        if (x === undefined) {
            x = this.phaserScene.cameras.main.centerX;
        }
        if (y === undefined) {
            y = this.phaserScene.cameras.main.centerY;
        }
        this.countdownText = this.phaserScene.add.text(x, y, '', {
            fontSize: '128px',
            fontFamily: 'Jua',
            color: '#ffffff',
            stroke: '#000000',
            align: 'center',
            fontStyle: 'bold',
            strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(1000);
        this.countdownText.setVisible(false);
        this.countdownLeft = 0;

        this.phaserScene.events.on('shutdown', () => {
            this.stopCountdown(false);
        });
        this.phaserScene.events.on('destroy', () => {
            this.stopCountdown(false);
        });
        
        this.phaserScene.load.audio('countdownSound', 'assets/sounds/SFX_UI_Countdown_Blow_1.wav');
        this.phaserScene.load.once('filecomplete-audio-countdownSound', () => {
            this.countdownSound = this.phaserScene.sound.add('countdownSound');
        });

        this.phaserScene.load.audio('countdownFinishedSound', 'assets/sounds/SFX_UI_Countdown_End_1.wav');
        this.phaserScene.load.once('filecomplete-audio-countdownFinishedSound', () => {
            this.countdownFinishedSound = this.phaserScene.sound.add('countdownFinishedSound');
        });

        this.phaserScene.load.start();
    }

    startCountdown(duration: number) {
        if (!this.healthCheck()) {
            return; // Health check failed
        }

        if (this.countdownStarted) {
            return; // Countdown is already running
        }
        this.countdownStarted = true;
        this.countdownLeft = duration;
        this.countdownText.setText(`${this.countdownLeft}`);
        this.countdownText.setVisible(true);
        this.countdownSound?.play();

        this.countdownTimer = this.phaserScene.time.addEvent({
            delay: 1000,
            callback: this.updateCountdown,
            callbackScope: this,
            repeat: this.countdownLeft - 1,
        });
    }

    private updateCountdown() {
        if (!this.healthCheck()) {
            return; // Health check failed
        }
        this.countdownLeft--;
        this.countdownText.setText(`${this.countdownLeft}`);

        if (this.countdownLeft <= 0) {
            this.countdownFinishedSound?.play();
            this.stopCountdown(false);
        }
        else {
            this.countdownSound?.play();
        }
    }

    stopCountdown(interrupted: boolean = true) {
        if (!this.healthCheck()) {
            return; // Health check failed
        }

        if (!this.countdownStarted) {
            return; // Countdown is not running
        }
        this.countdownTimer.remove(false);

        this.countdownStarted = false;
        this.countdownText.setVisible(false);
        this.countdownText.setText('');

        if (interrupted) {
            this.phaserScene.events.emit('countdownInterrupted');
        } else {
            this.phaserScene.events.emit('countdownFinished');
        }
    }

    healthCheck() {
        if (!this.phaserScene) {
            console.warn('[UICountdown] Phaser scene is not active or not defined');
            return false;
        }
        if (!this.countdownText) {
            console.error('[UICountdown] Countdown text is not defined');
            return false;
        }
        return true;
    }
}