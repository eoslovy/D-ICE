import { Scene } from "phaser";
import { createChart, IChartApi, CandlestickData } from "lightweight-charts";
import { LineStyle } from 'lightweight-charts';
import { userStore} from '../../stores/userStore'
import potgManager from "../../modules/POTGManager";
import { LoadManifestFromJSON } from '../../modules/gameutils/LoadSpritesManifest';
import { PopupSprite } from '../../modules/gameutils/PopupSptire';
import { PopupText } from '../../modules/gameutils/PopupText';
import { UITimer } from '../../modules/gameutils/UITimer';
import { UICountdown } from '../../modules/gameutils/UICountdown';
import { EventBus } from '../EventBus';


interface ScoreMessage {
    userCode: string;
    userName: string;
    earnedScore: number;
    totalScore: number;
}
  
interface ScoreRankingResponse {
    scoreRanking: ScoreMessage[];
}
const webSocketUrl = import.meta.env.VITE_WEBSOCKET_URL;
const { roomCode, nickname, userId,  } = userStore.getState();
const params = {
    roomCode: roomCode,
    roundCode: 0,
    userCode: userId
};

const state = userStore.getState();
if (!state.userId || !state.roomCode) {
    userStore.setState({
        roomCode: "test-room",
        nickname: "테스터",
        userId: "test-user-001",
    });
}
function mulberry32(seed: number) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
} 
export class GraphHigh extends Scene {
    private ws?: WebSocket;
    private chartImage!: Phaser.GameObjects.Image;
    private chartCanvas!: HTMLCanvasElement;
    private chartTex!: Phaser.Textures.CanvasTexture;
    private chartTexture!: Phaser.Textures.CanvasTexture;
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

    private timer: UITimer;
    private countdown: UICountdown;
    private gameStartedTime: number;
    private gameMustEndTime: number;
    private gameDuration: number;
    private popupText: PopupText;
    private popupSprite: PopupSprite;
    private gameStarted: boolean = false;
    private gameEnded: boolean = false;
    private timeText!: Phaser.GameObjects.Text;

    //시드
    private prng!: () => number;
    private seed: number = 12345678; // 서버에서 고정 seed 전달받거

    private remainingTime: number = 30; // 30초
    private attempts: number[] = [];
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

