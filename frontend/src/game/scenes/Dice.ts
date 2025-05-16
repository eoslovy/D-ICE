import Phaser from "phaser";
import potgManager from "../../modules/POTGManager";

export class Dice extends Phaser.Scene {
    private diceRollFunctions: any[] = [];
    private diceTexts: Phaser.GameObjects.Text[] = [];
    private totalSumText!: Phaser.GameObjects.Text;
    private rollCount: number = 0;
    private currentRollSum: number = 0;
    private isRolling: boolean = false;
    private diceSound!: Phaser.Sound.BaseSound;
    private totalSumSound!: Phaser.Sound.BaseSound;
    private diceBgm!: Phaser.Sound.BaseSound;
    private rollDuration = 2500;
    private countdownTimer: Phaser.Time.TimerEvent | null = null;
    private TimerCount = 5;

    constructor() {
        super("Dice");
    }

    // 개별 주사위 생성 함수
    private createDice(
        x: number,
        y: number,
        scene: any,
        duration = 1000,
        scale: number
    ) {
        let diceIsRolling = false;

        const dice = this.add.mesh(x, y, "dice-albedo");
        const shadowFX = dice.postFX.addShadow(
            0,
            0,
            0.006,
            2,
            0x111111,
            10,
            0.8
        );

        dice.addVerticesFromObj("dice-obj", 0.25 * scale);
        dice.panZ(10 * scale); // 크기 조절

        dice.modelRotation.x = Phaser.Math.DegToRad(0);
        dice.modelRotation.y = Phaser.Math.DegToRad(-90);

        return (callback: any) => {
            if (!diceIsRolling) {
                diceIsRolling = true;
                const diceRoll = Phaser.Math.Between(1, 6);

                // Shadow
                scene.add.tween({
                    targets: shadowFX,
                    x: -8,
                    y: 10,
                    duration: duration - 250,
                    ease: "Sine.easeInOut",
                    yoyo: true,
                });

                scene.add.tween({
                    targets: dice,
                    from: 0,
                    to: 1,
                    duration: duration,
                    onUpdate: () => {
                        // rotation 속도 조절
                        dice.modelRotation.x -= 0.07;
                        dice.modelRotation.y -= 0.13;
                    },
                    onComplete: () => {
                        switch (diceRoll) {
                            case 1:
                                dice.modelRotation.x = Phaser.Math.DegToRad(0);
                                dice.modelRotation.y =
                                    Phaser.Math.DegToRad(-90);
                                break;
                            case 2:
                                dice.modelRotation.x = Phaser.Math.DegToRad(90);
                                dice.modelRotation.y = Phaser.Math.DegToRad(0);
                                break;
                            case 3:
                                dice.modelRotation.x =
                                    Phaser.Math.DegToRad(180);
                                dice.modelRotation.y = Phaser.Math.DegToRad(0);
                                break;
                            case 4:
                                dice.modelRotation.x =
                                    Phaser.Math.DegToRad(180);
                                dice.modelRotation.y =
                                    Phaser.Math.DegToRad(180);
                                break;
                            case 5:
                                dice.modelRotation.x =
                                    Phaser.Math.DegToRad(-90);
                                dice.modelRotation.y = Phaser.Math.DegToRad(0);
                                break;
                            case 6:
                                dice.modelRotation.x = Phaser.Math.DegToRad(0);
                                dice.modelRotation.y = Phaser.Math.DegToRad(90);
                                break;
                        }
                    },
                    ease: "Sine.easeInOut",
                });

                // Intro dice
                scene.add.tween({
                    targets: [dice],
                    scale: 1.2,
                    duration: 800,
                    yoyo: true,
                    ease: Phaser.Math.Easing.Quadratic.InOut,
                    onComplete: () => {
                        dice.scale = 1;
                        if (callback !== undefined) {
                            diceIsRolling = false;
                            callback(diceRoll);
                        }
                    },
                });
            } else {
                console.log("Is rolling");
            }
        };
    }

    preload() {
        this.load.setBaseURL("https://cdn.phaserfiles.com/v385");
        this.load.image("dice-albedo", "assets/dice/dice-albedo.png");
        this.load.obj("dice-obj", "assets/dice/dice.obj");

        this.load.setBaseURL("");
        this.load.image("woodBackground", "assets/dice/diceBackground.png");
        this.load.audio("diceRoll", "assets/dice/diceRoll.wav");
        this.load.audio("totalSumSound", "assets/dice/STGR_Success_Calm_1.wav");
        this.load.audio("diceBgm", "assets/dice/Dice_bgm.mp3");
    }

