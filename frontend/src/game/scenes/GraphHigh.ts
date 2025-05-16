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

export class GraphHigh extends Scene {
    private ws?: WebSocket;
    private chartImage!: Phaser.GameObjects.Image;
    private chartTex!: Phaser.Textures.CanvasTexture;
    private uiCtx!: CanvasRenderingContext2D;
    private rankingTexts: Phaser.GameObjects.Container[] = [];
    private latestRanking: ScoreMessage[] = [];
    private chart!: IChartApi;
    private series!: ReturnType<IChartApi["addCandlestickSeries"]>;
    private tickBuffer: number[] = [];
    private candles: CandlestickData[] = [];
    private currentPrice = 1000;
    private logicalTime = 0;
    private remainingTime = 30;
    private attempts: number[] = [];
    private gameStartedTime = Date.now();
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
        this.children.list.forEach(go => {
            if (go instanceof Phaser.GameObjects.Text || go instanceof Phaser.GameObjects.Container) {
                go.setVisible(false);
            }
        });

        // ── 2) HTML HUD 로 올라간 기존 UI 숨기기 ── ['chart-hud','time-display','score-button']
        ['chart-hud','time-display'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const { roomCode, nickname, userId } = userStore.getState();

        // WebSocket connection
        const params = new URLSearchParams({ roomCode, roundCode: "0", userCode: userId }).toString();
        const WS_URL = `${import.meta.env.VITE_WEBSOCKET_URL}/game/kjh/ws/graphhigh?${params}`;
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            const payload: ScoreMessage = { userCode: userId, userName: nickname, earnedScore: 0, totalScore: 0 };
            this.ws?.send(JSON.stringify(payload));
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { scoreRanking: ScoreMessage[] };
                this.renderRanking(data.scoreRanking);
                this.latestRanking = data.scoreRanking;
            } catch {
                console.error("Ranking parse error");
            }
        };

        this.ws.onerror = console.error;
        this.ws.onclose = (e) => console.log(`WebSocket closed: ${e.code}`);

        // Chart setup
        this.createChartContainer();
        this.setupChart();

        // Candle-building timer
        this.time.addEvent({
            delay: 1000, loop: true, callback: () => {
                if (this.tickBuffer.length) {
                    const candle = this.makeCandle(this.tickBuffer, this.logicalTime++);
                    this.candles.push(candle);
                    this.series.update(candle);
                    this.tickBuffer = [this.currentPrice];
                }
            }
        });
        
        // Countdown timer
        this.time.addEvent({
            delay: 1000, loop: true, callback: () => {
                this.remainingTime--;
                const t = document.getElementById('time-display');
                if (t) t.textContent = `Time: ${this.remainingTime}`;
                if (this.remainingTime <= 0) this.result();
            }
        });

        this.scheduleNextTick();

        // Recording
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
                position:       "absolute",
                top:            `${rect.top}px`,
                left:           `${rect.left}px`,
                width:          `${rect.width}px`,
                height:         `${rect.height}px`,
                pointerEvents:  "none",
                zIndex:         "1000",
                background:     "transparent",
            });
            document.body.appendChild(container);
        }

        window.addEventListener("resize", () => {
            const r2 = canvas.getBoundingClientRect();
            container!.style.top    = `${r2.top}px`;
            container!.style.left   = `${r2.left}px`;
            container!.style.width  = `${r2.width}px`;
            container!.style.height = `${r2.height}px`;
            this.chart?.resize(r2.width, r2.height);
        });
    }

    private setupChart() {
        const container = document.getElementById(this.containerId)!;

        let wrapper = container.querySelector<HTMLDivElement>('#chart-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'chart-wrapper';
            Object.assign(wrapper.style, {
                position:       'absolute',
                width:          `${container.clientWidth * 0.8}px`,
                height:         `${container.clientHeight * 0.7}px`,
                left:           '50%',
                top:            '50%',
                transform:      'translate(-50%, -50%)',
                pointerEvents:  'none',
                backgroundColor:'transparent',
            });
            container.appendChild(wrapper);
        } else {
            const cw = container.clientWidth  * 0.8;
            const ch = container.clientHeight * 0.7;
            wrapper.style.width  = `${cw}px`;
            wrapper.style.height = `${ch}px`;
        }

        wrapper.innerHTML = '';

        const cw = wrapper.clientWidth;
        const ch = wrapper.clientHeight;
        this.chart = createChart(wrapper, {
            width:  cw,
            height: ch,
            layout: {
                background:      { color: 'transparent' },
                textColor:       "#d1d4dc",
                attributionLogo: false,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            priceScale: {
                borderVisible: true,
                borderColor:   '#d1d4dc',
            },
            timeScale: {
                timeVisible:    true,
                secondsVisible: true,
                borderVisible:  true,
                borderColor:    '#d1d4dc',
            },
        });
        this.series = this.chart.addCandlestickSeries();
        this.series.setData(this.candles);

        // Make chart canvas background transparent
        wrapper.querySelectorAll<HTMLCanvasElement>('canvas').forEach(c => {
            c.style.backgroundColor = 'transparent';
        });

        // ── HTML HUD ──
        const hud = document.createElement('div');
        hud.id = 'chart-hud';
        Object.assign(hud.style, {
            position:      'absolute',
            top:           '0',
            left:          '0',
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
            color:         '#ffffff',
            fontFamily:    'Jua, sans-serif',
            zIndex:        '2',
        });

        // Time display
        const timeEl = document.createElement('div');
        timeEl.id = 'time-display';
        Object.assign(timeEl.style, {
            position:  'absolute',
            top:       '10px',
            left:      '50%',
            transform: 'translateX(-50%)',
            fontSize:  '20px',
            display: 'none',
        });
        timeEl.textContent = `Time: ${this.remainingTime}`;
        hud.appendChild(timeEl);

        /* Score button
        const btn = document.createElement('button');
        btn.id = 'score-button';
        btn.textContent = '기회 사용';
        Object.assign(btn.style, {
            position:      'absolute',
            bottom:        '80px',
            left:          '50%',
            transform:     'translateX(-50%)',
            padding:       '8px 16px',
            background:    '#0080ff',
            color:         '#fff',
            border:        'none',
            borderRadius:  '4px',
            fontSize:      '18px',
            cursor:        'pointer',
            pointerEvents: 'auto',
            zIndex:        '3',
        });
        btn.addEventListener('click', () => this.onScore());
        hud.appendChild(btn);
        */
        wrapper.appendChild(hud);
        const uiCanvas = document.createElement('canvas');
        uiCanvas.id = 'ui-canvas';
        uiCanvas.width  = cw;
        uiCanvas.height = ch;
        Object.assign(uiCanvas.style, {
        position:       'absolute',
        top:            '0',
        left:           '0',
        pointerEvents:  'auto',
        zIndex:         '2',
        });
        wrapper.appendChild(uiCanvas);
        this.uiCtx = uiCanvas.getContext('2d')!;

            // ─── 캔버스 클릭 처리: 버튼 영역(가로 120×세로 40, 중앙 하단) 안이면 onScore() 호출
        uiCanvas.addEventListener('pointerdown', (event) => {
            const rect = uiCanvas.getBoundingClientRect();
            const scaleX = uiCanvas.width  / rect.width;
            const scaleY = uiCanvas.height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top ) * scaleY;

            // 위 drawUI와 동일한 버튼 영역 계산
            const btnW = uiCanvas.width  * 0.2;
            const btnH = uiCanvas.height * 0.1;
            const btnX = (uiCanvas.width  - btnW) / 2;
            const btnY = uiCanvas.height - btnH - uiCanvas.height * 0.05;

            if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
                this.onScore();
            }
        });
    }

    private drawUI() {
  const ctx = this.uiCtx;
  const W   = ctx.canvas.width;
  const H   = ctx.canvas.height;

  ctx.clearRect(0, 0, W, H);

  // 1) 시간
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font      = `${Math.floor(H * 0.05)}px Jua`;
  ctx.fillText(`Time: ${this.remainingTime}`, W / 2, H * 0.05 + H * 0.03);

  // 2) “기회 사용” 버튼
  const btnW = W * 0.2;
  const btnH = H * 0.1;
  const btnX = (W - btnW) / 2;
  const btnY = H - btnH - H * 0.05;
  ctx.fillStyle = this.attempts.length < 3
    ? '#0080ff'
    : 'rgba(0,128,255,0.5)';
  ctx.fillRect(btnX, btnY, btnW, btnH);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font      = `${Math.floor(btnH * 0.6)}px Jua`;
  ctx.fillText('지금!!', W / 2, btnY + btnH * 0.65);

  // 3) 랭킹 (최대 5명)
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font      = `${Math.floor(H * 0.04)}px Jua`;
  const startX = W * 0.05;
  let y = H * 0.05;
  const lineH = H * 0.10;
  const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  this.latestRanking.slice(0, 5).forEach((e, i) => {
    const rankIcon = emojis[i] || `${i + 1}.`;
    const score    = (e.earnedScore || e.earnedScore === 0)
      ? e.earnedScore
      : e.totalScore;

    // 순위
    ctx.fillText(rankIcon, startX, y);

    // 이름
    const nameX = startX + W * 0.06;
    ctx.fillText(e.userName, nameX, y);

    // 점수
    const nameW = ctx.measureText(e.userName).width;
    ctx.fillText(`${score}점`, nameX + nameW + W * 0.02, y);

    y += lineH;
  });
}

    renderRanking(entries: ScoreMessage[]) {
        this.latestRanking = entries;
        /*
        this.rankingTexts.forEach(c => c.destroy());
        this.rankingTexts = [];
        if (!entries.length) {
            const t = this.add.text(this.cameras.main.centerX, 80, '랭킹 정보 없음', { font:'24px Jua', color:'#888' }).setOrigin(0.5);
            this.rankingTexts.push(this.add.container(0,0,[t]));
            return;
        }
        const emojis = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        entries.slice(0,5).forEach((e,i) => {
            const y = 80 + i*60;
            const rank = emojis[i]||`${i+1}.`;
            const rt = this.add.text(0,0,rank,{font:'28px Jua',color:'#fff'}).setOrigin(0,0.5);
            const nt = this.add.text(50,0,e.userName,{font:'24px Jua',color:'#fff'}).setOrigin(0,0.5);
            const st = this.add.text(250,0,`${e.earnedScore}점`,{font:'24px Jua',color:'#aaa'}).setOrigin(1,0.5);
            const cont = this.add.container(this.cameras.main.centerX-150,y,[rt,nt,st]);
            this.rankingTexts.push(cont);
            this.tweens.add({targets:cont,scale:{from:1.2,to:1},duration:300,ease:'Back.easeOut'});
        });
        */
    }

    private onScore() {
        if (this.attempts.length >= 3 || this.remainingTime <= 0) return;
        const cur = this.currentPrice;
        this.attempts.push(cur);
        this.series.createPriceLine({
            price: cur,
            color: 'red',
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `시도 ${this.attempts.length}`
        });
        const { userId, nickname } = userStore.getState();
        const payload: ScoreMessage = {
            userCode: userId,
            userName: nickname,
            earnedScore: cur,
            totalScore: this.attempts.reduce((a, b) => a + b, 0)
        };
        this.ws?.send(JSON.stringify(payload));
        this.cameras.main.shake(250, 0.01);

        if (this.attempts.length >= 3) {
            const btn = document.getElementById('score-button') as HTMLButtonElement;
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'default';
            }
        }
    }

    private getFinalScore(): number {
        if (!this.attempts.length) return 0;
        const best = Math.max(...this.attempts);
        const globalBest = this.latestRanking.length
            ? Math.max(...this.latestRanking.map(r => r.earnedScore))
            : 1;
        return Math.min(100, Math.floor(best / globalBest * 100));
    }

    private showScoreGauge(percent: number) {
        const cx = this.cameras.main.centerX, cy = this.cameras.main.centerY;
        const w = 300, h = 30;
        const bg = this.add.rectangle(cx, cy, w, h, 0x333333).setOrigin(0.5);
        const fill = this.add.rectangle(cx - w/2, cy, 0, h, 0x00ff00).setOrigin(0, 0.5);
        const txt = this.add.text(cx, cy - 40, `📊 점수: ${percent}%`, { font: '24px Jua', color: '#fff' }).setOrigin(0.5);
        this.tweens.add({ targets: fill, width: w * percent / 100, duration: 1000, ease: 'Cubic.easeOut' });
        this.time.delayedCall(3000, () => { bg.destroy(); fill.destroy(); txt.destroy(); });
    }
    update() {
    // redraw your HTML-CANVAS–based UI every frame
    this.drawUI();
    }
    private result() {
        const score = this.getFinalScore();
        this.showScoreGauge(score);
        this.shutdown();
        if (potgManager.getIsRecording()) potgManager.stopRecording();
        this.time.delayedCall(1000, () => this.scene.start("GameOver", { score, gameType: "GraphHigh" }));
    }

    shutdown() {
        const c = document.getElementById(this.containerId);
        if (c) c.remove();
    }
}