    private hashRoomCodeToSeed(roomCode: string): number {
    let hash = 0;
    for (let i = 0; i < roomCode.length; i++) {
        hash = ((hash << 5) - hash) + roomCode.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
    }

    private createChartContainer() {
    let container = document.getElementById(this.containerId);
    if (!container) {
        container = document.createElement("div");
        container.id = this.containerId;
        container.style.position = "absolute";
        container.style.pointerEvents = "none"; // 클릭 막기
        container.style.zIndex = "10";            // Phaser 캔버스 뒤로
        container.style.background = "transparent";
        document.body.appendChild(container);
    }
    
    const updatePosition = () => {
        const rect = this.game.canvas.getBoundingClientRect();

        // 원하는 비율
        const targetWidth = rect.width * 1;
        const targetHeight = rect.height * 0.7;

        // 중앙 정렬 계산
        const left = rect.left + (rect.width - targetWidth) / 2;
        const top = rect.top + (rect.height - targetHeight) / 2;
        
        //container!.style.display = 'none';
        container!.style.left = `${left}px`;
        container!.style.top = `${top}px`;
        container!.style.width = `${targetWidth}px`;
        container!.style.height = `${targetHeight}px`;

        if (this.chart) {
            this.chart.resize(targetWidth, targetHeight);
        }
    };
    
    updatePosition(); // 최초 한 번 실행
    window.addEventListener("resize", updatePosition);
    }

    private updateChartImagePosition() {
        const chartCanvas = document.querySelector(`#${this.containerId} canvas`) as HTMLCanvasElement;
        if (!chartCanvas || !this.chartImage) return;

        const width = chartCanvas.width;
        const height = chartCanvas.height;

        this.chartImage.setDisplaySize(width, height);
        this.chartImage.setPosition(
            this.cameras.main.centerX,
            this.cameras.main.centerY - (this.cameras.main.height - height) / 2 // 위로 살짝 조정
        );
    }
    private startChartToPhaserLoop() {
        const container = document.getElementById(this.containerId)!;
        const width  = container.clientWidth;
        const height = container.clientHeight;

        this.textures.createCanvas('chartTexture', width, height);
        this.chartImage = this.add.image(0, 0, 'chartTexture').setOrigin(0, 0);

        const draw = () => {
            const tex = this.textures.get('chartTexture') as Phaser.Textures.CanvasTexture;
            const ctx = tex.getContext();
            if (!ctx) return;

            ctx.clearRect(0, 0, width, height);

            // 여기서 매 프레임 최신 캔버스 리스트 조회
            const chartCanvases = Array.from(
            container.querySelectorAll('canvas')
            ) as HTMLCanvasElement[];

            chartCanvases.forEach(cvs => {
            ctx.drawImage(cvs, 0, 0, width, height);
            });

            tex.refresh();
            requestAnimationFrame(draw);
        };

        requestAnimationFrame(draw);
    }
    private setupChartContainerAndChart() {
        // 1. DOM에 컨테이너 추가
        const container = document.createElement("div");
        container.id = "chart-container";
        container.style.position = "absolute";
        container.style.pointerEvents = "none";
        container.style.left = "0";
        container.style.top = "0";
        container.style.zIndex = "0";
        container.style.width = "800px";
        container.style.height = "400px";
        document.body.appendChild(container);

        // 2. lightweight-charts 생성
        const chart = createChart(container, {
            width: 800,
            height: 400,
            layout: { background: { color: "transparent" }, textColor: "white" },
            grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            timeScale: { timeVisible: true },
        });

        const series = chart.addCandlestickSeries();
        series.setData([
            { time: 1, open: 100, high: 120, low: 90, close: 110 },
            { time: 2, open: 110, high: 130, low: 100, close: 120 },
        ]);

        // 3. 내부 canvas 참조 저장
        this.chartCanvas = container.querySelector("canvas")!;
    }

    private setupChart() {
    const container = document.getElementById(this.containerId)!;
    this.chart = createChart(this.containerId, {
        width:  container.clientWidth,
        height: container.clientHeight,
        layout: {
        background: { color: 'transparent' },  // ← 변경: 투명
        textColor: "#d1d4dc",
        attributionLogo: false
        },
        grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
        },
        timeScale: {
        timeVisible:   true,
        secondsVisible:true,
        },
    });
    this.series = this.chart.addCandlestickSeries();
    this.series.setData(this.candles);
    }
    init() {
            this.gameStartedTime = 0;
            this.gameDuration = 40; // Default to 60 seconds if not provided
            this.gameStarted = false;
            this.gameEnded = false;
            this.seed = this.hashRoomCodeToSeed(roomCode); // 또는 서버에서 받아온 고정된 seed
            this.prng = mulberry32(this.seed);
        }

    preload() {
        // Add game specific asset loading here
        // This is called once before the scene is created
        this.load.start();
    }

