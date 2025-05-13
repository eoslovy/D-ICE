import { Scene } from "phaser";
import { createChart, IChartApi, CandlestickData } from "lightweight-charts";
import { LineStyle } from 'lightweight-charts';

interface ScoreMessage {
    userCode: string;
    userName: string;
    earnedScore: number;
    totalScore: number;
}
  
interface ScoreRankingResponse {
    scoreRanking: ScoreMessage[];
}
  
const params = {
    roomCode: "1",
    roundCode: "2",
    userCode: "3"
};
export class GraphHigh extends Scene {
    private ws?: WebSocket;
    private chart!: IChartApi;
    private series!: ReturnType<IChartApi["addCandlestickSeries"]>;
    private tickBuffer: number[] = [];
    private candles: CandlestickData[] = [];
    private startTime: number = 0;
    private tickCount: number = 0;
    private currentPrice: number = 1000;
    private containerId = "chart-container";
    private timer?: Phaser.Time.TimerEvent;
    private timeText!: Phaser.GameObjects.Text;
    private remainingTime: number = 30; // 30초
    private attempts: number[] = [];
    private attemptTexts: Phaser.GameObjects.Text[] = [];
    private scoreButton!: Phaser.GameObjects.Text;
    private scheduleNextTick() {
        const delay = Phaser.Math.Between(70, 120); // 0.08 ~ 0.15초
        this.time.delayedCall(delay, () => {
            this.generateTick();
            this.scheduleNextTick();
        });
    }
    
    
    constructor() {
        super("GraphHigh");
    }
    private createChartContainer() {
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement("div");
            container.id = this.containerId;
            container.style.position = "absolute";
            container.style.pointerEvents = "none";
            container.style.display = "block";
            container.style.zIndex = "1";
            container.style.background = "transparent";
            document.body.appendChild(container);
        }

