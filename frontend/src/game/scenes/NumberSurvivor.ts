import { Scene } from 'phaser';
import webSocketManager from '../../modules/WebSocketManager';

// 게임 설정 상수
const GAME_CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    BUTTON_SIZE: 60,
    PADDING: 10,
    COLUMNS: 5,
    CENTER_X: 400,
    CENTER_Y: 300,
    MESSAGE_Y: 50,
    TIMER_Y: 100,
    GRID_START_Y: 250
} as const;

// 타입 정의
interface PlayerInfo {
    userId: string;
    nickname: string;
}

interface RoundResult {
    type: "ROUND_RESULT";
    round: number;
    numberSelections: { [key: number]: PlayerInfo[] };
    survivors: PlayerInfo[];
    eliminated: PlayerInfo[];
}

interface MyResult {
    message: string;
    isAlive: boolean;
}

interface RoundStartMessage {
    type: "ROUND_START";
    numberRange: {
        max: number;
    };
    timeLimit: number;
}

interface GameOverMessage {
    type: "GAME_OVER";
    winners: PlayerInfo[];
}

export class NumberSurvivor extends Scene {
    private userId: string;
    private roomId: string;
    private nickname: string;
    private numberButtons: Phaser.GameObjects.Container[];
    private messageText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private maxNumber: number;
    private timerEvent?: Phaser.Time.TimerEvent;
    
    constructor() {
        super({ key: 'NumberSurvivor' });
        this.numberButtons = [];
    }

    init(data: { userId: string; roomId: string; nickname: string }) {
        this.userId = data.userId;
        this.roomId = data.roomId;
        this.nickname = data.nickname;
    }

    create() {
        this.setupWebSocketListeners();
        this.createGameUI();
        
        this.events.on('shutdown', this.shutdown, this);
        
        if (!webSocketManager.isConnected()) {
            this.showError('서버와 연결이 끊어졌습니다.');
            return;
        }

        webSocketManager.send({
            type: 'NUMBER_SURVIVOR_JOIN',
            userId: this.userId,
            roomId: this.roomId,
            nickname: this.nickname
        });
    }

    private setupWebSocketListeners(): void {
        webSocketManager.on('NUMBER_SURVIVOR_START', this.handleRoundStart, this);
        webSocketManager.on('NUMBER_SURVIVOR_RESULT', this.handleRoundResult, this);
        webSocketManager.on('NUMBER_SURVIVOR_END', this.handleGameOver, this);
    }

