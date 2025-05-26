import { Scene } from "phaser";
import { UICountdown } from "../../../modules/gameutils/UICountdown";
import { addBackgroundImage } from "./addBackgroundImage";
import { userStore } from "../../../stores/userStore";
interface InstructionConfig {
    nextGame: string;
    gameName: string;
    onComplete: () => void;
}

export class GameInstruction extends Scene {
    private nextGame: string;
    private gameName: string;
    private serverStartAt: number;
    private onComplete: () => void;
    private countTime: number = 10;
    private countdown: UICountdown;

    constructor() {
        super("GameInstruction");
    }

    init(data: InstructionConfig) {
        this.nextGame = data.nextGame;
        this.gameName = data.gameName;
        this.serverStartAt = userStore.getState().startAt;
        this.onComplete = data.onComplete;
    }

    preload() {
        // 게임별 설명 이미지 로드
        this.load.image(
            "instruction-" + this.nextGame.toLowerCase(),
            `assets/instructions/${this.nextGame.toLowerCase()}.png`
        );
    }

    create() {
        const { width, height } = this.cameras.main;
        this.countdown = new UICountdown(this, width / 2, height * 0.9, 64);

        // 배경
        addBackgroundImage(this);

        // 게임 제목
        this.add
            .text(width / 2, height * 0.1, this.gameName, {
                fontFamily: "Jua",
                fontSize: "48px",
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        // 설명 이미지
        const instruction = this.add
            .image(
                width / 2,
                height / 2,
                "instruction-" + this.nextGame.toLowerCase()
            )
            .setOrigin(0.5);

        // 이미지 크기 조정
        const scale = Math.min(
            (width * 0.8) / instruction.width,
            (height * 0.6) / instruction.height
        );
        instruction.setScale(scale);

        // 1. 현재 클라이언트 시간
        const ClientNow = Date.now();
        // 2. 남은 대기 시간(ms) 계산 (시각 차이 계산)
        const msUntilStart =
            this.serverStartAt - ClientNow + userStore.getState().timeOffset;

        console.log("남은 대기 시간(ms):", msUntilStart);

        const secUntilStart = Math.floor(msUntilStart / 1000);
        //최소 3초는 게임 설명을 보도록 설정
        this.countTime = Math.max(3, secUntilStart);
        // 카운트다운 시작
        this.countdown.startCountdown(this.countTime);

        this.events.once("countdownFinished", () => {
            if (this.onComplete) {
                this.onComplete();
            } else {
                console.warn("onComplete is undefined!");
            }
        });
    }
}
