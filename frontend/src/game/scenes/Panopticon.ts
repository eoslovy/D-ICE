import { Scene } from "phaser";
import { LoadManifestFromJSON } from "../../modules/gameutils/LoadSpritesManifest";
import { PopupSprite } from "../../modules/gameutils/PopupSptire";
import { PopupText } from "../../modules/gameutils/PopupText";
import { UITimer } from "../../modules/gameutils/UITimer";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import potgManager from "../../modules/POTGManager";

export class Panopticon extends Scene {
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

    private gazeAngle: number;
    private gazeDiff: number;
    private prisonersCount: number = 8;
    private prisoners: Phaser.GameObjects.Container[] = [];
    private prisonerAlerts: number[] = [];
    private prisonerLevels: number[] = [];
    private jailTweens: Phaser.Tweens.Tween[] = [];
    private prisonerMaxAlert: number = 5000;
    private tower: Phaser.GameObjects.Sprite;
    private towerLight: Phaser.GameObjects.Graphics;
    private towerLightRange: number;

    private buttonLeft: Phaser.GameObjects.Sprite;
    private buttonRight: Phaser.GameObjects.Sprite;
    private buttonLeftText: Phaser.GameObjects.Text;
    private buttonRightText: Phaser.GameObjects.Text;

    private panopticon_bgm: Phaser.Sound.BaseSound;
    private panopticon_fail: Phaser.Sound.BaseSound;

    constructor() {
        super("Panopticon");
    }

    init() {
        this.gameStartedTime = 0;
        this.gameDuration = 20; // Default to 60 seconds if not provided
        this.gameStarted = false;
        this.gameEnded = false;
        this.gazeAngle = 0;
        this.gazeDiff = 0;
        this.prisoners = [];
        this.towerLightRange = 120;
        // this.gameMustEndTime = data.gameMustEndTime + this.gameDuration * 1000; // Convert to milliseconds
    }

    preload() {
        LoadManifestFromJSON(this, "assets/panopticon/manifest.json");
        this.load.audio(
            "panopticon_bgm",
            "assets/panopticon/panopticon_bgm.mp3"
        );
        this.load.audio(
            "panopticon_fail",
            "assets/panopticon/TECHINTERFACEComputerBeepsLong02.wav"
        );
        this.load.start();
    }

    create() {
        this.timer = new UITimer(this);
        this.countdown = new UICountdown(this);
        this.popupText = new PopupText(this);
        this.popupSprite = new PopupSprite(this);

        this.panopticon_bgm = this.sound.add("panopticon_bgm", {
            loop: true,
        });
        // Fill the Background with a color
        if (this.textures.exists("panopticon_bg")) {
            this.add
                .image(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    "panopticon_bg"
                )
                .setOrigin(0.5, 0.5)
                .setScale(
                    this.cameras.main.width /
                        this.textures.get("panopticon_bg").getSourceImage()
                            .width,
                    this.cameras.main.height /
                        this.textures.get("panopticon_bg").getSourceImage()
                            .height
                );
        } else {
            this.add
                .rectangle(
                    this.cameras.main.centerX,
                    this.cameras.main.centerY,
                    this.cameras.main.width,
                    this.cameras.main.height,
                    0x000000
                )
                .setOrigin(0.5, 0.5);
        }

        this.panopticon_fail = this.sound.add("panopticon_fail");

        this.tower = this.add.sprite(
            this.cameras.main.centerX,
            (this.cameras.main.centerY * 3) / 4,
            "panopticon_tower"
        );
        this.tower.setOrigin(0.5, 0.25);
        this.tower.setScale(0.75);

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

        this.panopticon_bgm?.play();

        const centerY = (this.cameras.main.centerY * 3) / 4;

        const radius = 250;
        for (let i = 0; i < this.prisonersCount; i++) {
            const angle = Phaser.Math.DegToRad((360 / this.prisonersCount) * i);
            const prisonerX =
                this.cameras.main.centerX + radius * Math.cos(angle);
            const prisonerY = centerY + radius * Math.sin(angle);

            const prisonerContainer = this.add.container(prisonerX, prisonerY);

            const prisonserSprite = this.add.sprite(
                0,
                0,
                `panopticon_prisoner_${Phaser.Math.Between(1, 2)}`
            );
            prisonserSprite.setOrigin(0.5, 0.5);
            prisonserSprite.setScale(0.25);
            if (prisonerX > this.cameras.main.centerX) {
                prisonserSprite.setFlipX(true);
            }
            prisonerContainer.add(prisonserSprite);

            const jailSprite = this.add.sprite(0, 0, "panopticon_jail");
            jailSprite.setOrigin(0.5, 0.5);
            jailSprite.setScale(0.25);
            prisonerContainer.add(jailSprite);

            // set the angle date of prisonerContainer
            prisonerContainer.setData("angle", Phaser.Math.RadToDeg(angle));
            prisonerContainer.setData("internalRandom", Math.random());

            this.prisoners.push(prisonerContainer);
            this.jailTweens.push(
                this.tweens.add({
                    targets: jailSprite,
                    scaleY: { from: 0.25, to: 0.25 },
                    duration: 100,
                    ease: "Power1",
                    yoyo: true,
                    repeat: -1,
                })
            );
            this.prisonerAlerts.push(0);
            this.prisonerLevels.push(0);
        }

        // tower light is sector
        // set its origin to the angle of the sector
        this.towerLight = this.add.graphics(); // Initialize the Graphics object

        const buttonX1 = this.cameras.main.width / 4;
        const buttonX2 = (this.cameras.main.width * 3) / 4;
        const buttonY = (this.cameras.main.height * 3) / 4;

        this.buttonLeft = this.add
            .sprite(buttonX1, buttonY, "btn_blue")
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => {
                this.gazeDiff -= 1;
                this.add.tween({
                    targets: this.buttonLeft,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 100,
                    ease: "Power1",
                    yoyo: true,
                    onComplete: () => {
                        this.buttonLeft.setScale(1);
                    },
                });
            })
            .on("pointerup", () => {
                this.gazeDiff += 1;
            });