    create() {
        
        const chartWidth = this.game.config.width as number;
        const chartHeight = (this.game.config.height as number) * 0.7;

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY - this.cameras.main.height * 0.15; // 약간 위

        this.textures.createCanvas('chartTexture', chartWidth, chartHeight);
        this.chartTex = this.textures.get('chartTexture') as Phaser.Textures.CanvasTexture;

        this.chartImage = this.add.image(centerX, centerY, 'chartTexture')
            .setDisplaySize(chartWidth, chartHeight)
            .setOrigin(0.5);


        const params = {
            roomCode: roomCode,
            roundCode: "0",
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
        const WS_URL = `${webSocketUrl}/game/kjh/ws/graphhigh?${query}`;

        this.ws = new WebSocket(WS_URL);

        const drawChartToPhaser = () => {
            const chartCanvas = document.querySelector(`#${this.containerId} canvas`) as HTMLCanvasElement;
            const chartTex = this.textures.get('chartTexture') as Phaser.Textures.CanvasTexture;

            if (chartCanvas && chartTex) {
                const ctx = chartTex.getContext();

                const width = chartCanvas.width;
                const height = chartCanvas.height;

                // canvas 크기 바뀐 경우 다시 생성
                if (
                    chartTex.getSourceImage().width !== width ||
                    chartTex.getSourceImage().height !== height
                ) {
                    this.textures.remove('chartTexture');
                    this.textures.createCanvas('chartTexture', width, height);
                    this.chartImage.setTexture('chartTexture');
                }

                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(chartCanvas, 0, 0, width, height);
                chartTex.refresh();

                this.updateChartImagePosition(); // 위치 갱신
            }

            requestAnimationFrame(drawChartToPhaser);
        };

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
        this.renderRanking(null);
        this.timeText = this.add.text(this.cameras.main.centerX, 20, `Time: ${this.remainingTime}`, {
            font: '20px Arial',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.startTime = Math.floor(Date.now() / 1000);

        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (this.tickBuffer.length === 0) return;

                const finalizedCandle = this.makeCandle(this.tickBuffer, this.logicalTime);
                this.candles.push(finalizedCandle);
                this.series.update(finalizedCandle); // 또는 this.series.setData(this.candles) but not preferred here

                this.logicalTime++;
                this.tickBuffer = [this.currentPrice]; // 다음 봉 시작점
            },
        });

        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                this.remainingTime--;
                if (this.remainingTime >= 0) {
                    this.timeText.setText(`Time: ${this.remainingTime}`);
                }
                if (this.remainingTime <= 0 && !this.gameEnded) {
                    this.gameEnded = true;
                    this.result();
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
            
                const scorePayload: ScoreMessage = {
                    userCode: userId,  // 또는 this.userCode 등으로 동적으로
                    userName: nickname,
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
                this.tweens.add({
                    targets: text,
                    alpha: { from: 0, to: 1 },
                    duration: 300,
                    ease: 'Cubic.easeIn',
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
        this.setupChartContainerAndChart();
        this.startChartToPhaserLoop();
        const chartCanvasEl = document.querySelector(`#${this.containerId} canvas`)!;
        if (potgManager.getIsRecording()) {
            const clearBeforeStart = async () => {
                await potgManager.stopRecording();
                //potgManager.startCanvasRecording(60);
                potgManager.startMergedRecording(
                this.game.canvas,
                chartCanvasEl,
                60
                );
                //potgManager.startMergedRecording(this.game.canvas, this.containerId, 60);
            };
            clearBeforeStart();
        }
           // else potgManager.startCanvasRecording(60);
           potgManager.startMergedRecording(
            this.game.canvas,
            chartCanvasEl,
            60
            );
          //else potgManager.startMergedRecording(this.game.canvas, this.containerId, 60);
    }

    private logicalTime: number = 0;  // 봉 단위로 증가하는 시간
    private generateTick() {
        const baseVolatility = this.currentPrice * 0.15;
        const spikeVolatility = this.currentPrice * 0.45;
        const spikeChance = 0.09;

        const isSpike = this.prng() < spikeChance;
        const volatility = isSpike ? spikeVolatility : baseVolatility;
        const change = (this.prng() - 0.488) * volatility;

        this.currentPrice += change;
        this.currentPrice = Number(this.currentPrice.toFixed(2));

        this.tickBuffer.push(this.currentPrice);

        // 🔄 매 틱마다 현재 진행 중인 봉을 update
        const tempCandle = this.makeCandle(this.tickBuffer, this.logicalTime);
        this.series.update(tempCandle);
    }


    private makeCandle(ticks: number[], time: number): CandlestickData {
        const open = ticks[0] ?? this.currentPrice;
        const close = ticks[ticks.length - 1] ?? open;
        const high = Math.max(...ticks);
        const low = Math.min(...ticks);
        return { time, open, high, low, close };

    }
    private renderRanking(data: ScoreMessage[] | null) {
    // 기존 제거
    this.rankingTexts.forEach(c => c.destroy());
    this.rankingTexts = [];

    const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const baseY = 80;
    const startX = this.cameras.main.centerX;

    const entries = data?.slice(0, 5) ?? [];

    // 빈 상태라면 기본 메시지 표시
    if (entries.length === 0) {
        const emptyText = this.add.text(startX, baseY, '랭킹 정보 없음', {
            font: '24px Arial',
            color: '#888888',
        }).setOrigin(0.5);
        this.rankingTexts.push(this.add.container(0, 0, [emptyText]));
        return;
    }

    entries.forEach((entry, index) => {
        const rank = index + 1;
        const y = baseY + index * 60;

        const emoji = rankEmojis[index] || `${rank}.`;

        const rankText = this.add.text(0, 0, `${emoji}`, {
            font: '28px Arial',
            color: '#ffffff',
        }).setOrigin(0, 0.5);

        const nameText = this.add.text(50, 0, `${entry.userName}`, {
            font: '24px Arial',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        const scoreText = this.add.text(250, 0, `${entry.earnedScore}점`, {
            font: '24px Arial',
            color: '#aaaaaa',
        }).setOrigin(1, 0.5);

        const container = this.add.container(startX - 150, y, [rankText, nameText, scoreText]);
        this.rankingTexts.push(container);

        this.tweens.add({
            targets: container,
            scale: { from: 1.2, to: 1 },
            duration: 300,
            ease: 'Back.easeOut',
        });
    });
    }
    
    
    /*
    private renderAttemptList() {
    // 기존 텍스트 제거
    this.attemptTexts.forEach(t => t.destroy());
    this.attemptTexts = [];

    const title = this.add.text(20, 20, `📌 시도 기록`, {
        font: '22px Arial',
        color: '#FFD700',
        fontStyle: 'bold',
    });
    this.attemptTexts.push(title);

    this.attempts.forEach((price, index) => {
        let indicator = "";
        if (index === 0) {
            indicator = "🟢▲ 첫 시도";
        } else {
            const prev = this.attempts[index - 1];
            if (price > prev) {
                indicator = "🟢▲ 상승";
            } else if (price < prev) {
                indicator = "🔴▼ 하락";
            } else {
                indicator = "➖ 동일";
            }
        }

        const text = this.add.text(20, 60 + index * 30, `시도 ${index + 1}: ${price} (${indicator})`, {
            font: '20px Arial',
            color: '#ffffff'
        });
        this.attemptTexts.push(text);
    });
}*/
    update() {
    if (!this.chartCanvas || !this.chartTex) return;

    const width = this.chartCanvas.width;
    const height = this.chartCanvas.height;
    const ctx = this.chartTex.getContext();

    if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.chartCanvas, 0, 0, width, height);
        this.chartTex.refresh(); // ✅ 꼭 호출해야 화면에 반영됨
        }
    }

    shutdown() {
        const container = document.getElementById(this.containerId);
        if (container) container.remove();
        if (this.timer) this.timer.remove(false);
    }
    private showScoreGauge(scorePercent: number) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    const barWidth = 300;
    const barHeight = 30;

    const background = this.add.rectangle(centerX, centerY, barWidth, barHeight, 0x333333).setOrigin(0.5);
    const fill = this.add.rectangle(centerX - barWidth / 2, centerY, 0, barHeight, 0x00ff00).setOrigin(0, 0.5);
    const text = this.add.text(centerX, centerY - 40, `📊 점수: ${scorePercent}%`, {
        font: '24px Arial',
        color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
        targets: fill,
        width: (barWidth * scorePercent) / 100,
        duration: 1000,
        ease: 'Cubic.easeOut',
    });

    // 3초 후 사라짐
    this.time.addEvent({
        delay: 3000,
        callback: () => {
            background.destroy();
            fill.destroy();
            text.destroy();
        }
    });
}
    getFinalScore() {
    if (!this.attempts || this.attempts.length === 0) {
        return 0;
    }

    const myBestAttempt = Math.max(...this.attempts);

    // 전체 유저의 최고 시도 점수 가져오기
    const globalBestAttempt = this.latestRanking.length > 0
        ? Math.max(...this.latestRanking.map(r => r.earnedScore))
        : 1; // fallback 방지

    const normalizedScore = Math.min(100, Math.floor((myBestAttempt / globalBestAttempt) * 100));

    return normalizedScore;
    }
    result() {
        const elapsedTime = Date.now() - this.gameStartedTime;
        const finalScore = this.getFinalScore();

        this.showScoreGauge(finalScore);

        this.shutdown() 
        if (potgManager.getIsRecording()) {
            potgManager.stopRecording();
        }

        // pop up result
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.start("GameOver", {
                    score: finalScore,
                    gameType: "GraphHigh",
                });
            },
        });
    }
}
