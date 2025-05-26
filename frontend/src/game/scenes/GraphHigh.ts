import { Scene } from "phaser";
import { createChart, IChartApi, CandlestickData, LineStyle } from "lightweight-charts";
import { userStore } from "../../stores/userStore";
import potgManager from "../../modules/POTGManager";

interface ScoreMessage {
    userCode: string;
    userName: string;
    earnedScore: number;
    totalScore: number;
}
const { startAt, currentMs } = userStore.getState();
const nowLocal = Date.now();
const offset = currentMs - nowLocal;
const delayUntilStart = startAt - (nowLocal + offset);
export class GraphHigh extends Scene {
    

    private ws?: WebSocket;
    private uiCtx!: CanvasRenderingContext2D;
    private latestRanking: ScoreMessage[] = [];
    private chart!: IChartApi;
    private series!: ReturnType<IChartApi["addCandlestickSeries"]>;
    private tickBuffer: number[] = [];
    private candles: CandlestickData[] = [];
    private prevRanking: ScoreMessage[] = [];    // ①
    private rankDiffs: number[] = [];
    private currentPrice = 1000;
    private logicalTime = 0;
    private remainingTime = 30;
    private attempts: number[] = [];
    private containerId = "chart-container";
    private prng!: () => number;

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

    private mulberry32(seed: number): () => number {
        return () => {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    init() {
        const { roomCode } = userStore.getState();
        this.prng = this.mulberry32(this.hashRoomCodeToSeed(roomCode));
        this.logicalTime = 0;
    }

    preload() {
        this.load.start();
    }

    async create() {
        this.createChartContainer();
        this.setupChart();

        const { currentMs } = userStore.getState();
        const localNow = Date.now();
        const offset = currentMs - localNow;
        const forcedStartAt = currentMs + 7000;
        const delayUntilStart = forcedStartAt - (localNow + offset);

        // ✅ 타이머 오버레이 생성 (Phaser 캔버스 기준)
        const canvas = this.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        const blocker = document.createElement('div');
        blocker.id = 'graphhigh-wait-blocker';
        Object.assign(blocker.style, {
            position: 'absolute',
            top: `${canvasRect.top}px`,
            left: `${canvasRect.left}px`,
            width: `${canvasRect.width}px`,
            height: `${canvasRect.height}px`,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: '10000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto', // ← 이걸로 캔버스 인터랙션 차단
        });

        const timerText = document.createElement('div');
        timerText.id = 'graphhigh-wait-timer';
        Object.assign(timerText.style, {
            color: 'white',
            fontSize: '32px',
            fontFamily: 'Jua, sans-serif',
            textAlign: 'center',
        });

        blocker.appendChild(timerText);
        document.body.appendChild(blocker);

        // ⏱️ 실시간 타이머 갱신
        const startMs = Date.now();
        const updateTimer = () => {
            const elapsed = Date.now() - startMs;
            const remain = Math.ceil((delayUntilStart - elapsed) / 1000);
            timerText.textContent = `게임 시작까지 ${remain}초`;
        };
        updateTimer();
        const interval = setInterval(updateTimer, 500);

        // ✅ 캔버스 위치 변경 대응 (리사이즈 이벤트)
        const onResize = () => {
            const r = canvas.getBoundingClientRect();
            blocker.style.top = `${r.top}px`;
            blocker.style.left = `${r.left}px`;
            blocker.style.width = `${r.width}px`;
            blocker.style.height = `${r.height}px`;
        };
        window.addEventListener('resize', onResize);

        // ✅ 게임 시작 시 오버레이 제거
        this.time.delayedCall(delayUntilStart, () => {
            clearInterval(interval);
            window.removeEventListener('resize', onResize);
            blocker.remove();
            this.startGame();
        }, [], this);
    }






    private async startGame() {
        const { roomCode, nickname, userId } = userStore.getState();

        // WebSocket 연결
        const params = new URLSearchParams({ roomCode, roundCode: "0", userCode: userId }).toString();
        this.ws = new WebSocket(`${import.meta.env.VITE_WEBSOCKET_URL}/game/kjh/ws/graphhigh?${params}`);
        this.ws.onopen = () => {
            const payload: ScoreMessage = { userCode: userId, userName: nickname, earnedScore: 0, totalScore: 0 };
            this.ws?.send(JSON.stringify(payload));
        };
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { scoreRanking: ScoreMessage[] };
                this.renderRanking(data.scoreRanking);
            } catch {
                console.error("Ranking parse error");
            }
        };
        this.ws.onerror = console.error;
        this.ws.onclose = e => console.log(`WebSocket closed: ${e.code}`);

        // 캔들 생성 시작
        this.scheduleNextTick();

        // 1초 타이머 감소 시작
        this.time.addEvent({ delay: 1000, loop: true, callback: () => {
                this.remainingTime--;
                const t = document.getElementById('time-display');
                if (t) t.textContent = `Time: ${this.remainingTime}`;
                if (this.remainingTime <= 0) this.result();
            }});

        // 1초마다 캔들 렌더링
        this.time.addEvent({ delay: 1000, loop: true, callback: () => {
                if (this.tickBuffer.length) {
                    const candle = this.makeCandle(this.tickBuffer, this.logicalTime++);
                    this.candles.push(candle);
                    this.series.update(candle);
                    this.tickBuffer = [this.currentPrice];
                }
            }});

        // 녹화
        if (potgManager.getIsRecording()) await potgManager.stopRecording();
        potgManager.startMergedRecording(this.game.canvas, this.containerId, 60);
    }



