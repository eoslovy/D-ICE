import { Scene } from "phaser";
import { LoadManifestFromJSON } from "../../modules/gameutils/LoadSpritesManifest";
import { PopupSprite } from "../../modules/gameutils/PopupSptire";
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import potgManager from "../../modules/POTGManager";

export class Knight extends Scene {
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
    private slashButton: Phaser.GameObjects.Sprite;
    private slashButtonText: Phaser.GameObjects.Text;
    private parryButton: Phaser.GameObjects.Sprite;
    private parryButtonText: Phaser.GameObjects.Text;

    private slashCooldown: number = 300;
    private parryCooldown: number = 700;

    private lastSlashTime: number;
    private lastParryTime: number;

    private player: Phaser.GameObjects.Sprite;
    private playerPositionX: number = 200;
    private judgeDifference: number = 150;

    private challengeContainer: Phaser.GameObjects.Container;

    private internalHealth: number;
    private internalScore: number;

    private knight_bgm: Phaser.Sound.BaseSound;
    private knight_slash: Phaser.Sound.BaseSound;
    private knight_parry: Phaser.Sound.BaseSound;
    private knight_hit: Phaser.Sound.BaseSound;
    private knight_fail: Phaser.Sound.BaseSound;

    constructor() {
        super("Knight");
    }

    init() {
        this.gameStartedTime = 0;
        this.gameDuration = 20; // Default to 60 seconds if not provided
        this.gameStarted = false;
        this.gameEnded = false;
        this.lastSlashTime = 0;
        this.lastParryTime = 0;
        this.internalScore = 0;
        this.internalHealth = 3;
        // this.gameMustEndTime = data.gameMustEndTime + this.gameDuration * 1000; // Convert to milliseconds
    }

    preload() {
        this.load.audio("knight_bgm", "assets/knight/knight_bgm.mp3");
        this.load.audio(
            "knight_slash",
            "assets/knight/IMPACTMetalBladeClang01.wav"
        );
        this.load.audio(
            "knight_parry",
            "assets/knight/IMPACTMetalBladeChink07.wav"
        );
        this.load.audio(
            "knight_hit",
            "assets/knight/IMPACTMetalHitShort 03.wav"
        );
        this.load.audio(
            "knight_fail",
            "assets/knight/NEGATIVEFailure DescendingBellRun02.wav"
        );
        LoadManifestFromJSON(this, "assets/knight/manifest.json");
    }

    create() {
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);

        if (this.textures.exists("knight_bg")) {
            this.add
                .image(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    "knight_bg"
                )
                .setScale(1.5)
                .setOrigin(0.5, 0.5);
        } else {
            this.add
                .graphics()
                .fillStyle(0xebebd3, 0.5)
                .fillRect(
                    0,
                    0,
                    this.cameras.main.width,
                    this.cameras.main.height
                );
        }
        this.knight_bgm = this.sound.add("knight_bgm");
        this.knight_slash = this.sound.add("knight_slash");
        this.knight_parry = this.sound.add("knight_parry");
        this.knight_hit = this.sound.add("knight_hit");
        this.knight_fail = this.sound.add("knight_fail");

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

        this.knight_bgm.play({
            loop: true,
        });

        const alignmentY = (this.cameras.main.centerY * 3) / 4;
        this.player = this.add
            .sprite(this.playerPositionX, alignmentY, "knight_idle")
            .setOrigin(0.5, 0.5)
            .setScale(3.0);
        this.player.anims.play("knight_idle", true);
        this.player.on("animationcomplete", () => {
            this.player.anims.play("knight_idle", true);
        });

        this.challengeContainer = this.add.container(0, alignmentY);

        const buttonLeftX = this.cameras.main.width / 4;
        const buttonRightX = (this.cameras.main.width * 3) / 4;
        const buttonY = (this.cameras.main.height * 3) / 4;

        this.slashButton = this.add
            .sprite(buttonLeftX, buttonY, "btn_blue")
            .setInteractive()
            .setOrigin(0.5, 0.5);

        this.slashButtonText = this.add
            .text(buttonLeftX, buttonY, "Slash", {
                fontSize: "64px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
                align: "center",
                fontFamily: "Fredoka",
                fontStyle: "bold",
            })
            .setOrigin(0.5, 0.5);

