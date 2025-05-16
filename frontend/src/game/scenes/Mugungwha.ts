import { Scene } from "phaser";
import { LoadManifestFromJSON } from "../../modules/gameutils/LoadSpritesManifest";
import { PopupSprite } from "../../modules/gameutils/PopupSptire";
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import potgManager from "../../modules/POTGManager";

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
    private maxDistance: number = 1000; // Maximum distance to achieve 100 points
    private background: Phaser.GameObjects.TileSprite;
    private player: Phaser.GameObjects.Sprite;
    private gameButton: Phaser.GameObjects.Sprite;
    private gameButtonText: Phaser.GameObjects.Text;
    private textPool: Phaser.GameObjects.Group;
    private watchingCounter: number;
    private isWatching: boolean;
    private mugungwha_pop: Phaser.Sound.BaseSound;
    private mugungwha_fail: Phaser.Sound.BaseSound;
    private mugungwha_01: Phaser.Sound.BaseSound;
    private mugungwha_02: Phaser.Sound.BaseSound;
    private mugungwha_03: Phaser.Sound.BaseSound;
    private mugungwha_bgm: Phaser.Sound.BaseSound;

    private alerLevel: number = 0;

    private btn_tween: Phaser.Tweens.Tween;

    constructor() {
        super("Mugungwha");
    }

    init() {
        this.gameStartedTime = 0;
        this.distanceMoved = 0;
        this.lastDistance = 0;
        this.gameDuration = 30; // Default to 60 seconds if not provided
        this.watchingCounter = 0;
        this.isWatching = true;
        this.alerLevel = 0;
        // this.gameMustEndTime = data.gameMustEndTime + this.gameDuration * 1000; // Convert to milliseconds
    }

    preload() {
        // LoadManifestFromJSON(this, "assets/mugungwha/manifest.json");
        // this.load.audio("mugungwha_pop", "assets/mugungwha/POPBrust01.wav");
        // this.load.audio(
        //     "mugungwha_fail",
        //     "assets/mugungwha/TECHINTERFACEComputerBeepsLong02.wav"
        // );
        // this.load.audio("mugungwha_01", "assets/mugungwha/mugungwha_01.mp3");
        // this.load.audio("mugungwha_02", "assets/mugungwha/mugungwha_02.mp3");
        // this.load.audio("mugungwha_03", "assets/mugungwha/mugungwha_03.mp3");
        // this.load.audio("mugungwha_bgm", "assets/mugungwha/mugungwha_bgm.mp3");
        // this.load.start();
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

        // game specific UI
        if (this.textures.exists("mugungwha_background")) {
            const bgTexture = this.textures.get("mugungwha_background");
            const bgHeight = this.cameras.main.height;
            const bgWidth =
                bgTexture.getSourceImage().width *
                (bgHeight / bgTexture.getSourceImage().height);

            this.background = this.add
                .tileSprite(0, 0, bgWidth, bgHeight, bgTexture.key)
                .setOrigin(0, 0);

            const bgRatio = bgHeight / bgTexture.getSourceImage().height;
            this.background.setTileScale(bgRatio, bgRatio);
        } else {
            console.warn("[Mugungwha] Background texture not found");
            this.cameras.main.setBackgroundColor("#abcdef");
        }

        this.mugungwha_pop = this.sound.add("mugungwha_pop", { loop: false });
        this.mugungwha_fail = this.sound.add("mugungwha_fail", { loop: false });
        this.mugungwha_01 = this.sound.add("mugungwha_01", { loop: false });
        this.mugungwha_02 = this.sound.add("mugungwha_02", { loop: false });
        this.mugungwha_03 = this.sound.add("mugungwha_03", { loop: false });
        this.mugungwha_bgm = this.sound.add("mugungwha_bgm", { loop: true });
        this.mugungwha_bgm?.play();

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

        if (this.textures.exists("mugungwha_player")) {
            const playerTexture = this.textures.get("mugungwha_player");
            const playerHeight = this.cameras.main.height / 4;
            const playerWidth =
                playerTexture.getSourceImage().width *
                (playerHeight / playerTexture.getSourceImage().height);

            this.player = this.add
                .sprite(
                    this.cameras.main.width / 4,
                    (this.cameras.main.height * 5) / 6,
                    playerTexture.key
                )
                .setOrigin(0.5, 0.5)
                .setScale(
                    playerWidth / playerTexture.getSourceImage().width,
                    playerHeight / playerTexture.getSourceImage().height
                );
        } else {
            console.warn("[Mugungwha] Player texture not found");
        }

        const buttonX = this.cameras.main.width / 2;
        const buttonY = this.cameras.main.height / 2;

        // Add the game button
        this.gameButton = this.add
            .sprite(buttonX, buttonY, "btn_green")
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => {
                if (this.isWatching) {
                    // If the player presses the button while watching, he loses
                    this.mugungwha_fail?.play();
                    this.popupText.popupText(
                        "앗!",
                        this.cameras.main.centerX,
                        this.cameras.main.centerY,
                        2000,
                        {
                            fontSize: "128px",
                            color: "#ff0000",
                            fontFamily: "Jua",
                            stroke: "#000000",
                            strokeThickness: 2,
                            align: "center",
                            fontStyle: "bold",
                        }
                    );
                    this.endGame();
                    return;
                }
                // If the player presses the button while not watching, he moves
                this.mugungwha_pop?.play();
                this.player.anims.play("mugungwha_player", true);
                this.distanceMoved += 1; // Simulate distance moved
                const randomX = Phaser.Math.Between(0, this.cameras.main.width);
                const randomY = Phaser.Math.Between(
                    0,
                    this.cameras.main.height
                );
                const curText = this.textPool.get(
                    randomX,
                    randomY
                ) as Phaser.GameObjects.Text;
                curText.setText(randomX % 2 == 0 ? "가자!" : "GO!");
                curText.rotation = Phaser.Math.DegToRad(
                    Phaser.Math.Between(0, 360)
                );
                curText.setTint(Phaser.Math.Between(0, 0xffffff));
                curText.setVisible(true);
                curText.setAlpha(1);
                this.tweens.add({
                    targets: curText,
                    alpha: { from: 1, to: 0 },
                    y: { from: randomY, to: randomY - 50 },
                    duration: 500,
                    ease: "Linear",
                    onComplete: () => {
                        if (this.textPool) {
                            this.textPool.killAndHide(curText);
                        }
                    },
                });

                if (!this.btn_tween || !this.btn_tween.isPlaying()) {
                    this.btn_tween = this.tweens.add({
                        targets: this.gameButton,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 100,
                        ease: "Power1",
                        yoyo: true,
                        repeat: 1,
                        onComplete: () => {
                            this.gameButton.setScale(1);
                            this.btn_tween.remove();
                        },
                    });
                }
            });
        this.gameButtonText = this.add
            .text(buttonX, buttonY, "GO!", {
                fontSize: "72px",
                fontFamily: "Fredoka",
                color: "#ffffff",
                align: "center",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 2,
            })
            .setOrigin(0.5, 0.5);

        this.isWatching = false;

        if (potgManager.getIsRecording()) {
            const clearBeforeStart = async () => {
                await potgManager.stopRecording();
                potgManager.startCanvasRecording();
            };
            clearBeforeStart();
        } else potgManager.startCanvasRecording();
    }

    endGame() {
        this.mugungwha_bgm?.stop();
        this.gameButton.destroy();
        this.gameButtonText.destroy();
        this.timer.stopTimer(true);
        this.time.removeAllEvents();

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
        const score = Math.min(
            100,
            (Math.log(this.distanceMoved + 1) /
                Math.log(this.maxDistance + 1)) *
                100
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
                    gameType: "Mugungwha",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (this.background) {
            const diffDistance = this.distanceMoved - this.lastDistance;
            this.background.tilePositionX += diffDistance * 20;
        }
        this.lastDistance = this.distanceMoved;

        // Update internal counter if not watching
        if (!this.isWatching) {
            this.watchingCounter += Phaser.Math.Between(0, 2);
            // Display alert messages based on the watchingCounter
            if (this.watchingCounter > 250 && this.alerLevel < 1) {
                this.alerLevel = 1;
                this.mugungwha_01?.play();

                this.popupText.popupText(
                    "무궁화...",
                    this.cameras.main.centerX,
                    this.cameras.main.centerY / 2,
                    500,
                    {
                        fontSize: "128px",
                        color: "#00ff00",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                        fontFamily: "Jua",
                    }
                );
            }

            if (this.watchingCounter > 500 && this.alerLevel < 2) {
                this.alerLevel = 2;
                this.mugungwha_02?.play();

                this.popupText.popupText(
                    "꽃이...",
                    this.cameras.main.centerX,
                    this.cameras.main.centerY / 2,
                    1000,
                    {
                        fontSize: "128px",
                        color: "#ffff00",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                        fontFamily: "Jua",
                    }
                );
            }
            // If alert level 3 is reached, change the button color and play sound
            if (this.watchingCounter > 1000 && this.alerLevel < 3) {
                this.isWatching = true;
                this.gameButton.tint = 0xff0000;
                this.alerLevel = 3;
                this.mugungwha_03?.play();

                this.popupText.popupText(
                    "피었습니다!",
                    this.cameras.main.centerX,
                    this.cameras.main.centerY / 2,
                    1000,
                    {
                        fontSize: "128px",
                        color: "#ff0000",
                        stroke: "#000000",
                        strokeThickness: 2,
                        align: "center",
                        fontFamily: "Jua",
                    }
                );

                this.gameButtonText.setText("STOP!");
                // Reset the button color after 2 seconds
                this.time.addEvent({
                    delay: 2000,
                    callback: () => {
                        this.gameButton.tint = 0xffffff;
                        this.isWatching = false;
                        this.watchingCounter = 0;
                        this.alerLevel = 0;
                        this.gameButtonText.setText("GO!");
                    },
                });
            }
        }
    }
}