    create() {
        this.diceSound = this.sound.add("diceRoll");
        this.totalSumSound = this.sound.add("totalSumSound");
        this.diceBgm = this.sound.add("diceBgm");
        this.diceBgm?.play();

        const { width, height } = this.scale;
        this.add
            .image(width / 2, height / 2, "woodBackground")
            .setDisplaySize(width, height);
        // 버튼 배치 좌표 계산
        const centerY = this.scale.height - 200;
        const centerX = this.scale.width / 2;
        const buttonWidth = 180;
        const buttonHeight = 55;
        const buttonGap = 100;

        const gridConfig = {
            columns: 2, // 가로 개수
            rows: 3, // 세로 개수
            spacingX: 300, // X 간격
            spacingY: 300, // Y 간격
        };

        // 그리드 배치 생성
        for (let row = 0; row < gridConfig.rows; row++) {
            for (let col = 0; col < gridConfig.columns; col++) {
                // 수정 코드 (중앙 정렬 + 간격 적용)
                const startX =
                    (this.scale.width -
                        (gridConfig.columns - 1) * gridConfig.spacingX) /
                    2;
                const startY =
                    (this.scale.height -
                        (gridConfig.rows - 1) * gridConfig.spacingY) /
                    2;
                const x = startX + col * gridConfig.spacingX;
                const y = startY + row * gridConfig.spacingY;
                const scale = 0.6; // 크기 60%로 축소

                // 주사위 생성 및 함수 저장
                const rollFunction = this.createDice(
                    x,
                    y,
                    this,
                    this.rollDuration,
                    scale
                );
                this.diceRollFunctions.push(rollFunction);

                // 텍스트 객체 생성
                const text = this.add
                    .text(x, y, "0", {
                        fontFamily: "Jua",
                        fontSize: 80,
                        color: "#FFD700",
                    })
                    .setScale(0)
                    .setOrigin(0.5);
                this.diceTexts.push(text);
            }
        }
        // 총합 표시 텍스트
        this.totalSumText = this.add
            .text(this.scale.width / 2, 250, "합 : 0", {
                font: "48px Jua",
                color: "#FFFFFF",
            })
            .setOrigin(0.5);

        // 남은 횟수 표시
        const rollsLeftText = this.add
            .text(this.scale.width / 2, 130, "남은 기회 : 3회", {
                font: "32px Jua",
                color: "#FFD700",
            })
            .setOrigin(0.5);

        // -------- 굴리기 버튼 --------
        const rollButton = this.add
            .graphics()
            .fillStyle(0x00bfff, 1)
            .fillRoundedRect(0, 0, buttonWidth, buttonHeight, 18)
            .lineStyle(3, 0x005577, 1)
            .strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 18)
            .setPosition(centerX - buttonWidth - buttonGap / 2, centerY);

        rollButton.postFX.addShadow(0, 1, 0.02, 1, 0x111111, 10);

        const rollText = this.add
            .text(
                rollButton.x + buttonWidth / 2,
                rollButton.y + buttonHeight / 2,
                "GO",
                {
                    font: "28px Jua",
                    color: "#FFFFFF",
                    stroke: "#005577",
                    strokeThickness: 3,
                }
            )
            .setOrigin(0.5);

