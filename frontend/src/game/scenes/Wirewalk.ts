import { Scene } from "phaser";
import { LoadManifestFromJSON } from "../../modules/gameutils/LoadSpritesManifest";
import { PopupSprite } from "../../modules/gameutils/PopupSptire";
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import { GalleryThumbnailsIcon } from "lucide-react";

export class Wirewalk extends Scene {
    // Common settings
    private timer: UITimer;
    private countdown: UICountdown;
    private gameStartedTime: number;
    private gameMustEndTime: number;
    private gameDuration: number;
    private popupText: PopupText;
    private popupSprite: PopupSprite;

    // Game specific settings
    private textPool: Phaser.GameObjects.Group;
    private tiltValue: number;
    private tiltLimit: number = 1500;
    private tiltDiff: number;

    private gameStarted: boolean = false;
    private gameEnded: boolean = false;

    private buttonLeft: Phaser.GameObjects.Sprite;
    private buttonRight: Phaser.GameObjects.Sprite;
    private buttonLeftText: Phaser.GameObjects.Text;
    private buttonRightText: Phaser.GameObjects.Text;

    private wirewalk_fail: Phaser.Sound.BaseSound;
    private wirewalk_btn: Phaser.Sound.BaseSound;
    private wirewalk_bgm: Phaser.Sound.BaseSound;
    private player: Phaser.GameObjects.Sprite;

    private btn_left_tween: Phaser.Tweens.Tween;
    private btn_right_tween: Phaser.Tweens.Tween;

    constructor() {
        super("Wirewalk");
    }

    init() {
        this.gameStartedTime = 0;
        this.gameDuration = 20; // Default to 60 seconds if not provided
        this.tiltValue = Math.random() > 0.5 ? 1 : -1; // Randomly set tilt value to 1 or -1
        this.tiltDiff = 1;
        this.gameStarted = false;
        this.gameEnded = false;
        // this.gameMustEndTime = data.gameMustEndTime + this.gameDuration * 1000; // Convert to milliseconds
    }

    preload() {
        this.load.image("wirewalk_player", "assets/wirewalk/wirewalk_guy.png");
        this.load.image("wire", "assets/wirewalk/wire.png");
        this.load.audio(
            "wirewalk_fail",
            "assets/wirewalk/TECHINTERFACEComputerBeepsLong02.wav"
        );
        this.load.audio(
            "wirewalk_btn",
            "assets/wirewalk/VOCALEVILImpactHitOOOF03.wav"
        );
        this.load.audio("wirewalk_bgm", "assets/wirewalk/wirewalk_bgm.mp3");
        this.load.start();
    }