        this.slashButton.on("pointerdown", () => {
            this.attemptSlash();
            this.add.tween({
                targets: this.slashButton,
                scale: 1.2,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    this.slashButton.setScale(1);
                },
            });
        });

        this.parryButton = this.add
            .sprite(buttonRightX, buttonY, "btn_red")
            .setInteractive()
            .setOrigin(0.5, 0.5);

        this.parryButtonText = this.add
            .text(buttonRightX, buttonY, "Parry", {
                fontSize: "64px",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2,
                align: "center",
                fontFamily: "Fredoka",
                fontStyle: "bold",
            })
            .setOrigin(0.5, 0.5);

        this.parryButton.on("pointerdown", () => {
            this.attemptParry();
            this.add.tween({
                targets: this.parryButton,
                scale: 1.2,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    this.parryButton.setScale(1);
                },
            });
        });

        this.slashChallenge();
        this.parryChallenge();

        if (potgManager.getIsRecording()) {
            const clearBeforeStart = async () => {
                await potgManager.stopRecording();
                potgManager.startCanvasRecording();
            };
            clearBeforeStart();
        } else potgManager.startCanvasRecording();
    }

    endGame() {
        this.timer.stopTimer(true);
        this.time.removeAllEvents();
        this.gameEnded = true;
        this.gameStarted = false;

        this.knight_bgm?.stop();
        this.slashButton.destroy();
        this.slashButtonText.destroy();
        this.parryButton.destroy();
        this.parryButtonText.destroy();

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
        // Max Score is 100 points
        const elapsedTime = Date.now() - this.gameStartedTime;
        // Killed Josephus count is the score
        const score = Math.min(100, this.internalScore);
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
                    gameType: "Knight",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        this.challengeContainer.x -= Math.ceil((delta * 2) / 3);
        const leftmostChallenge = this.challengeContainer.getAt(0);

        if (leftmostChallenge instanceof Phaser.GameObjects.Sprite) {
            const worldPoint = leftmostChallenge.getWorldPoint();
            if (worldPoint.x < this.playerPositionX) {
                leftmostChallenge.destroy();
                this.popupSprite.popupSprite(
                    "explosion",
                    worldPoint.x,
                    worldPoint.y,
                    500
                );
                this.knightHit();
            }
        }
    }

    knightHit() {
        this.internalHealth--;
        this.knight_hit?.play();
        this.player.anims.play("knight_hurt", true);

        this.add.tween({
            targets: this.player,
            tint: 0x750000,
            duration: 200,
            ease: "Power2",
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.player.clearTint();
            },
        });

        if (this.internalHealth <= 0) {
            this.knight_fail?.play();

            this.popupText.popupText(
                "앗!",
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                1000,
                {
                    fontSize: "128px",
                    color: "#ff0000",
                    stroke: "#000000",
                    strokeThickness: 2,
                    align: "center",
                    fontFamily: "Jua",
                    fontStyle: "bold",
                }
            );

            this.player.removeAllListeners();
            this.player.anims.play("knight_dead", true);
            this.endGame();
        }
    }

    attemptSlash() {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        if (Date.now() - this.lastSlashTime < this.slashCooldown) {
            return;
        }

        this.lastSlashTime = Date.now();

        const leftmostChallenge = this.challengeContainer.getAt(0);

        this.player.anims.play("knight_attack_2", true);
        if (leftmostChallenge instanceof Phaser.GameObjects.Sprite) {
            const worldPoint = leftmostChallenge.getWorldPoint();
            const challengeType = leftmostChallenge.getData("challengeType");
            if (
                challengeType === "slash" &&
                Math.abs(worldPoint.x - this.playerPositionX) <
                    this.judgeDifference
            ) {
                this.knight_slash?.play();
                this.challengeContainer.remove(leftmostChallenge, true);

                this.internalScore += 5;

                const knightSlash = this.add
                    .sprite(worldPoint.x, worldPoint.y, "knight_slash")
                    .setOrigin(0.5, 0.5)
                    .setScale(0.5);

                knightSlash.anims.play("knight_slash", true);
                knightSlash.on("animationcomplete", () => {
                    knightSlash.destroy();
                });
            }
        }
    }

    attemptParry() {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        if (Date.now() - this.lastParryTime < this.parryCooldown) {
            return;
        }

        this.lastParryTime = Date.now();

        const leftmostChallenge = this.challengeContainer.getAt(0);

        this.player.anims.play("knight_defend", true);
        if (leftmostChallenge instanceof Phaser.GameObjects.Sprite) {
            const worldPoint = leftmostChallenge.getWorldPoint();
            const challengeType = leftmostChallenge.getData("challengeType");
            if (
                challengeType === "parry" &&
                Math.abs(worldPoint.x - this.playerPositionX) <
                    this.judgeDifference
            ) {
                this.knight_parry?.play();

                this.challengeContainer.remove(leftmostChallenge, true);
                leftmostChallenge.destroy();

                this.internalScore += 8;

                const knightParry = this.add
                    .sprite(worldPoint.x, worldPoint.y, "knight_parry")
                    .setOrigin(0.5, 0.5)
                    .setScale(0.5);

                knightParry.anims.play("knight_parry", true);
                knightParry.on("animationcomplete", () => {
                    knightParry.destroy();
                });
            }
        }
    }

    slashChallenge() {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }
        this.time.addEvent({
            delay: this.slashCooldown + Phaser.Math.Between(500, 1200),
            callback: () => {
                const elapsedTime = Date.now() - this.gameStartedTime;
                const adjustedX = elapsedTime + this.cameras.main.width;
                const challenge = this.add
                    .sprite(adjustedX, 0, "slash_challenge")
                    .setOrigin(0.25, 0.5)
                    .setScale(0.3)
                    .setData("challengeType", "slash")
                    .setPosition(adjustedX, 0);
                this.challengeContainer.add(challenge);
                this.slashChallenge();
            },

            callbackScope: this,
            loop: false,
        });
    }

    parryChallenge() {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }
        this.time.addEvent({
            delay: this.parryCooldown + Phaser.Math.Between(500, 1800),
            callback: () => {
                const elapsedTime = Date.now() - this.gameStartedTime;
                const adjustedX = elapsedTime + this.cameras.main.width;
                const challenge = this.add
                    .sprite(adjustedX, 0, "parry_challenge")
                    .setOrigin(0.25, 0.5)
                    .setScale(0.3)
                    .setData("challengeType", "parry")
                    .setPosition(adjustedX, 0);
                this.challengeContainer.add(challenge);

                this.parryChallenge();
            },
            callbackScope: this,
            loop: false,
        });
    }
}