    private scheduleNextTick() {
        const delay = Phaser.Math.Between(70, 120);
        this.time.delayedCall(delay, () => {
            this.generateTick();
            this.scheduleNextTick();
        });
    }

    private generateTick() {
        const baseVolatility = this.currentPrice * 0.15;
        const spikeVolatility = this.currentPrice * 0.45;
        const spikeChance = 0.09;
        const volatility = this.prng() < spikeChance ? spikeVolatility : baseVolatility;
        const change = (this.prng() - 0.488) * volatility;
        this.currentPrice = Number((this.currentPrice + change).toFixed(2));
        this.tickBuffer.push(this.currentPrice);
        const temp = this.makeCandle(this.tickBuffer, this.logicalTime);
        this.series.update(temp);
    }

    private makeCandle(ticks: number[], time: number): CandlestickData {
        const open = ticks[0] ?? this.currentPrice;
        const close = ticks[ticks.length - 1] ?? open;
        const high = Math.max(...ticks);
        const low = Math.min(...ticks);
        return { time, open, high, low, close };
    }

    private createChartContainer() {
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        let container = document.getElementById(this.containerId);
        if (!container) {
            container = document.createElement("div");
            container.id = this.containerId;
            Object.assign(container.style, {
                position: "absolute",
                top: `${rect.top}px`, left: `${rect.left}px`,
                width: `${rect.width}px`, height: `${rect.height}px`,
                pointerEvents: "none", zIndex: "1000", background: "transparent",
            });
            document.body.appendChild(container);
        }
        window.addEventListener("resize", () => {
            const r2 = canvas.getBoundingClientRect();
            Object.assign(container!.style, {
                top: `${r2.top}px`, left: `${r2.left}px`,
                width: `${r2.width}px`, height: `${r2.height}px`,
            });
            this.chart?.resize(r2.width, r2.height);
        });
    }

