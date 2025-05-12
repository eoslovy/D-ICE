import Phaser from "phaser";
import userWebSocketManager from "../../../modules/UserWebSocketManager";
import { LoadManifestFromJSON } from "../../../modules/gameutils/LoadSpritesManifest";
//import { DiceMiniGame } from "../DiceMiniGame";
import { userStore } from "../../../stores/userStore";
import { addBackgroundImage } from "./addBackgroundImage";

export class Preloader extends Phaser.Scene {
    //private diceMiniGame?: DiceMiniGame;
    private waitingText?: Phaser.GameObjects.Text;
    private readyToStart: boolean = false;

    constructor() {
        super({ key: "Preloader" });
    }
    preload() {
        this.load.image("dice-albedo", "assets/dice/dice-albedo.png");
        this.load.obj("dice-obj", "assets/dice/dice.obj");
        this.load.image("Background", "assets/background/bg-2.jpg");

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.add
            .text(width / 2, height / 2 - 50, "Loading...", {
                fontFamily: "Fredoka",
                fontSize: "20px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        this.load.on("progress", (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(
                width / 2 - 150,
                height / 2 - 15,
                300 * value,
                30
            );
        });

        this.load.on("complete", () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            this.showWaitingScene();
        });

        this.load.image("bg", "assets/bg.png");
        this.load.image("logo", "assets/logo.png");
        this.load.image("star", "assets/star.png");
        LoadManifestFromJSON(this, "assets/manifest.json");
    }

    private showWaitingScene() {
        const { width, height } = this.cameras.main;

        //배경
        addBackgroundImage(this);

        //this.diceMiniGame = new DiceMiniGame(this);
        //this.diceMiniGame.create(width / 2, height / 2);

        this.waitingText = this.add
            .text(
                width / 2,
                height / 2 - 350,
                "Waiting...",
                {
                    fontFamily: "Fredoka",
                    fontSize: "64px",
                    color: "#ebebd3",
                    align: "center",
                    fontStyle: "bold",
                }
            )
            .setOrigin(0.5);

        // 점 애니메이션
        let dots = "";
        this.time.addEvent({
            delay: 500,
            callback: () => {
                dots = dots.length >= 3 ? "" : dots + ".";
                if (this.waitingText && !this.readyToStart) {
                    this.waitingText.setText(
                        "Waiting" + dots
                    );
                }
            },
            loop: true,
        });
    }

    private moveToRoulette() {
        // 텍스트 제거
        this.waitingText?.destroy();
        // 다이스 제거
        //this.diceMiniGame?.destroy();

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
    }
}

