import { Scene } from 'phaser';
import webSocketManager from '../../modules/WebSocketManager';

interface RoundResult {
    numberSelections: { [key: number]: PlayerInfo[] };
    survivors: PlayerInfo[];
    previousSurvivorCount: number;
    currentSurvivorCount: number;
}

interface PlayerInfo {
    userId: string;
    nickname: string;
}

interface MyResult {
    message: string;
    isAlive: boolean;
}

export class NumberSurvivor extends Scene {
    private userId: string;
    private roomId: string;
    private nickname: string;
    private numberButtons: Phaser.GameObjects.Container[];
    private messageText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private maxNumber: number = 21;
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
        this.add.rectangle(400, 300, 800, 600, 0x000000)
            .setAlpha(0.8);

        // 상단 메시지 텍스트
        this.messageText = this.add.text(400, 50, '게임 시작을 기다리는 중...', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // 타이머 텍스트
        this.timerText = this.add.text(400, 100, '', {
            fontSize: '32px',
            color: '#ffff00',
            align: 'center'
        }).setOrigin(0.5);

        this.createNumberGrid();
    }

    private createNumberGrid() {
        const buttonWidth = 60;
        const buttonHeight = 60;
        const padding = 10;
        const columns = 5;
        
        const gridWidth = (buttonWidth + padding) * columns - padding;
        const startX = 400 - (gridWidth / 2) + (buttonWidth / 2);
        const startY = 250;
        
        for (let i = 1; i <= this.maxNumber; i++) {
            const col = (i - 1) % columns;
            const row = Math.floor((i - 1) / columns);
            
            const x = startX + (col * (buttonWidth + padding));
            const y = startY + (row * (buttonHeight + padding));
            
            const button = this.createNumberButton(x, y, i);
            this.numberButtons.push(button);
        }
    }

    private createNumberButton(x: number, y: number, number: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        
        // 버튼 배경
        const bg = this.add.rectangle(0, 0, 60, 60, 0x4444aa)
            .setInteractive({ cursor: 'pointer' })
            .on('pointerover', () => bg.setFillStyle(0x6666cc))
            .on('pointerout', () => bg.setFillStyle(0x4444aa))
            .on('pointerdown', () => this.handleNumberSelection(number));
            
        // 숫자 텍스트
        const text = this.add.text(0, 0, number.toString(), {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        container.add([bg, text]);
        return container;
    }

    private handleNumberSelection(number: number) {
        if (webSocketManager.isConnected()) {
            // 숫자 선택 - send 직접 사용
            webSocketManager.send({
                type: 'NUMBER_SURVIVOR_SELECT',
                userId: this.userId,
                roomId: this.roomId,
                selectedNumber: number
            });
            
            // 선택 후 버튼 비활성화
            this.numberButtons.forEach(button => button.setAlpha(0.5));
            
            if (this.messageText) {
                this.messageText.setText(`${number}번을 선택했습니다!`);
            }
        }
    }

    private handleRoundStart(message: any) {
        // 이전 타이머 정리
        if (this.timerEvent) {
            this.timerEvent.destroy();
        }

        // 버튼 활성화
        this.numberButtons.forEach(button => {
            button.setAlpha(1);
            const [bg] = button.list as [Phaser.GameObjects.Rectangle];
            bg.setInteractive();
        });
        
        if (this.messageText) {
            this.messageText.setText(`1부터 ${message.numberRange.max}까지 숫자를 선택하세요!`);
        }
        
        this.startTimer(message.timeLimit);
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
            this.numberButtons.forEach(button => {
                button.setAlpha(0.3);
                const [bg] = button.list as [Phaser.GameObjects.Rectangle];
                bg.disableInteractive();
            });
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

        message += `${result.previousSurvivorCount}명 중 ${result.currentSurvivorCount}명이 살아남았습니다!`;
        
        return { message, isAlive };
    }

    private handleGameOver(message: any) {
        if (this.messageText) {
            if (Array.isArray(message.winners)) {
                if (message.winners.length === 1) {
                    this.messageText.setText(`게임 종료! 우승자: ${message.winners[0].nickname}`);
                } else if (message.winners.length > 1) {
                    const names = message.winners.map((w: any) => w.nickname).join(', ');
                    this.messageText.setText(`게임 종료! 공동 우승자: ${names}`);
                } else {
                    this.messageText.setText('게임 종료! 우승자 없음');
                }
            } else {
                this.messageText.setText('게임 종료!');
            }
        }

        // 모든 버튼 비활성화
        this.numberButtons.forEach(button => {
            button.setAlpha(0.3);
            const [bg] = button.list as [Phaser.GameObjects.Rectangle];
            bg.disableInteractive();
        });
    }

    shutdown() {
        if (this.timerEvent) {
            this.timerEvent.destroy();
        }
        
        webSocketManager.removeListener('NUMBER_SURVIVOR_START', this.handleRoundStart, this);
        webSocketManager.removeListener('NUMBER_SURVIVOR_RESULT', this.handleRoundResult, this);
        webSocketManager.removeListener('NUMBER_SURVIVOR_END', this.handleGameOver, this);
    }
}
