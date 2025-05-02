export class UITimer {
    private phaserScene: Phaser.Scene;
    private timerText: Phaser.GameObjects.Text;
    private timerTimer: Phaser.Time.TimerEvent;
    private timerLeft: number;
    private timerStarted: boolean = false;
    private timerUrgencySound: Phaser.Sound.BaseSound;
    private timerFinishedSound: Phaser.Sound.BaseSound;

    constructor(phaserScene: Phaser.Scene, x: number = 20, y: number = 20) {
        this.phaserScene = phaserScene;
        this.timerText = this.phaserScene.add.text(x, y, '', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            align: 'center',
        }).setOrigin(0.5, 0.5);
        this.timerText.setDepth(1000);
        this.timerText.setVisible(false);
        this.timerLeft = 0;
        this.phaserScene.events.on('shutdown', () => {
            this.stopTimer(false);
        }
        );
        this.phaserScene.events.on('destroy', () => {
            this.stopTimer(false);
        }
        );
        
        this.phaserScene.load.audio('timerUrgencySound', 'assets/sounds/BONG Bell Timer Hit Short 04.wav');
        this.phaserScene.load.audio('timerFinishedSound', 'assets/sounds/ALARM Alert Buzzer Short 01.wav');
        this.timerUrgencySound = this.phaserScene.sound.add('timerUrgencySound');
        this.timerFinishedSound = this.phaserScene.sound.add('timerFinishedSound');
    }

    startTimer(duration: number) {
        if (this.timerStarted) {
            return; // Timer is already running
        }
        this.timerStarted = true;
        this.timerLeft = duration;
        this.timerText.setVisible(true);

        this.timerTimer = this.phaserScene.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            repeat: this.timerLeft - 1,
        });
    }

    updateTimer() {
        // display seconds
        this.timerText.setText(`${this.timerLeft}`);

        if (this.timerLeft <= 5 && !this.timerUrgencySound.isPlaying) {
            this.timerText.setColor('#ff0000'); // Change text color to red
            this.timerUrgencySound?.play();
        }
        else if (this.timerLeft <= 0) {
            this.timerUrgencySound?.play();
            this.stopTimer(true);
        }
        else {
            this.timerText.setColor('#ffffff'); // Reset text color to white
        }
    }

    stopTimer(interrupted: boolean = false) {
        if (!this.timerStarted) {
            return; // Timer is not running
        }
        this.timerTimer?.remove(false); // Stop the timer event

        this.timerStarted = false;
        this.timerText.setVisible(false);
        this.timerText.setColor('#ffffff'); // Reset text color to white
        this.timerText.setText(''); // Clear the text
        this.timerLeft = 0;

        if (interrupted) {
            this.phaserScene.events.emit('timerInterrupted');
        }
        else {
            this.phaserScene.events.emit('timerFinished');
        }
    }
}