        const updatePosition = () => {
            const rect = this.game.canvas.getBoundingClientRect();

            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const targetWidth = vw * 0.8;
            const targetHeight = vh * 0.6;

            container!.style.width = `${targetWidth}px`;
            container!.style.height = `${targetHeight}px`;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            container!.style.left = `${centerX - targetWidth / 2}px`;
            container!.style.top = `${centerY - targetHeight / 2}px`;
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
    }
    private setupChart() {
        const container = document.getElementById(this.containerId)!;

        this.chart = createChart(this.containerId, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { color: "transparent" },
                textColor: "#d1d4dc",
                attributionLogo: false
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
            },
        });

        this.series = this.chart.addCandlestickSeries();
        this.series.setData(this.candles);

        setTimeout(() => {
            this.chart.timeScale().setVisibleRange({ from: 0, to: 30 });
        }, 0);
    }
    create() {

        const params = {
            roomCode: "1",
            roundCode: "2",
            userCode: "3"
        };

        const query = new URLSearchParams(params).toString();
        const WS_URL = `ws://localhost:8080/api/game/kjh/ws/graphhigh?${query}`;

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log("✅ WebSocket 연결됨");

            const sendData: ScoreMessage = {
                userCode: "abc124",
                userName: "jae",
                earnedScore: 1094,
                totalScore: 1530
            };

            this.ws?.send(JSON.stringify(sendData));
            console.log("📤 데이터 전송됨:", sendData);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const data: ScoreRankingResponse = JSON.parse(event.data);
                console.log("📥 수신된 scoreRanking:");

                data.scoreRanking.forEach((entry, index) => {
                    console.log(`${index + 1}. ${entry.userName} (${entry.userCode}) - earned: ${entry.earnedScore}, total: ${entry.totalScore}`);
                });
            } catch (error) {
                console.error("❌ JSON 파싱 실패:", error);
            }
        };

        this.ws.onerror = (error) => {
            console.error("❌ WebSocket 에러:", error);
        };

        this.ws.onclose = (event) => {
            console.log(`🔒 WebSocket 연결 종료 (code=${event.code})`);
        };

        this.createChartContainer();
        this.setupChart();

        this.timeText = this.add.text(this.cameras.main.centerX, 20, `Time: ${this.remainingTime}`, {
            font: '20px Arial',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.startTime = Math.floor(Date.now() / 1000);

        
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                this.remainingTime--;
                if (this.remainingTime >= 0) {
                    this.timeText.setText(`Time: ${this.remainingTime}`);
                }
            }
        });
        this.scheduleNextTick();
        this.scoreButton = this.add.text(this.cameras.main.centerX, this.cameras.main.height - 80, '기회 사용', {
            font: '28px Arial',
            backgroundColor: '#0080ff',
            color: '#ffffff',
            padding: { x: 16, y: 10 },
            align: 'center',
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (this.attempts.length >= 3 || this.remainingTime <= 0) return;

                const current = Number(this.currentPrice.toFixed(2));
                this.attempts.push(current);
                
                const markerTime = this.logicalTime;
                const coordinate = this.chart.timeScale().timeToCoordinate(markerTime);
                
                const priceLine = this.series.createPriceLine({
                    price: this.currentPrice,
                    color: 'red',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true,
                    title: `시도 ${this.attempts.length}`,
                });

                // 기록 표시 업데이트
                const text = this.add.text(20, 60 + this.attempts.length * 30, `시도 ${this.attempts.length}: ${current}`, {
                    font: '18px Arial',
                    color: '#ffffff'
                });
                this.attemptTexts.push(text);
                const scorePayload: ScoreMessage = {
                    userCode: "abc124",  // 또는 this.userCode 등으로 동적으로
                    userName: "jae",
                    earnedScore: current,
                    totalScore: this.attempts.reduce((a, b) => a + b, 0)
                };
                this.ws?.send(JSON.stringify(scorePayload));
                console.log("📤 점수 전송됨:", scorePayload);
                // ✅ 파괴적인 이펙트: 강한 scale + 회전 + 알파 + 터지는 느낌
                this.tweens.add({
                    targets: this.scoreButton,
                    scale: { from: 1, to: 2.2 },
                    angle: { from: 0, to: 20 },
                    alpha: { from: 1, to: 0 },
                    duration: 300,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        this.scoreButton.setScale(1).setAlpha(1).setAngle(0); // 리셋
                    }
                });

                // ✅ 추가: 화면 흔들림 효과
                this.cameras.main.shake(250, 0.01); // (duration, intensity)

                // ✅ 버튼 색 반짝임 (짧게 다시 깜빡)
                this.tweens.add({
                    targets: this.scoreButton,
                    duration: 100,
                    repeat: 2,
                    yoyo: true,
                    color: '#ff4444'
                });

                if (this.attempts.length >= 3) {
                    this.scoreButton.setAlpha(0.5).disableInteractive();
                }
            });
    }

    private logicalTime: number = 0;  // 봉 단위로 증가하는 시간
    private generateTick() {
        const baseVolatility = this.currentPrice*0.15;
        const spikeVolatility = this.currentPrice*0.45;
        const spikeChance = 0.09; // 5% 확률로 스파이크 발생

        const isSpike = Math.random() < spikeChance;
        const volatility = isSpike ? spikeVolatility : baseVolatility;
        const change = (Math.random() - 0.488 ) * volatility;

        this.currentPrice += change;
        this.currentPrice = Number(this.currentPrice.toFixed(2));

        this.tickBuffer.push(this.currentPrice);
        this.tickCount++;

        if (this.tickBuffer.length === 5) {

            const candle = this.makeCandle(this.tickBuffer, this.logicalTime);
            this.candles.push(candle);
            this.series.setData(this.candles);

            this.logicalTime++; // 봉 시간 증가
            this.currentPrice = candle.close;
            this.tickBuffer = [this.currentPrice]; // 다음 봉 시작
        } else {
            const tempCandle = this.makeCandle(this.tickBuffer, this.logicalTime);

            if (this.candles.length > 0) {
                this.series.update(tempCandle);
            }
        }
    }

    private makeCandle(ticks: number[], time: number): CandlestickData {
        const open = ticks[0] ?? this.currentPrice;
        const close = ticks[ticks.length - 1] ?? open;
        const high = Math.max(...ticks);
        const low = Math.min(...ticks);
        return { time, open, high, low, close };
    }

    shutdown() {
        const container = document.getElementById(this.containerId);
        if (container) container.remove();
        if (this.timer) this.timer.remove(false);
    }
}
