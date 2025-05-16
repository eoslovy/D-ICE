import { Scene } from "phaser";
import { LoadManifestFromJSON } from "../../modules/gameutils/LoadSpritesManifest";
import { PopupSprite } from "../../modules/gameutils/PopupSptire";
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import { ArrowRightSquare } from "lucide-react";
import potgManager from "../../modules/POTGManager";

export class Clicker extends Scene {
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

    // Target management
    private targets: Phaser.GameObjects.Group;
    private targetColors: number[] = [
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff,
    ];
    private targetPoints: number[] = [-3, 1, 3, 5, 10];
    private collectedScore: number = 0;

    private clicker_bgm: Phaser.Sound.BaseSound;
    private clicker_good: Phaser.Sound.BaseSound;
    private clicker_fail: Phaser.Sound.BaseSound;

    constructor() {
        super("Clicker");
    }

    init() {
        // Reset all game state variables
        this.collectedScore = 0;
        this.gameStarted = false;
        this.gameEnded = false;
        this.gameDuration = 20;

        // Clear any Phaser timer events
        this.time.removeAllEvents();
    }

    preload() {
        // this.load.audio("clicker_bgm", "assets/clicker/clicker_bgm.mp3");
        // this.load.audio(
        //     "clicker_good",
        //     "assets/clicker/SUCCESSPICKUPCollectBeep04.wav"
        // );
        // this.load.audio(
        //     "clicker_fail",
        //     "assets/clicker/NEGATIVEFailureBeeps04.wav"
        // );
    }

    create() {
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);
        // Setup camera and background

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.graphics().fillStyle(0x4d5057).fillRect(0, 0, width, height);

        const square = this.make.graphics();
        square.fillStyle(0xffffff, 1);
        square.fillRect(0, 0, 30, 30);
        square.generateTexture("square", 30, 30);

        this.targets = this.add.group();

        this.clicker_bgm = this.sound.add("clicker_bgm");
        this.clicker_good = this.sound.add("clicker_good");
        this.clicker_fail = this.sound.add("clicker_fail");

        // Listen for events from countdown and timer
        this.events.on("countdownFinished", () => {
            this.startGame();
        });

        this.events.on("timerFinished", () => {
            this.endGame();
        });

        // Start countdown
        this.countdown.startCountdown(3);
    }

    startGame() {
        if (this.gameStarted || this.gameEnded) return;

        // Start game timer via UITimer
        this.gameStartedTime = Date.now();
        this.gameStarted = true;
        this.gameEnded = false;
        this.timer.startTimer(this.gameDuration);

        this.clicker_bgm?.play({ loop: true });
        // Start spawning targets
        this.spawnTarget();

        // Set interval for target spawning
        this.time.addEvent({
            delay: 700,
            callback: this.spawnTarget,
            callbackScope: this,
            loop: true,
        });

        this.time.addEvent({
            delay: 1000,
            callback: this.spawnTarget,
            callbackScope: this,
            loop: true,
        });

        if (potgManager.getIsRecording()) {
            const clearBeforeStart = async () => {
                await potgManager.stopRecording();
                potgManager.startCanvasRecording();
            };
            clearBeforeStart();
        } else potgManager.startCanvasRecording();
    }

    spawnTarget() {
        // Spawn a target at a random position
        if (!this.gameStarted || this.gameEnded) return;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(100, height - 200);

        const size = Phaser.Math.Between(50, 100);

        const typeIndex = Phaser.Math.Between(0, this.targetColors.length - 1);
        const points = this.targetPoints[typeIndex];
        const color = this.targetColors[typeIndex];

        const target = this.add
            .circle(x, y, size, color)
            .setInteractive()
            .setData("points", points)
            .setData("scale", Phaser.Math.Between(0.5, 1))
            .setAlpha(0);

        this.tweens.add({
            targets: target,
            alpha: 1,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            repeat: -1,
        });

        this.time.delayedCall(2000, () => {
            if (target.active) {
                this.tweens.add({
                    targets: target,
                    alpha: 0,
                    scale: 0.5,
                    duration: 300,
                    onComplete: () => {
                        target.destroy();
                    },
                });
            }
        });

        target.on("pointerdown", () => {
            this.clickTarget(target);
        });

        this.targets.add(target);
    }

    clickTarget(target: Phaser.GameObjects.Arc) {
        // Handle target click
        if (!target.active || !this.gameStarted || this.gameEnded) return;

        const points = target.getData("points");

        this.collectedScore += points;

        this.createParticleEffect(target.x, target.y, target.fillColor);

        // Case work for points
        if (points < 0) {
            this.clicker_fail?.play();
            this.popupText.popupText(
                `-${Math.abs(points)}`,
                target.x,
                target.y,
                800,
                {
                    fontSize: "80px",
                    color: "#ff0000",
                    stroke: "#000000",
                    strokeThickness: 2,
                    align: "center",
                    fontFamily: "Jua",
                    fontStyle: "bold",
                }
            );
        } else {
            this.clicker_good?.play();
            this.popupText.popupText(`+${points}`, target.x, target.y, 800, {
                fontSize: "80px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
                align: "center",
                fontFamily: "Jua",
                fontStyle: "bold",
            });
        }

        this.tweens.add({
            targets: target,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                target.destroy();
            },
        });
    }

    createParticleEffect(x: number, y: number, color: number) {
        // Create a particle effect at the target's position
        const emitter = this.add.particles(x, y, "square", {
            speed: 200,
            lifespan: 800,
            scale: { start: 1, end: 0 },
            blendMode: "ADD",
            quantity: 2,
            angle: { min: 0, max: 360 },
            tint: color,
        });

        emitter.start();
        this.time.delayedCall(100, () => {
            emitter.stop();
            this.time.delayedCall(500, () => {
                emitter.destroy();
            });
        });
    }

    endGame() {
        if (this.gameEnded) return;

        this.gameStarted = false;
        this.gameEnded = true;
        this.timer.stopTimer(true);
        this.time.removeAllEvents();
        this.clicker_bgm?.stop();
        this.targets.clear(true, true);
        this.tweens.killAll();

        this.popupText.popupText(
            "Time's Up!",
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            1000,
            {
                fontSize: "80px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
                align: "center",
                fontFamily: "Fredoka",
                fontStyle: "bold",
            }
        );

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.popupText.popupText(
                    "Game Over",
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    2000,
                    {
                        fontSize: "128px",
                        color: "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                        fontFamily: "Fredoka",
                        fontStyle: "bold",
                    }
                );
                this.result();
            },
        });
    }

    getFinalScore() {
        // Max Score is 100 points for maxDistance
        // Calculate score based on this.collectedScore with logarithmic scaling
        // collected Score 150 is 100 points
        const score = Math.min(
            100,
            (Math.log(this.collectedScore + 1) * 100) / Math.log(512)
        );
        return Math.floor(score);
    }

    result() {
        const elapsedTime = Date.now() - this.gameStartedTime;
        const finalScore = this.getFinalScore();

        if (potgManager.getIsRecording()) {
            potgManager.stopRecording();
        }

        // pop up result
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.start("GameOver", {
                    score: finalScore,
                    gameType: "Clicker",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }
    }
}