        rollButton.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight),
            Phaser.Geom.Rectangle.Contains
        );

        rollButton.on("pointerover", () => {
            this.tweens.add({
                targets: [rollButton, rollText],
                scale: 1.02,
                duration: 100,
                ease: "Sine.easeOut",
            });
        });
        rollButton.on("pointerout", () => {
            this.tweens.add({
                targets: [rollButton, rollText],
                scale: 1,
                duration: 100,
                ease: "Sine.easeIn",
            });
        });

        // -------- 멈추기 버튼 --------
        const stopButton = this.add
            .graphics()
            .fillStyle(0xff4500, 1)
            .fillRoundedRect(0, 0, buttonWidth, buttonHeight, 18)
            .lineStyle(3, 0x000000, 1)
            .strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 18)
            .setPosition(centerX + buttonGap / 2, centerY);

        stopButton.postFX.addShadow(0, 1, 0.02, 1, 0x111111, 10);

        const stopText = this.add
            .text(
                stopButton.x + buttonWidth / 2,
                stopButton.y + buttonHeight / 2,
                "STOP",
                {
                    font: "28px Jua",
                    color: "#FFFFFF",
                    stroke: "#000000",
                    strokeThickness: 3,
                }
            )
            .setOrigin(0.5);

        stopButton.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight),
            Phaser.Geom.Rectangle.Contains
        );

        stopButton.on("pointerover", () => {
            this.tweens.add({
                targets: [stopButton, stopText],
                scale: 1.02,
                duration: 100,
                ease: "Sine.easeOut",
            });
        });
        stopButton.on("pointerout", () => {
            this.tweens.add({
                targets: [stopButton, stopText],
                scale: 1,
                duration: 100,
                ease: "Sine.easeIn",
            });
        });

        // -------- 굴리기 버튼 동작 --------
        const rollButtonHandler = () => {
            if (!this.isRolling && this.rollCount < 3) {
                this.isRolling = true;
                this.currentRollSum = 0;
                this.diceSound?.play();

                this.diceRollFunctions.forEach((roll, index) => {
                    roll((value: number) => {
                        this.time.delayedCall(this.rollDuration, () => {
                            this.currentRollSum += value;
                            animateDiceText(this.diceTexts[index], value);

                            if (index === this.diceRollFunctions.length - 1) {
                                this.rollCount++;
                                this.totalSumText.setText(
                                    `합 : ${this.currentRollSum}`
                                );
                                animateTotalSumText(this.totalSumText);
                                rollsLeftText.setText(
                                    `남은 기회 : ${3 - this.rollCount}회`
                                );
                                this.isRolling = false;

                                if (this.rollCount >= 3) {
                                    if (potgManager.getIsRecording()) {
                                        potgManager.stopRecording();
                                    }
                                    this.time.delayedCall(4000, () => {
                                        this.diceBgm?.stop();
                                        this.scene.start("GameOver", {
                                            score: this.currentRollSum,
                                            gameType: "Dice",
                                        });
                                    });
                                } else {
                                    if (this.rollCount < 3) {
                                        this.time.delayedCall(3000, () => {
                                            if (!this.isRolling) {
                                                startCountdown();
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    });
                });
            }
        };

        // --- 카운트다운 텍스트 준비 ---
        let countdownText = this.add
            .text(width / 2, rollButton.y - 50, "", {
                font: "36px Jua",
                color: "#FFD700",
                stroke: "#222",
                strokeThickness: 3,
                align: "center",
            })
            .setOrigin(0.5);

        // --- 카운트다운 및 자동 주사위 굴리기 함수 ---
        const startCountdown = () => {
            let count = this.TimerCount;
            countdownText.setText(count.toString() + "초 후 자동으로 GO!");
            countdownText.setVisible(true);

            // 기존 타이머가 있다면 제거
            if (this.countdownTimer) {
                this.countdownTimer.remove();
            }

            // 1초마다 카운트다운
            this.countdownTimer = this.time.addEvent({
                delay: 1000,
                repeat: this.TimerCount - 1, // 5,4,3,2,1 (총 TimerCount 회)
                callback: () => {
                    count--;
                    countdownText.setText(
                        count > 0
                            ? count.toString() + "초 후 자동으로 GO!"
                            : "GO!"
                    );
                    if (count === 0) {
                        // 카운트다운 끝: 자동으로 주사위 굴리기
                        countdownText.setVisible(false);
                        this.countdownTimer = null;
                        rollButtonHandler();
                    }
                },
                callbackScope: this,
            });
        };
        rollButton.on("pointerdown", () => {
            if (!this.isRolling && this.rollCount < 3) {
                countdownText.setVisible(false); // 수동 클릭 시 카운트다운 숨김
                // 카운트다운 타이머가 있으면 멈추기
                if (this.countdownTimer) {
                    this.countdownTimer.remove(); // 타이머 즉시 제거
                    this.countdownTimer = null;
                }
                rollButtonHandler();
            }
        });

        stopButton.on("pointerdown", () => {
            // 녹화 종료
            if (potgManager.getIsRecording()) {
                potgManager.stopRecording();
            }
            this.time.delayedCall(500, () => {
                this.diceBgm?.stop();
                this.scene.start("GameOver", {
                    score: this.currentRollSum,
                    gameType: "Dice",
                });
            });
        });

        // init timer
        startCountdown();

        const animateDiceText = (
            text: Phaser.GameObjects.Text,
            value: number
        ) => {
            text.setText(value.toString()).setScale(0).setAlpha(1);

            this.tweens.add({
                targets: text,
                scale: 1,
                duration: 500,
                ease: "Bounce.out",
                onComplete: () => {
                    this.tweens.add({
                        targets: text,
                        scale: 0,
                        delay: 1000,
                        duration: 500,
                        ease: "Power2",
                    });
                },
            });
        };
        const animateTotalSumText = (text: Phaser.GameObjects.Text) => {
            text.setScale(1).setAlpha(1);
            this.totalSumSound?.play();
            this.tweens.add({
                targets: text,
                scale: 1.3,
                duration: 500,
                ease: "Bounce.out",
                onStart: () => {
                    text.setColor("#FFD700"); // 트윈 시작 시 색상 변경
                },
                onComplete: () => {
                    this.tweens.add({
                        targets: text,
                        scale: 1,
                        delay: 1000,
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            text.setColor("#FFFFFF"); // 트윈 끝나면 원래 색상으로
                        },
                    });
                },
            });
        };
        // 녹화 시작
        if (potgManager.getIsRecording()) {
            const clearBeforeStart = async () => {
                await potgManager.stopRecording();
                potgManager.startCanvasRecording();
            };
            clearBeforeStart();
        } else potgManager.startCanvasRecording();
    }
}