    private setupChart() {
        const container = document.getElementById(this.containerId)!;
        let wrapper = container.querySelector<HTMLDivElement>('#chart-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div'); wrapper.id = 'chart-wrapper';
            Object.assign(wrapper.style, {
                position: 'absolute', width: `${container.clientWidth * 0.8}px`,
                height: `${container.clientHeight * 0.7}px`, left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)', pointerEvents: 'none', backgroundColor: 'transparent',
            });
            container.appendChild(wrapper);
        } else {
            wrapper.style.width = `${container.clientWidth * 0.8}px`;
            wrapper.style.height = `${container.clientHeight * 0.7}px`;
        }
        wrapper.innerHTML = '';
        const cw = wrapper.clientWidth, ch = wrapper.clientHeight;
        this.chart = createChart(wrapper, {
            width: cw, height: ch,
            layout: { background: { color: 'transparent' }, textColor: "#d1d4dc", attributionLogo: false },
            grid: { vertLines: { visible: false }, horzLines: { visible: false } },
            priceScale: { borderVisible: true, borderColor: '#d1d4dc' },
            timeScale: { timeVisible: true, secondsVisible: true, borderVisible: true, borderColor: '#d1d4dc' },
        });
        this.series = this.chart.addCandlestickSeries();
        this.series.setData(this.candles);
        wrapper.querySelectorAll<HTMLCanvasElement>('canvas').forEach(c => c.style.backgroundColor = 'transparent');

        /* HUD and UI canvas
        
        const hud = document.createElement('div'); hud.id = 'chart-hud';
        Object.assign(hud.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', color: '#fff', fontFamily: 'Jua, sans-serif', zIndex: '2' });
        const timeEl = document.createElement('div'); timeEl.id = 'time-display';
        Object.assign(timeEl.style, { position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', fontSize: '20px' });
        timeEl.textContent = `Time: ${this.remainingTime}`;
        hud.appendChild(timeEl);
        wrapper.appendChild(hud);
        */
           // (HTML 타이머 숨기기)
        const hud = document.createElement('div');
        hud.style.display = 'none';
        wrapper.appendChild(hud);
 
        const uiCanvas = document.createElement('canvas'); uiCanvas.id = 'ui-canvas'; uiCanvas.width = cw; uiCanvas.height = ch;
        Object.assign(uiCanvas.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'auto', zIndex: '2' });
        wrapper.appendChild(uiCanvas);
        this.uiCtx = uiCanvas.getContext('2d')!;
        uiCanvas.addEventListener('pointerdown', event => {
            const rect = uiCanvas.getBoundingClientRect();
            const scaleX = uiCanvas.width / rect.width, scaleY = uiCanvas.height / rect.height;
            const x = (event.clientX - rect.left) * scaleX, y = (event.clientY - rect.top) * scaleY;
            const btnW = uiCanvas.width * 0.2, btnH = uiCanvas.height * 0.1;
            const btnX = (uiCanvas.width - btnW) / 2, btnY = uiCanvas.height - btnH - uiCanvas.height * 0.05;
            if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) this.onScore();
        });
    }

 private drawUI() {
     const ctx = this.uiCtx, W = ctx.canvas.width, H = ctx.canvas.height;
     ctx.clearRect(0, 0, W, H);
    

    // 공통: 텍스트 수직 중앙 정렬
    ctx.textBaseline = 'middle';

    // ─── 타이머 다시 그리기 ─────────────────────────
    // 5초 이하일 땐 500ms 단위로 깜빡임
    const timerX = W / 2;
    const timerY = H * 0.08;
    if (this.remainingTime <= 5) {
      const blink = Math.floor(Date.now() / 500) % 2 === 0;
      ctx.fillStyle = blink ? '#ff4d4f' : '#fff';  // 빨강/흰색 깜빡
    } else {
      ctx.fillStyle = '#fff';
    }
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    ctx.font        = `${Math.floor(H * 0.04)}px Jua`;
    ctx.fillText(`Time: ${this.remainingTime}`, timerX, timerY);
    // ────────────────────────────────────────────────

    // 1) 랭킹용 배경 컨테이너
    const entries = this.latestRanking.slice(0, 5);
    const lineH   = H * 0.06;
    const padding = H * 0.015;
    const bgX     = W * 0.02;
    const bgY     = H * 0.02;
    // 배경 너비: 아이콘+이름+점수+변동폭 중 최대값 + 여유
    ctx.font = `${Math.floor(lineH * 0.6)}px Jua`;
    let maxTextWidth = 0;
    entries.forEach((e, i) => {
      const diff = this.rankDiffs[i] || 0;
      const diffTxt = diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '';
      const sample = ['🥇','🥈','🥉','4️⃣','5️⃣'][i] + e.userName + `${e.earnedScore}점` + diffTxt;
      maxTextWidth = Math.max(maxTextWidth, ctx.measureText(sample).width);
    });
    const bgW = maxTextWidth + W * 0.06;
    const bgH = entries.length * lineH + padding * 2;
    ctx.fillStyle = 'rgba(255,192,203,0.3)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bgX, bgY, bgW, bgH, 8);
    }
    ctx.fill();

    // 2) 랭킹 텍스트 + 순위 변동
    ctx.fillStyle = '#ffa69e';
    ctx.textAlign = 'left';
    entries.forEach((e, i) => {
    // 1) 아이콘
    const y     = bgY + padding + i * lineH + lineH/2;
    const iconX = bgX + W*0.01;
    ctx.fillStyle = '#ffa69e';
    ctx.fillText(['🥇','🥈','🥉','4️⃣','5️⃣'][i], iconX, y);

    // 2) 이름
    const nameX = iconX + W*0.06;
    ctx.fillText(e.userName, nameX, y);

    // 3) 점수
    const scoreText = `${e.earnedScore}점`;
    const scoreX    = nameX + ctx.measureText(e.userName).width + W*0.02;
    ctx.fillText(scoreText, scoreX, y);

    // 4) 변동 또는 NEW!
    const oldIdx = this.prevRanking.findIndex(p => p.userCode === e.userCode);
    let diffText = '';
    let color    = '';

    if (oldIdx < 0) {
        // 이전 랭킹에 없던 완전 신규!
        diffText = 'NEW!';
        color    = '#FF69B4';   // 진한 핑크
    } else {
        const delta = oldIdx - i;
        if (delta > 0) {
        diffText = `▲${delta}`;
        color    = '#FFD700'; // 골드
        } else if (delta < 0) {
        diffText = `▼${-delta}`;
        color    = '#87CEFA'; // 연한 블루
        }
    }

    if (diffText) {
        const widthScore = ctx.measureText(scoreText).width;
        const pxPadding  = 4;
        const diffX      = scoreX + widthScore + pxPadding;
        ctx.fillStyle    = color;
        ctx.fillText(diffText, diffX, y);
        // 텍스트 색 복구
        ctx.fillStyle    = '#ffa69e';
    }
    });


    // 3) 동글동글 “지금!!” 버튼 + 남은 시도횟수
     // 텍스트 준비
     const maxAttempts = 3;
     const remain = maxAttempts - this.attempts.length;
     const btnText = `지금!! (${remain}/${maxAttempts})`;

     ctx.font = `${Math.floor(H * 0.04)}px Jua`;
     const textWidth = ctx.measureText(btnText).width;

