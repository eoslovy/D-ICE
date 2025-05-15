export class UITimer {
    private phaserScene: Phaser.Scene;
    private timerText: Phaser.GameObjects.Text;
    private timerTimer: Phaser.Time.TimerEvent;
    private timerLeft: number;
    private timerStarted: boolean = false;
    private timerUrgencySound: Phaser.Sound.BaseSound;
    private timerFinishedSound: Phaser.Sound.BaseSound;

    constructor(phaserScene: Phaser.Scene, x: number = 100, y: number = 100) {
        console.log("[UITimer] Initializing UITimer");
        this.phaserScene = phaserScene;
        this.timerText = this.phaserScene.add
            .text(x, y, "", {
                fontSize: "48px",
                fontFamily: "Jua",
                color: "#ffffff",
                stroke: "#000000",
                align: "center",
                fontStyle: "bold",
                strokeThickness: 2,
            })
            .setOrigin(0.5, 0.5);
        this.timerText?.setDepth(1000);
        this.timerText?.setVisible(false);
        this.timerLeft = 0;
        this.phaserScene.events.on("shutdown", () => {
            this.stopTimer(false);
        });
        this.phaserScene.events.on("destroy", () => {
            this.stopTimer(false);
        });

        this.phaserScene.load.audio(
            "timerUrgencySound",
            "assets/sounds/BONGBellTimerHitShort04.wav"
        );
        this.phaserScene.load.once(
            "filecomplete-audio-timerUrgencySound",
            () => {
                this.timerUrgencySound =
                    this.phaserScene.sound.add("timerUrgencySound");
            }
        );

        this.phaserScene.load.audio(
            "timerFinishedSound",
            "assets/sounds/ALARMAlertBuzzerShort01.wav"
        );
        this.phaserScene.load.once(
            "filecomplete-audio-timerFinishedSound",
            () => {
                this.timerFinishedSound =
                    this.phaserScene.sound.add("timerFinishedSound");
            }
        );

        this.phaserScene.load.start();
    }

    startTimer(duration: number) {
        if (!this.healthCheck()) {
            return; // Health check failed
        }

        if (this.timerStarted) {
            return; // Timer is already running
        }
        this.timerStarted = true;
        this.timerLeft = duration;
        this.timerText?.setText(`${this.timerLeft}`);
        this.timerText?.setVisible(true);

        this.timerTimer = this.phaserScene.time.addEvent({
            delay: 1000,
            callback: this.updateTimer,
            callbackScope: this,
            repeat: this.timerLeft - 1,
        });
    }

    private updateTimer() {
        if (!this.healthCheck()) {
            return; // Health check failed
        }

        this.timerLeft--;
        // display seconds
        this.timerText?.setText(`${this.timerLeft}`);
        this.timerText?.setVisible(true);

        if (this.timerLeft <= 0) {
            this.timerFinishedSound?.play();
            this.stopTimer(false);
        } else if (this.timerLeft <= 5 && !this.timerUrgencySound?.isPlaying) {
            this.timerText?.setColor("#ff0000"); // Change text color to red
            this.timerUrgencySound?.play();
        } else {
            this.timerText?.setColor("#ffffff"); // Reset text color to white
        }
    }

    stopTimer(interrupted: boolean = false) {
        if (!this.healthCheck()) {
            return; // Health check failed
        }

        if (!this.timerStarted) {
            return; // Timer is not running
        }
        this.timerTimer?.remove(false); // Stop the timer event
        console.log("Timer stopped");
        this.timerStarted = false;
        this.timerText?.setVisible(false);
        this.timerText?.setColor("#ffffff"); // Reset text color to white
        this.timerText?.setText(""); // Clear the text
        this.timerLeft = 0;

        if (interrupted) {
            this.phaserScene.events.emit("timerInterrupted");
        } else {
            console.log("Timer finished");
            this.phaserScene.events.emit("timerFinished");
        }
    }

    healthCheck(): boolean {
        if (!this.phaserScene) {
            console.warn("[UITimer] Phaser scene is not active or not defined");
            return false;
        }
        if (!this.timerText) {
            console.error("[UITimer] Timer text is not defined");
            return false;
        }

        return true;
    }
}

