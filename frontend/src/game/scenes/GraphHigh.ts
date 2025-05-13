import { Scene } from "phaser";
import { createChart, IChartApi, CandlestickData } from "lightweight-charts";
import { LineStyle } from 'lightweight-charts';
import { userStore} from '../../stores/userStore'

interface ScoreMessage {
    userCode: string;
    userName: string;
    earnedScore: number;
    totalScore: number;
}
  
interface ScoreRankingResponse {
    scoreRanking: ScoreMessage[];
}
const { roomCode, nickname, userId,  } = userStore.getState();
const params = {
    roomCode: roomCode,
    roundCode: 0,
    userCode: userId
};

export class GraphHigh extends Scene {
    private ws?: WebSocket;
    private rankingMap: Map<string, Phaser.GameObjects.Text> = new Map();
    private latestRanking: ScoreMessage[] = [];
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
    private rankingTexts: Phaser.GameObjects.Container[] = [];
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
            roomCode: roomCode,
            roundCode: 0,
            userCode: userId
        };
        for (let i = 0; i < 3; i++) {
            const text = this.add.text(600, 100 + i * 40, '', {
                font: '20px Arial',
                color: '#ffffff'
            });
            this.rankingMap.set(`slot${i}`, text);
        }
        const query = new URLSearchParams(params).toString();
        const WS_URL = `ws://localhost:8080/api/game/kjh/ws/graphhigh?${query}`;

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log("✅ WebSocket 연결됨");

            const sendData: ScoreMessage = {
                userCode: userId,
                userName: nickname,
                earnedScore: 0,
                totalScore: 0
            };

            this.ws?.send(JSON.stringify(sendData));
            console.log("📤 데이터 전송됨:", sendData);
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const data: ScoreRankingResponse = JSON.parse(event.data);
                this.renderRanking(data.scoreRanking);
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

    private renderRanking(data: ScoreMessage[]) {
        // 기존 제거
        this.rankingTexts.forEach(c => c.destroy());
        this.rankingTexts = [];
    
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // 금, 은, 동
        const baseY = 80;
        const startX = this.cameras.main.centerX;
    
        data.slice(0, 5).forEach((entry, index) => {
            const rank = index + 1;
            const y = baseY + index * 60;
    
            const rankText = this.add.text(0, 0, `${rank}.`, {
                font: '24px Arial',
                color: colors[index] || '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);
    
            const nameText = this.add.text(40, 0, `${entry.userName}`, {
                font: '24px Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);
    
            const scoreText = this.add.text(180, 0, `(${entry.earnedScore})`, {
                font: '20px Arial',
                color: '#aaaaaa'
            }).setOrigin(0, 0.5);
    
            const container = this.add.container(startX - 120, y, [rankText, nameText, scoreText]);
            this.rankingTexts.push(container);
    
            // Tween 효과 (scale 깜빡임)
            this.tweens.add({
                targets: container,
                scale: { from: 1.2, to: 1 },
                duration: 300,
                ease: 'Back.easeOut',
            });
        });
    }
    shutdown() {
        const container = document.getElementById(this.containerId);
        if (container) container.remove();
        if (this.timer) this.timer.remove(false);
    }
}
