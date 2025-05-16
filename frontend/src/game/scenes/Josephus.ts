import { Scene } from "phaser";
import { LoadManifestFromJSON } from "../../modules/gameutils/LoadSpritesManifest";
import { PopupSprite } from "../../modules/gameutils/PopupSptire";
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import potgManager from "../../modules/POTGManager";

export class Josephus extends Scene {
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
    private josephusCount: number;
    private maxJosephusCount: number;
    private josephusIndex: number;
    private josephusList: Phaser.GameObjects.Sprite[];
    private josephusSet: Set<number>;
    private gameText: Phaser.GameObjects.Text;

    private josephus_alive: Phaser.Sound.BaseSound;
    private josephus_doomed: Phaser.Sound.BaseSound;
    private josephus_select: Phaser.Sound.BaseSound;
    private josephus_bgm: Phaser.Sound.BaseSound;

    constructor() {
        super("Josephus");
    }

    init() {
        this.gameStartedTime = 0;
        this.gameDuration = 30; // Default to 60 seconds if not provided
        this.gameStarted = false;
        this.gameEnded = false;
        this.maxJosephusCount = 8;
        this.josephusList = [];
        this.josephusSet = new Set<number>();
        // this.gameMustEndTime = data.gameMustEndTime + this.gameDuration * 1000; // Convert to milliseconds
    }

    preload() {
        // this.load.image("josephus", "assets/josephus/josephus.png");
        // this.load.audio(
        //     "josephus_alive",
        //     "assets/josephus/VOCALCUTECallHappy01.wav"
        // );
        // this.load.audio(
        //     "josephus_doomed",
        //     "assets/josephus/VOCALCUTEDistressPainShort12.wav"
        // );
        // this.load.audio(
        //     "josephus_select",
        //     "assets/josephus/VOCALCUTECallAffection07.wav"
        // );
        // this.load.audio("josephus_bgm", "assets/josephus/josephus_bgm.mp3");
        // this.load.start();
    }

    create() {
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);

        this.josephusCount = this.maxJosephusCount;
        this.add
            .graphics()
            .fillStyle(0xffa69e)
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        this.josephus_alive = this.sound.add("josephus_alive");
        this.josephus_doomed = this.sound.add("josephus_doomed");
        this.josephus_select = this.sound.add("josephus_select");
        this.josephus_bgm = this.sound.add("josephus_bgm");

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

        this.josephus_bgm?.play({ loop: true });

        // Arranging Josephus in a circle
        const radius = this.cameras.main.width / 2 - 75;
        for (let i = 0; i < this.josephusCount; i++) {
            const angle = (i / this.josephusCount) * Math.PI * 2;
            const x = this.cameras.main.centerX + Math.cos(angle) * radius;
            const y = this.cameras.main.centerY + Math.sin(angle) * radius;

            const sprite = this.add.sprite(x, y, "josephus");
            sprite.setOrigin(0.5, 0.5);
            sprite.setScale(0.3);

            sprite.setInteractive().on("pointerdown", () => {
                // if the game is not started or ended, do nothing
                if (this.josephusIndex !== -1) {
                    return;
                }

                this.josephus_select?.play();
                // mark as selected
                this.josephusIndex = i;
                sprite.setTint(0x00ff00); // Change color to green
                this.tweens.add({
                    targets: sprite,
                    duration: 500,
                    ease: "Power1",
                    yoyo: true,
                    repeat: -1,
                });

                this.time.addEvent({
                    delay: 2000,
                    callbackScope: this,
                    callback: this.josephusDoomed,
                });
            });

            this.josephusSet.add(i);
            this.josephusList.push(sprite);
        }

        this.gameText = this.add
            .text(
                this.cameras.main.centerX,
                (this.cameras.main.height * 4) / 5,
                "최후의 생존자는 누구?",
                {
                    fontFamily: "Jua",
                    fontSize: "72px",
                    color: "#ffffff",
                    align: "center",
                    stroke: "#000000",
                    strokeThickness: 2,
                    fontStyle: "bold",
                }
            )
            .setOrigin(0.5);

        this.add.tween({
            targets: this.gameText,
            scaley: 1.2,
            duration: 1000,
            ease: "Cubic",
            yoyo: true,
            repeat: -1,
        });

        // Start initial round
        this.anthorJosephusRound(-1);
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

        this.josephus_bgm?.stop();

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
        const score = Math.min(
            100,
            ((this.maxJosephusCount - this.josephusCount) * 100) /
                (this.maxJosephusCount - 1)
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
                    gameType: "Josephus",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }
    }

    anthorJosephusRound(loserIndex: number) {
        // A round of Josephus
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        // kill all tweens
        this.tweens.killAll();

        if (loserIndex !== -1) {
            // decrase the count
            this.josephusSet.delete(loserIndex);
            this.josephusCount--;
        }

        this.josephusIndex = -1;

        // only one Josephus left
        if (this.josephusCount === 1) {
            const winner = this.josephusList[0];
            this.tweens.add({
                targets: winner,
                duration: 100,
                ease: "Cubic",
                yoyo: true,
                repeat: -1,
            });

            this.gameText.setText("우승!!");

            this.endGame();
            return;
        }

        // Remaining Josephus
        const remainingJosephus = Array.from(this.josephusSet);
        for (let i = 0; i < this.josephusCount; i++) {
            const sprite = this.josephusList[remainingJosephus[i]];
            sprite.clearTint();
            this.tweens.add({
                targets: sprite,
                y: sprite.y - 20,
                duration: 1000,
                ease: "Cubic",
                yoyo: true,
                repeat: -1,
            });
        }
    }

    josephusDoomed() {
        // Judge if the selected Josephus is alive
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        this.tweens.killAll();

        // select randomly a Josephus and kill him
        const loserIndex = Array.from(this.josephusSet)[
            Math.floor(Math.random() * this.josephusSet.size)
        ];

        const remainingJosephus = Array.from(this.josephusSet);
        for (let k = 0; k < this.josephusCount; k++) {
            const i = remainingJosephus[k];
            if (i !== loserIndex) {
                this.add.tween({
                    targets: this.josephusList[i],
                    y: this.josephusList[i].y - 20,
                    duration: 100,
                    ease: "Cubic",
                    yoyo: true,
                    repeat: -1,
                });
            } else {
                // 90 degree rotation to radian
                this.josephusList[i].setAngle(90);
                this.josephusList[i].tint = 0xff0000; // Change color to red
                this.add.tween({
                    targets: this.josephusList[i],
                    y: this.josephusList[i].y - 20,
                    duration: 50,
                    ease: "Cubic",
                    yoyo: true,
                    repeat: -1,
                });

                // Explosion effect
                const posX = this.josephusList[i].x;
                const posY = this.josephusList[i].y;
                this.popupSprite.popupSprite("mine", posX, posY, 500);

                if (loserIndex === this.josephusIndex) {
                    this.josephus_doomed?.play();
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

                    this.gameText.setText("살아남지 못했다...");

                    this.endGame();
                    return;
                }
            }
        }

        this.josephus_alive?.play();
        this.popupText.popupText(
            "생존!!",
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            500,
            {
                fontSize: "128px",
                color: "#00ff00",
                stroke: "#000000",
                strokeThickness: 2,
                align: "center",
                fontFamily: "Jua",
                fontStyle: "bold",
            }
        );

        this.time.addEvent({
            delay: 1000,
            callbackScope: this,
            callback: () => {
                this.anthorJosephusRound(loserIndex);
            },
        });
    }
}

