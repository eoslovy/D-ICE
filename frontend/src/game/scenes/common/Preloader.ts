import Phaser from "phaser";
import userWebSocketManager from "../../../modules/UserWebSocketManager";
import { LoadManifestFromJSON } from "../../../modules/gameutils/LoadSpritesManifest";
//import { DiceMiniGame } from "../DiceMiniGame";
import { userStore } from "../../../stores/userStore";
import { addBackgroundImage } from "./addBackgroundImage";
import { v7 as uuidv7 } from "uuid";

export class Preloader extends Phaser.Scene {
    //private diceMiniGame?: DiceMiniGame;
    private waitingText?: Phaser.GameObjects.Text;
    private readyToStart: boolean = false;
    private width: number;
    private height: number;
    private isEmojiCoolDown: boolean = false;

    constructor() {
        super({ key: "Preloader" });
    }
    preload() {
        this.load.font("Jua", "assets/fonts/Jua-Regular.ttf");
        this.load.font("FredokaOne", "assets/fonts/Fredoka-Regular.ttf");
        this.load.image("dice-albedo", "assets/dice/dice-albedo.png");
        this.load.obj("dice-obj", "assets/dice/dice.obj");
        this.load.image("Background", "assets/background/bg-2.jpg");

        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(
            this.width / 2 - 160,
            this.height / 2 - 25,
            320,
            50
        );

        const loadingText = this.add
            .text(this.width / 2, this.height / 2 - 50, "Loading...", {
                fontFamily: "Fredoka",
                fontSize: "20px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.load.on("progress", (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(
                this.width / 2 - 150,
                this.height / 2 - 15,
                300 * value,
                30
            );
        });

        this.load.on("complete", () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            this.showWaitingScene();
            this.showEmojiButtons();
        });

        this.load.image("bg", "assets/bg.png");
        this.load.image("logo", "assets/logo.png");
        this.load.image("star", "assets/star.png");
        LoadManifestFromJSON(this, "assets/manifest.json");
    }

    private showWaitingScene() {
        //배경
        addBackgroundImage(this);

        //this.diceMiniGame = new DiceMiniGame(this);
        //this.diceMiniGame.create(width / 2, height / 2);

        this.waitingText = this.add
            .text(this.width / 2, this.height / 2 - 350, "Waiting...", {
                fontFamily: "Fredoka",
                fontSize: "64px",
                color: "#ebebd3",
                align: "center",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        // 점 애니메이션
        let dots = "";
        this.time.addEvent({
            delay: 500,
            callback: () => {
                dots = dots.length >= 3 ? "" : dots + ".";
                if (this.waitingText && !this.readyToStart) {
                    this.waitingText.setText("Waiting" + dots);
                }
            },
            loop: true,
        });
    }

    private showEmojiButtons() {
        const positiveEmojis = [
            "🤣",
            "🙌",
            "😂",
            "👍",
            "🔥",
            "🥹",
            "😎",
            "🎉",
            "🙏",
            "🎲",
            "🧊",
            "🎵",
            "🤟",
            "📣",
        ];

        const negativeEmojis = [
            "💩",
            "😭",
            "🙈",
            "🙊",
            "😾",
            "🤬",
            "👽",
            "☠️",
            "💣",
            "🤢",
            "🤮",
        ];

        const chosenPositives = Phaser.Utils.Array.Shuffle(
            positiveEmojis
        ).slice(0, 3);
        const chosenNegatives = Phaser.Utils.Array.Shuffle(
            negativeEmojis
        ).slice(0, 2);
        const chosenEmojis = [
            chosenPositives[0],
            chosenNegatives[0],
            chosenPositives[1],
            chosenNegatives[1],
            chosenPositives[2],
        ];

        const positions = chosenEmojis.map((_, i) => {
            return (this.scale.width * (i + 1)) / 6;
        });
        const emojiButtons: Phaser.GameObjects.Text[] = [];

        chosenEmojis.forEach((emoji, index) => {
            const button = this.add
                .text(positions[index], this.height / 1.2, emoji, {
                    fontFamily: "Arial",
                    fontSize: 96,
                })
                .setInteractive();
            button.setOrigin(0.5);
            emojiButtons.push(button);

            button.on("pointerdown", () => {
                if (this.isEmojiCoolDown) return;

                // 쿨타임 시작
                this.isEmojiCoolDown = true;
                emojiButtons.forEach((b) => b.setAlpha(0.5));

                userWebSocketManager.sendBroadcast({
                    requestId: uuidv7(),
                    payload: emoji,
                });

                this.time.delayedCall(300, () => {
                    this.isEmojiCoolDown = false;
                    emojiButtons.forEach((b) => b.setAlpha(1));
                });
            });
        });
    }

    private moveToRoulette() {
        // 텍스트 제거
        this.waitingText?.destroy();
        // 다이스 제거
        //this.diceMiniGame?.destroy();
        //this.scene.start(userStore.getState().gameType);
        
        this.scene.start("Roulette", {
            nextGame: userStore.getState().gameType,
            onComplete: () => {
                console.log("Roulette Scene Stop");
                this.scene.stop("Roulette");
                this.scene.start(userStore.getState().gameType);
            },
        });
    
    }

    create() {
        console.log("WAIT 이벤트 리스너 등록");
        userWebSocketManager.on("WAIT", (payload: WaitMessage) => {
            console.log("WAIT 응답 성공:", payload);
            this.readyToStart = true;
            if (payload) {
                userStore.getState().setGameType(payload.gameType);
                userStore.getState().setStartAt(payload.startAt);
                userStore.getState().setDuration(payload.duration);
                userStore.getState().setCurrentMs(payload.currentMs);
            }
            this.moveToRoulette();
        });

        userWebSocketManager.on(
            "BROADCAST",
            ({ payload }: BroadcastMessage) => {
                console.log("BROADCAST 메시지 수신: ", payload);
                const emoji = this.add.text(
                    this.scale.width * (0.1 + Math.random() * 0.8),
                    Math.random() * 0.5 * this.scale.height,
                    payload,
                    {
                        fontFamily: "Arial",
                        fontSize: 96,
                    }
                );

                this.tweens.add({
                    targets: emoji,
                    alpha: 0,
                    y: emoji.y - 50,
                    duration: 2000,
                    onComplete: () => {
                        emoji.destroy();
                    },
                    ease: "Power2",
                });
            }
        );

        this.events.on("shutdown", () => {
            userWebSocketManager.off("WAIT");
            console.log("WAIT 이벤트 리스너 해제");
            userWebSocketManager.off("BROADCAST");
            console.log("BROADCAST 이벤트 리스너 해제");
        });
    }
}
