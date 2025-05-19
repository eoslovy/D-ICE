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
    private checkEndedInterval: number | undefined;

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

        this.load.once("complete", () => {
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
        console.log("CHECK_ENDED_ACK 이벤트 리스너 등록");
        userWebSocketManager.on(
            "CHECK_ENDED_ACK",
            (payload: CheckEenedAckMessage) => {
                console.log("CHECK_ENDED_ACK 응답 성공:", payload);
                if (!payload) console.log("CHECK_ENDED_ACK payload is null");
                if (payload.isEnded == false || !payload.overallRank) {
                    console.log(
                        "아직 게임이 끝나지 않았습니다. 더 기다려주세요..."
                    );
                    return;
                }
                // Ended 응답 받았으므로 EndGame 씬으로 전환
                this.scene.start("EndGame", {
                    totalScore: payload.totalScore,
                    rankRecord: payload.rankRecord,
                    overallRank: payload.overallRank,
                    totalPlayerCount: payload.totalPlayerCount,
                });
            }
        );

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
            userWebSocketManager.off("CHECK_ENDED_ACK");
            console.log("CHECK_ENDED_ACK 이벤트 리스너 해제");
            clearInterval(this.checkEndedInterval);
            console.log("CHECK_ENDED 요청 인터벌 클리어");
        });

        this.loadOnBackground();

        // 최초 요청
        this.sendCheckEndedRequest();

        // 10초마다 반복 실행 (에러 발생해도 계속)
        this.checkEndedInterval = setInterval(() => {
            this.sendCheckEndedRequest();
        }, 10_000);
    }

    private sendCheckEndedRequest() {
        try {
            userWebSocketManager.sendCheckEnded({
                requestId: uuidv7(),
                userId: userStore.getState().userId,
            });
        } catch (error) {
            console.error("체크 요청 실패, 10초 후 재시도:", error);
        }
    }

    loadOnBackground() {
        // Roulette
        this.load.audio(
            "RouletteSlowSound",
            "assets/Roulette/SFX_SpinWheel_Slow_Loop_1.wav"
        );
        this.load.audio(
            "RouletteFastSound",
            "assets/Roulette/SFX_SpinWheel_Fast_Loop_1.wav"
        );
        this.load.audio(
            "RouletteEndSound",
            "assets/Roulette/SFX_SpinWheel_Start_1.wav"
        );
        // Clicker
        this.load.audio("clicker_bgm", "assets/clicker/clicker_bgm.mp3");
        this.load.audio(
            "clicker_good",
            "assets/clicker/SUCCESSPICKUPCollectBeep04.wav"
        );
        this.load.audio(
            "clicker_fail",
            "assets/clicker/NEGATIVEFailureBeeps04.wav"
        );

        // Color Hunter G
        this.load.audio(
            "colorhunterg_bgm",
            "assets/colorhunterg/colorhunterg_bgm.mp3"
        );
        this.load.image(
            "colorhunterg_marker",
            "assets/colorhunterg/colorhunterg_marker.png"
        );

        // Dye
        this.load.audio("dye_bgm", "assets/dye/dye_bgm.mp3");
        this.load.image("dye_pallete_1", "assets/dye/dye_pallete_1.png");
        this.load.image("dye_pallete_2", "assets/dye/dye_pallete_2.png");
        this.load.image("dye_pallete_3", "assets/dye/dye_pallete_3.png");
        this.load.image("dye_pallete_4", "assets/dye/dye_pallete_4.png");
        this.load.image("marker", "assets/dye/dye_marker.png");

        // Josephus
        this.load.image("josephus", "assets/josephus/josephus.png");
        this.load.audio(
            "josephus_alive",
            "assets/josephus/VOCALCUTECallHappy01.wav"
        );
        this.load.audio(
            "josephus_doomed",
            "assets/josephus/VOCALCUTEDistressPainShort12.wav"
        );
        this.load.audio(
            "josephus_select",
            "assets/josephus/VOCALCUTECallAffection07.wav"
        );
        this.load.audio("josephus_bgm", "assets/josephus/josephus_bgm.mp3");

        // Knight
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

        // Mugungwha
        LoadManifestFromJSON(this, "assets/mugungwha/manifest.json");
        this.load.audio("mugungwha_pop", "assets/mugungwha/POPBrust01.wav");
        this.load.audio(
            "mugungwha_fail",
            "assets/mugungwha/TECHINTERFACEComputerBeepsLong02.wav"
        );
        this.load.audio("mugungwha_01", "assets/mugungwha/mugungwha_01.mp3");
        this.load.audio("mugungwha_02", "assets/mugungwha/mugungwha_02.mp3");
        this.load.audio("mugungwha_03", "assets/mugungwha/mugungwha_03.mp3");
        this.load.audio("mugungwha_bgm", "assets/mugungwha/mugungwha_bgm.mp3");

        // Panopticon
        LoadManifestFromJSON(this, "assets/panopticon/manifest.json");
        this.load.audio(
            "panopticon_bgm",
            "assets/panopticon/panopticon_bgm.mp3"
        );
        this.load.audio(
            "panopticon_fail",
            "assets/panopticon/TECHINTERFACEComputerBeepsLong02.wav"
        );

        // Wirewalk
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

        // Dice
        this.load.setBaseURL("https://cdn.phaserfiles.com/v385");
        this.load.image("dice-albedo", "assets/dice/dice-albedo.png");
        this.load.obj("dice-obj", "assets/dice/dice.obj");

        this.load.setBaseURL("");
        this.load.image("woodBackground", "assets/dice/diceBackground.png");
        this.load.audio("diceRoll", "assets/dice/diceRoll.wav");
        this.load.audio("totalSumSound", "assets/dice/STGR_Success_Calm_1.wav");
        this.load.audio("diceBgm", "assets/dice/Dice_bgm.mp3");

        this.load.start();
    }
}