        this.buttonLeftText = this.add
            .text(buttonX1, buttonY, "◀", {
                fontSize: "64px",
                fontFamily: "Jua",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5, 0.5);

        // if pressed the button, the gazeDiff will be increased
        // release the button, the gazeDiff will decrease
        this.buttonRight = this.add
            .sprite(buttonX2, buttonY, "btn_blue")
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on("pointerdown", () => {
                this.gazeDiff += 1;
                this.add.tween({
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
            })
            .on("pointerup", () => {
                this.gazeDiff -= 1;
            });

        this.buttonRightText = this.add
            .text(buttonX2, buttonY, "▶", {
                fontSize: "64px",
                fontFamily: "Jua",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5, 0.5);

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
        this.buttonLeft.destroy();
        this.buttonRight.destroy();
        this.buttonLeftText.destroy();
        this.buttonRightText.destroy();

        this.panopticon_bgm?.stop();

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

        if (potgManager.getIsRecording()) {
            potgManager.stopRecording();
        }

        // pop up result
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.start("GameOver", {
                    score: finalScore,
                    gameType: "Panopticon",
                });
            },
        });
    }

    update(time: number, delta: number) {
        if (!this.gameStarted || this.gameEnded) {
            return;
        }

        if (this.gazeDiff !== 0) {
            this.gazeAngle += this.gazeDiff;
        }
        if (this.gazeAngle < 0) {
            this.gazeAngle += 360;
        } else if (this.gazeAngle > 360) {
            this.gazeAngle -= 360;
        }

        this.towerLightRange -= delta / 128;
        if (this.towerLightRange < 20) {
            this.towerLightRange = 20;
        }
        const curRange = Math.floor(this.towerLightRange);

        // Update Graphics object by clearing and redrawing the pie slice
        this.towerLight.clear(); // Clear the previous frame's drawing
        this.towerLight.fillStyle(0xffff00, 0.5); // Set fill style (yellow, semi-transparent)

        // Define the properties for the pie slice
        const towerLightX = this.cameras.main.centerX; // X-coordinate of the pie's apex
        const towerLightY = (this.cameras.main.centerY * 3) / 4; // Y-coordinate of the pie's apex
        const towerLightRadius = 250; // Radius of the pie slice

        // Calculate the start and end angles for the slice in degrees
        // this.gazeAngle is the center direction of the light, curRange is its angular width
        const startAngleDeg = this.gazeAngle;
        const endAngleDeg = this.gazeAngle + curRange;

        // Use the slice method to draw a pie shape. Angles need to be in radians.
        this.towerLight.slice(
            towerLightX, // x-coordinate of the center (apex of the pie)
            towerLightY, // y-coordinate of the center (apex of the pie)
            towerLightRadius, // Radius of the pie
            Phaser.Math.DegToRad(startAngleDeg), // Start angle in radians
            Phaser.Math.DegToRad(endAngleDeg), // End angle in radians
            false // Draw clockwise
        );
        this.towerLight.fillPath(); // Fill the drawn pie shape

        for (let i = 0; i < this.prisoners.length; i++) {
            const angle = this.prisoners[i].getData("angle");
            const internalRandom = this.prisoners[i].getData("internalRandom");
            const jailSprite = this.prisoners[i].getAt(
                1
            ) as Phaser.GameObjects.Sprite;

            if (this.prisonerAlerts[i] > this.prisonerMaxAlert) {
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
                this.panopticon_fail?.play();
                jailSprite.destroy();
                this.endGame();

                return;
            }

            const newAlert =
                (this.gazeAngle < angle && this.gazeAngle + curRange > angle) ||
                this.gazeAngle + curRange > angle + 360
                    ? Math.max(0, this.prisonerAlerts[i] - delta * 5)
                    : this.prisonerAlerts[i] + delta * internalRandom;

            const newLevel = Math.floor((newAlert / this.prisonerMaxAlert) * 4);

            this.prisonerAlerts[i] = newAlert;

            const tintColor = Phaser.Display.Color.GetColor(
                255,
                Phaser.Math.Linear(
                    0,
                    255,
                    (this.prisonerMaxAlert - newAlert) / this.prisonerMaxAlert
                ),
                Phaser.Math.Linear(
                    0,
                    255,
                    (this.prisonerMaxAlert - newAlert) / this.prisonerMaxAlert
                )
            );
            jailSprite.setTint(tintColor);

            this.prisonerLevels[i] = newLevel;
            if (newLevel > 1) {
                this.jailTweens[i] = this.tweens.add({
                    targets: jailSprite,
                    x: { from: -newLevel * 2, to: newLevel * 2 },
                    scaleY: { from: 0.25, to: 0.255 },
                    duration: 100,
                    ease: "Power1",
                    onStop: () => {
                        jailSprite.setX(0);
                        jailSprite.setScale(0.25);
                        this.jailTweens[i].remove();
                    },
                    yoyo: true,
                    repeat: newLevel - 1,
                });
            }
        }
    }
}

