import Phaser from "phaser";
import { UICountdown } from "../../modules/gameutils/UICountdown";
import potgManager from "../../modules/POTGManager";

export class Reaction extends Phaser.Scene {
    private state: "waiting" | "ready" | "clicked" | "timeout" = "waiting";
    private infoText!: Phaser.GameObjects.Text;
    private reactionTimes: number[] = [];
    private startTime = 0;
    private countdown!: UICountdown;
    private readyTimeoutEvent?: Phaser.Time.TimerEvent;
    private waitingTimerEvent?: Phaser.Time.TimerEvent;

    constructor() {
        super("Reaction");
    }

    init() {
        // UICountdown 인스턴스 생성 (카운트다운 숫자는 infoText 아래에 표시)
        this.countdown = new UICountdown(
            this,
            this.scale.width / 2,
            this.scale.height / 2 - 300,
            64
        );
    }

    create() {
        this.state = "waiting";
        this.reactionTimes = [];
        this.startTime = 0;
        this.cameras.main.setBackgroundColor("#2b87d1");

        this.infoText = this.add
            .text(
                this.scale.width / 2,
                this.scale.height / 2,
                "3초 후에 시작합니다...",
                {
                    fontFamily: "Jua",
                    fontSize: "48px",
                    color: "#ffffff",
                    align: "center",
                    fontStyle: "bold",
                }
            )
            .setOrigin(0.5);

        // 첫 3초 카운트다운
        this.countdown.startCountdown(3);
        this.events.once("countdownFinished", () => {
            // 녹화 시작
            if (potgManager.getIsRecording()) {
                const clearBeforeStart = async () => {
                    await potgManager.stopRecording();
                    potgManager.startCanvasRecording();
                };
                clearBeforeStart();
            } else potgManager.startCanvasRecording();

            this.startWaiting();
        });
    }

    startWaiting() {
        if (this.reactionTimes.length >= 5) {
            this.calculateMin();
            return;
        }

        this.state = "waiting";
        this.cameras.main.setBackgroundColor("#c82535");
        this.infoText.setText("초록색이 되면 클릭!");
        this.infoText.setFontFamily("Jua");

        // 1.5~5초 랜덤 대기 후 turnGreen
        const delay = Phaser.Math.Between(1500, 5000);
        this.waitingTimerEvent = this.time.delayedCall(
            delay,
            this.turnGreen,
            [],
            this
        );

        // 대기 중에 클릭하면 tooSoon 처리
        this.input.once("pointerdown", this.tooSoon, this);
    }

    turnGreen() {
        this.state = "ready";
        this.cameras.main.setBackgroundColor("#4bda6a");
        this.infoText.setText("지금 클릭!");
        this.infoText.setFontFamily("Jua");
        this.startTime = this.time.now;

        // 2초 안에 클릭 안 하면 timeout 처리
        this.readyTimeoutEvent = this.time.delayedCall(
            2000,
            this.onTimeout,
            [],
            this
        );

        this.input.once("pointerdown", this.recordReaction, this);
    }

    tooSoon() {
        if (this.state === "waiting") {
            this.waitingTimerEvent?.remove();
            this.state = "clicked";
            this.cameras.main.setBackgroundColor("#2b87d1");
            this.infoText.setText("너무 빨랐어요!");
            this.infoText.setFontFamily("Jua");

            // 3초 카운트다운 후 재시작
            this.countdown.startCountdown(2);
            this.events.once("countdownFinished", () => {
                this.startWaiting();
            });
        }
    }

    onTimeout() {
        if (this.state === "ready") {
            this.readyTimeoutEvent?.remove();
            this.state = "timeout";
            this.cameras.main.setBackgroundColor("#2b87d1");
            this.infoText.setText("시간 초과!");
            this.infoText.setFontFamily("Jua");

            // 3초 카운트다운 후 재시작
            this.countdown.startCountdown(2);
            this.events.once("countdownFinished", () => {
                this.startWaiting();
            });
        }
    }

    recordReaction() {
        if (this.state === "ready") {
            this.state = "clicked";
            this.readyTimeoutEvent?.remove();

            const reactionTime = Math.round(this.time.now - this.startTime);
            this.reactionTimes.push(reactionTime);

            this.cameras.main.setBackgroundColor("#2b87d1");

            if (this.reactionTimes.length < 5) {
                this.infoText.setText(
                    `반응속도 : ${reactionTime}ms\n(${this.reactionTimes.length}/5)`
                );
                this.infoText.setFontFamily("Jua");

                // 3초 카운트다운 후 다음 라운드
                this.countdown.startCountdown(3);
                this.events.once("countdownFinished", () => {
                    this.startWaiting();
                });
            } else {
                this.infoText.setText(
                    `반응속도 : ${reactionTime}ms\n(${this.reactionTimes.length}/5)\n결과를 확인하세요!`
                );
                this.infoText.setFontFamily("Jua");
                // 3초 카운트다운 후 결과 표시

                this.countdown.startCountdown(3);
                this.events.once("countdownFinished", () => {
                    this.calculateMin();
                });
            }
        }
    }

    calculateMin() {
        // 녹화 종료
        if (potgManager.getIsRecording()) {
            potgManager.stopRecording();
        }
        const min =
            this.reactionTimes.length > 0 ? Math.min(...this.reactionTimes) : 0;
        this.cameras.main.setBackgroundColor("#2b87d1");
        this.showGraph();

        this.infoText.setText(`Best Time : ${min}ms`);
        this.infoText.setFontFamily("Jua");

        // 5초 뒤 GameOver 씬으로 자동 이동
        this.time.delayedCall(5000, () => {
            this.scene.start("GameOver", {
                score: min,
                gameType: "Reaction",
            });
        });
    }

    showGraph() {
        const graph = this.add.graphics();
        const graphWidth = this.scale.width - 100;
        const graphHeight = 200;
        const graphX = 50;
        const graphY = 300;

        graph.clear();
        graph.fillStyle(0xffffff, 0.5);
        graph.lineStyle(2, 0xffffff, 1);

        const points: { x: number; y: number }[] = [];

        const maxTime = Math.max(...this.reactionTimes, 1);
        const stepX =
            this.reactionTimes.length > 1
                ? graphWidth / (this.reactionTimes.length - 1)
                : 0;

        this.reactionTimes.forEach((time, index) => {
            const x = graphX + index * stepX;
            const y = graphY + graphHeight - (time / maxTime) * graphHeight;

            points.push({ x, y });

            // 각 점 위에 반응 속도 표시 (Jua 폰트)
            this.add
                .text(x, y - 20, `${time}ms`, {
                    fontFamily: "Jua",
                    fontSize: "24px",
                    color: "#ffffff",
                })
                .setOrigin(0.5);
        });

        if (points.length === 0) return;

        // 영역 그래프 그리기
        graph.beginPath();
        graph.moveTo(points[0].x, graphY + graphHeight);
        points.forEach((point) => {
            graph.lineTo(point.x, point.y);
        });
        graph.lineTo(points[points.length - 1].x, graphY + graphHeight);
        graph.closePath();
        graph.fillPath();

        // 선 그리기
        graph.beginPath();
        points.forEach((point, index) => {
            if (index === 0) {
                graph.moveTo(point.x, point.y);
            } else {
                graph.lineTo(point.x, point.y);
            }
        });
        graph.strokePath();

        // 꼭지점에 원형 점 그리기
        points.forEach((point) => {
            graph.fillStyle(0xffffff, 1);
            graph.fillCircle(point.x, point.y, 10);
        });
    }
}