    create() {
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);
        this.textPool = this.add.group({
            classType: Phaser.GameObjects.Text,
            runChildUpdate: true,
            maxSize: 100,
            createCallback: (item: Phaser.GameObjects.GameObject) => {
                item.setActive(false);
                if (item instanceof Phaser.GameObjects.Text) {
                    item.setVisible(false);
                    item.setOrigin(0.5, 0.5);
                    item.setStyle({
                        fontSize: "64px",
                        fontFamily: "Jua",
                        color: "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                    });
                }
            },
        });

        // game specific settings

        // Fill the
        this.add
            .graphics()
            .fillStyle(0x87ceeb)
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        const x = this.cameras.main.centerX;
        const y = this.cameras.main.height;

        this.add.image(x, y - 100, "wire");
        this.player = this.add.sprite(x, y, "wirewalk_player");
        this.player.setOrigin(0.5, 1.0);
        this.player.setPosition(x, y);

        this.wirewalk_fail = this.sound.add("wirewalk_fail");
        this.wirewalk_btn = this.sound.add("wirewalk_btn");
        this.wirewalk_bgm = this.sound.add("wirewalk_bgm");

        this.events.on("countdownFinished", () => {
            this.startGame();
        });

        this.events.on("timerFinished", () => {
            this.endGame();
        });

        this.countdown.startCountdown(3);
    }

    startGame() {
        this.gameStartedTime = Date.now();
        this.timer.startTimer(this.gameDuration);
        this.gameStarted = true;
        this.gameEnded = false;

        this.wirewalk_bgm?.play({ loop: true });

        const buttonX1 = this.cameras.main.width / 4;
        const buttonX2 = (this.cameras.main.width * 3) / 4;
        const buttonY = this.cameras.main.centerY;

        this.buttonLeft = this.add
            .sprite(buttonX1, buttonY, "btn_blue")
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => {
                this.wirewalk_btn?.play();
                const realDiff = Math.floor(Math.log(this.tiltDiff + 3)) * 50;
                this.tiltValue -= realDiff;
                console.log(realDiff, this.tiltValue);
                if (!this.btn_left_tween || !this.btn_left_tween.isPlaying()) {
                    this.btn_left_tween = this.add.tween({
                        targets: this.buttonLeft,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 100,
                        ease: "Power1",
                        yoyo: true,
                        onComplete: () => {
                            this.buttonLeft.setScale(1);
                            this.btn_left_tween.remove();
                        },
                    });
                }
            });

        this.buttonLeftText = this.add
            .text(buttonX1, buttonY, "◀", {
                fontSize: "64px",
                fontFamily: "Jua",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5, 0.5);

        this.buttonRight = this.add
            .sprite(buttonX2, buttonY, "btn_blue")
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => {
                this.wirewalk_btn?.play();
                const realDiff = Math.floor(Math.log(this.tiltDiff + 3)) * 50;
                this.tiltValue += realDiff;

                if (
                    !this.btn_right_tween ||
                    !this.btn_right_tween.isPlaying()
                ) {
                    this.btn_right_tween = this.add.tween({
                        targets: this.buttonRight,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 100,
                        ease: "Power1",
                        yoyo: true,
                        onComplete: () => {
                            this.buttonRight.setScale(1);
                        },
                    });
                }
            });

        this.buttonRightText = this.add
            .text(buttonX2, buttonY, "▶", {
                fontSize: "64px",
                fontFamily: "Jua",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5, 0.5);
    }

    endGame() {
        this.timer.stopTimer(true);
        this.time.removeAllEvents();
        this.gameEnded = true;
        this.gameStarted = false;
        this.buttonLeft.destroy();
        this.buttonRight.destroy();
        this.buttonLeftText.destroy();
        this.buttonRightText.destroy();

        this.wirewalk_bgm?.stop();
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
        // Calculate score based on distance moved with logarithmic scaling
        const elapsedTime = Date.now() - this.gameStartedTime;
        const score = Math.min(
            100,
            (elapsedTime / (this.gameDuration * 1000)) * 100 + 10
        );
        return Math.floor(score);
    }

    result() {
        const elapsedTime = Date.now() - this.gameStartedTime;
        const finalScore = this.getFinalScore();

        // pop up result
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.start("GameOver", {
                    score: finalScore,
                    gameType: "Wirewalk",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }
        // Check if the game should end
        if (Math.abs(this.tiltValue) > this.tiltLimit) {
            const failText = this.add
                .text(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    "안 돼!",
                    {
                        fontSize: "128px",
                        fontFamily: "Jua",
                        color: "#ff0000",
                        align: "center",
                        stroke: "#000000",
                        strokeThickness: 2,
                    }
                )
                .setOrigin(0.5, 0.5);

            this.tweens.add({
                targets: failText,
                alpha: { from: 1, to: 0 },
                duration: 1000,
                ease: "Power1",
                onComplete: () => {
                    failText.destroy();
                },
            });
            this.wirewalk_fail?.play();
            this.endGame();
            return;
        }

        // Update the tilt value based on the tiltDiff
        const realDiff = Math.floor(Math.log(Math.abs(this.tiltValue)) + 1) * 2;
        if (this.tiltValue > 0) {
            this.tiltValue += realDiff;
        } else {
            this.tiltValue -= realDiff;
        }
        this.tiltDiff += 2;

        this.player.setRotation(
            ((this.tiltValue / this.tiltLimit) * 90 * Math.PI) / 180
        );
    }
}