// 🔧 변수명 변경
     const btnPadding = W * 0.02;
     const btnW = textWidth + btnPadding * 2.5;
     const btnH = H * 0.09;
     const btnX = (W - btnW) / 2;
     const btnY = H - btnH - H * 0.03;
     const r = btnH / 2;

     ctx.fillStyle = '#ffa69e';
     ctx.beginPath();
     if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnW, btnH, r);
     ctx.fill();

     ctx.fillStyle = '#1e1e1e';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     ctx.font = `${Math.floor(btnH * 0.4)}px Jua`;
     ctx.fillText(btnText, btnX + btnW / 2, btnY + btnH / 2);

 }

    private renderRanking(entries: ScoreMessage[]) {
        // ② 이전 랭킹과 비교해 변동량 계산
        this.rankDiffs = entries.map((entry, newIdx) => {
            const oldIdx = this.prevRanking.findIndex(e => e.userCode === entry.userCode);
            return oldIdx >= 0 ? oldIdx - newIdx : 0;
        });
        this.latestRanking = entries;
        this.prevRanking = [...entries];
    }

    private onScore() {
        if (this.attempts.length >= 3 || this.remainingTime <= 0) return;
        const cur = this.currentPrice;
        this.attempts.push(cur);
        this.series.createPriceLine({ price: cur, color: 'red', lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `시도 ${this.attempts.length}` });
        const { userId, nickname } = userStore.getState();
        this.ws?.send(JSON.stringify({ userCode: userId, userName: nickname, earnedScore: cur, totalScore: this.attempts.reduce((a, b) => a + b, 0) }));
        this.cameras.main.shake(250, 0.01);
    }

    private getFinalScore(): number {
        if (!this.attempts.length) return 0;
        const best = Math.max(...this.attempts);
        const globalBest = this.latestRanking.length ? Math.max(...this.latestRanking.map(r => r.earnedScore)) : 1;
        return Math.min(100, Math.floor(best / globalBest * 100));
    }

    private showScoreGauge(percent: number) {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const w  = 500;
    const h  = 30;

    // --- 1) 기본 게이지 ---
    const bg   = this.add.rectangle(cx, cy, w, h, 0x333333).setOrigin(0.5);
    const fill = this.add.rectangle(cx - w/2, cy, 0, h, 0x00ff00).setOrigin(0, 0.5);
    this.tweens.add({
      targets: fill,
      width: w * percent / 100,
      duration: 5000,
      ease: 'Cubic.easeOut'
    });

    // --- 2) “📊 점수: XX%” 텍스트 ---
    const txt = this.add.text(cx, cy - 40, `📊 점수: ${percent}%`, {
      font: '24px Jua',
      color: '#fff'
    }).setOrigin(0.5);

    // --- 3) 수식 표현 (“🧮 (내점수/최고점)×100” 모양) ---
    const best        = Math.max(...this.attempts);
    const globalBest  = this.latestRanking.length
      ? Math.max(...this.latestRanking.map(r => r.earnedScore))
      : best;
    // 배경 버튼처럼
    const formulaW    = w * 0.8;
    const formulaH    = 40;
    const formulaY    = cy - 80;
    const formBg = this.add.rectangle(cx, formulaY, formulaW, formulaH, 0xffa69e)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x1e1e1e);
    // 아이콘 + 수식 텍스트
    const formulaText = `🧮 (${best}/${globalBest}) × 100 = ${percent}%`;
    const formTxt = this.add.text(cx, formulaY, formulaText, {
      font: '18px Jua',
      color: '#1e1e1e'
    }).setOrigin(0.5);

    // --- 4) 3초 뒤 모두 정리 ---
    this.time.delayedCall(8000, () => {
      bg.destroy();
      fill.destroy();
      txt.destroy();
      formBg.destroy();
      formTxt.destroy();
    });
}

    update() {
        if (!this.uiCtx) return; // 아직 차트 초기화 안 됨
        this.drawUI();
    }


    private result() {
        const score = this.getFinalScore();
        this.showScoreGauge(score);
        this.shutdown();
        if (potgManager.getIsRecording()) potgManager.stopRecording();
        this.time.delayedCall(1000, () => this.scene.start("GameOver", { score, gameType: "GraphHigh" }));
    }

    private shutdown() {
        const c = document.getElementById(this.containerId);
        if (c) c.remove();
    }
}