    private createGameUI() {
        // 배경 추가
        this.add.rectangle(GAME_CONFIG.CENTER_X, GAME_CONFIG.CENTER_Y, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT, 0x000000)
            .setAlpha(0.8);

        // 상단 메시지 텍스트
        this.messageText = this.add.text(GAME_CONFIG.CENTER_X, GAME_CONFIG.MESSAGE_Y, '게임 시작을 기다리는 중...', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // 타이머 텍스트
        this.timerText = this.add.text(GAME_CONFIG.CENTER_X, GAME_CONFIG.TIMER_Y, '', {
            fontSize: '32px',
            color: '#ffff00',
            align: 'center'
        }).setOrigin(0.5);

        this.createNumberGrid();
    }

    private createNumberGrid() {
        const gridWidth = (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING) * GAME_CONFIG.COLUMNS - GAME_CONFIG.PADDING;
        const startX = GAME_CONFIG.CENTER_X - (gridWidth / 2) + (GAME_CONFIG.BUTTON_SIZE / 2);
        
        for (let i = 1; i <= this.maxNumber; i++) {
            const col = (i - 1) % GAME_CONFIG.COLUMNS;
            const row = Math.floor((i - 1) / GAME_CONFIG.COLUMNS);
            
            const x = startX + (col * (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING));
            const y = GAME_CONFIG.GRID_START_Y + (row * (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING));
            
            const button = this.createNumberButton(x, y, i);
            this.numberButtons.push(button);
        }
    }

    private createNumberButton(x: number, y: number, number: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        
        const bg = this.add.rectangle(0, 0, GAME_CONFIG.BUTTON_SIZE, GAME_CONFIG.BUTTON_SIZE, 0x4444aa)
            .setInteractive({ cursor: 'pointer' })
            .on('pointerover', () => bg.setFillStyle(0x6666cc))
            .on('pointerout', () => bg.setFillStyle(0x4444aa))
            .on('pointerdown', () => this.handleNumberSelection(number));
            
        const text = this.add.text(0, 0, number.toString(), {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        container.add([bg, text]);
        return container;
    }

    private handleNumberSelection(number: number) {
        if (!webSocketManager.isConnected()) {
            this.showError('서버와 연결이 끊어졌습니다.');
            return;
        }

        webSocketManager.send({
            type: 'NUMBER_SURVIVOR_SELECT',
            userId: this.userId,
            roomId: this.roomId,
            selectedNumber: number
        });
        
        this.disableNumberButtons();
        
        if (this.messageText) {
            this.messageText.setText(`${number}번을 선택했습니다!`);
        }
    }

    private disableNumberButtons() {
        this.numberButtons.forEach(button => button.setAlpha(0.5));
    }

    private handleRoundStart(message: RoundStartMessage) {
        this.cleanupTimer();
        this.maxNumber = message.numberRange.max;
        this.enableNumberButtons();
        
        if (this.messageText) {
            this.messageText.setText(`1부터 ${message.numberRange.max}까지 숫자를 선택하세요!`);
        }
        
        this.startTimer(message.timeLimit);
    }

    private enableNumberButtons() {
        this.numberButtons.forEach(button => {
            button.setAlpha(1);
            const [bg] = button.list as [Phaser.GameObjects.Rectangle];
            bg.setInteractive();
        });
    }

    private startTimer(seconds: number) {
        let timeLeft = seconds;
        
        if (this.timerText) {
            this.timerText.setText(`${timeLeft}초`);
        }

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                timeLeft--;
                if (this.timerText) {
                    this.timerText.setText(`${timeLeft}초`);
                }
            },
            repeat: seconds - 1
        });
    }

    private handleRoundResult(message: RoundResult) {
        const myResult = this.calculateMyResult(message);
        
        if (this.messageText) {
            this.messageText.setText(myResult.message);
        }

        if (!myResult.isAlive) {
            this.disableNumberButtons();
        }
    }

    private calculateMyResult(result: RoundResult): MyResult {
        let myNumber: number | null = null;
        let myCollisions: PlayerInfo[] = [];
        
        for (const [number, players] of Object.entries(result.numberSelections)) {
            if (players.some(p => p.userId === this.userId)) {
                myNumber = parseInt(number);
                myCollisions = players.filter(p => p.userId !== this.userId);
                break;
            }
        }

        const isAlive = result.survivors.some(s => s.userId === this.userId);
        
        let message: string;
        if (isAlive) {
            message = `축하합니다! ${myNumber}번을 선택해서 살아남았습니다!\n`;
        } else {
            if (myCollisions.length > 0) {
                const collisionNames = myCollisions.map(p => p.nickname).join(", ");
                message = `아쉽네요! ${myNumber}번을 ${collisionNames}님과 같이 선택했습니다.\n`;
            } else {
                message = `아쉽네요! 탈락했습니다.\n`;
            }
        }

        message += `${result.survivors.length}명이 살아남았습니다!`;
        
        return { message, isAlive };
    }

    private handleGameOver(message: GameOverMessage) {
        if (this.messageText) {
            const winnerNames = message.winners.map(w => w.nickname).join(', ');
            this.messageText.setText(`게임 종료! 우승자: ${winnerNames}`);
        }

        this.disableNumberButtons();
    }

    private showError(message: string) {
        if (this.messageText) {
            this.messageText.setText(message);
        }
    }

    private cleanupTimer() {
        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = undefined;
        }
    }

    shutdown() {
        super.shutdown();
        this.cleanupResources();
    }

    private cleanupResources() {
        this.cleanupTimer();
        this.numberButtons.forEach(button => button.destroy());
        this.numberButtons = [];
        
        webSocketManager.removeListener('NUMBER_SURVIVOR_START', this.handleRoundStart, this);
        webSocketManager.removeListener('NUMBER_SURVIVOR_RESULT', this.handleRoundResult, this);
        webSocketManager.removeListener('NUMBER_SURVIVOR_END', this.handleGameOver, this);
    }
}
