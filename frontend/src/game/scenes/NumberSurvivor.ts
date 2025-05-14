import { Scene } from 'phaser';
import numberSurvivorWebSocketManager from '../../modules/NumberSurvivorWebSocketManager';
import { userStore } from '../../stores/userStore';
import numberSurvivorPOTGService from '../../modules/NumberSurvivorPOTGService';

// [서비스용] 게임 설정 상수 - 최종 정리
const GAME_CONFIG = {
    // 화면 크기는 PhaserGame 설정값에 맞게 조정
    WIDTH: 600,        // 화면 전체 너비
    HEIGHT: 960,       // 화면 전체 높이
    BUTTON_SIZE: 120,  // 버튼 크기
    PADDING: 20,       // 패딩
    COLUMNS: 3,
    get CENTER_X() { return this.WIDTH / 2 + 10; }, // 살짝 오른쪽으로 조정 (+10)
    get CENTER_Y() { return this.HEIGHT / 2 + 50; }, // 살짝 아래로 조정 (+50)
    MESSAGE_Y: 80,    // 메시지 위치 
    TIMER_Y: 140       // 타이머 위치 
} as const;

// [서비스용] 타입 정의
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

interface RoundStartMessage {
    type: "ROUND_START";
    round: number;
    timeLimit: number;
    maxNumber: number;
    resetEliminationStatus?: boolean;
    playerStatuses?: { [key: string]: boolean };
    allPlayersRevived?: boolean;
}

interface GameOverMessage {
    type: "GAME_OVER";
    winners: PlayerInfo[];
    resetLocalStorage?: boolean;
    roundResults?: RoundResult[];
}

interface WaitingMessage {
    type: "WAITING";
    message: string;
    currentPlayers: number;
}

// userStore 타입 추가
type UserStoreState = {
    status: string | null;
    userId: string;
    roomCode: string;
    nickname: string;
    gameType: string;
    startAt: number;
    duration: number;
    currentMs: number;
};

export class NumberSurvivor extends Scene {
    private userId: string;
    private roomCode: string;
    private nickname: string;
    private numberButtons: Phaser.GameObjects.Container[];
    private messageText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private maxNumber: number = 25; // 기본값 설정
    private timerEvent?: Phaser.Time.TimerEvent;
    private wsConnected: boolean = false;
    private autoStartTimer?: Phaser.Time.TimerEvent; // 자동 시작 타이머 추가
    
    // 게임 상태 관리 변수 추가
    private gameState: 'waiting' | 'preparing' | 'playing' | 'gameover' = 'waiting';
    
    // 플레이어 상태 추적 변수 추가
    private playerAlive: boolean = true;
    
    // UI 관련 변수 추가
    private statusMessageContainer?: Phaser.GameObjects.Container;
    private eliminatedMessage?: Phaser.GameObjects.Text;
    private roundInfoText?: Phaser.GameObjects.Text;
    private keypadContainer?: Phaser.GameObjects.Container;
    
    constructor() {
        super({ key: 'NumberSurvivor' });
        console.log('[NumberSurvivor] Constructor called');
        this.numberButtons = [];
    }

    // [서비스용] 초기화 함수
    init() {
        console.log('[NumberSurvivor] Init called');
        
        // 주스탠드 스토어에서 사용자 정보 가져오기
        const storeState: UserStoreState = userStore.getState();
        
        // 기본값 설정
        const defaultValues = {
            userId: 'guest',
            roomCode: 'default-room',
            nickname: '게스트'
        };
        
        // 스토어에서 값 가져오기 (없으면 기본값 사용)
        this.userId = storeState.userId || defaultValues.userId;
        this.roomCode = storeState.roomCode || defaultValues.roomCode;
        this.nickname = storeState.nickname || defaultValues.nickname;
        
        console.log(`[NumberSurvivor] Init - User info from store:`, {
            userId: this.userId,
            roomCode: this.roomCode,
            nickname: this.nickname
        });
        
        // 로컬 스토리지에서 값 가져오기 (스토어에 값이 없거나 기본값인 경우)
        const localStorageValues = {
            userId: localStorage.getItem('userId'),
            roomCode: localStorage.getItem('roomCode'),
            nickname: localStorage.getItem('nickname')
        };
        
        // 로컬 스토리지 값이 있고, 현재 값이 기본값이면 업데이트
        if (localStorageValues.userId && (this.userId === defaultValues.userId)) {
            this.userId = localStorageValues.userId;
            userStore.getState().setUserId(localStorageValues.userId);
            console.log(`[NumberSurvivor] userId updated from localStorage: ${this.userId}`);
        }
        
        if (localStorageValues.roomCode && (this.roomCode === defaultValues.roomCode)) {
            this.roomCode = localStorageValues.roomCode;
            userStore.getState().setRoomCode(localStorageValues.roomCode);
            console.log(`[NumberSurvivor] roomCode updated from localStorage: ${this.roomCode}`);
        }
        
        if (localStorageValues.nickname && (this.nickname === defaultValues.nickname)) {
            this.nickname = localStorageValues.nickname;
            userStore.getState().setNickname(localStorageValues.nickname);
            console.log(`[NumberSurvivor] nickname updated from localStorage: ${this.nickname}`);
        }
        
        // 게임 상태 초기화
        this.clearAllEliminationStates();
        this.playerAlive = true;
        
        // 게임 타입 설정 (NumberSurvivor)
        userStore.getState().setGameType('NumberSurvivor');
        
        // 최종 사용자 정보 로깅
        console.log('[NumberSurvivor] Final user info:', {
            userId: this.userId,
            roomCode: this.roomCode,
            nickname: this.nickname,
            playerAlive: this.playerAlive,
            gameType: userStore.getState().gameType
        });
    }
    
    // 모든 eliminatedPlayer 로컬 스토리지 항목 제거
    private clearAllEliminationStates() {
        try {
            console.log('[NumberSurvivor] Clearing all elimination states from localStorage');
            
            // localStorage의 모든 키를 순회하면서 eliminatedPlayer로 시작하는 항목 찾기
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('eliminatedPlayer')) {
                    keysToRemove.push(key);
                }
            }
            
            // 찾은 모든 항목 제거
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`[NumberSurvivor] Removed item from localStorage: ${key}`);
            });
            
            console.log(`[NumberSurvivor] Cleared ${keysToRemove.length} elimination state items`);
        } catch (error) {
            console.error('[NumberSurvivor] Error clearing elimination states:', error);
        }
    }

    // [서비스용] 게임 생성 함수
    create() {
        console.log('[NumberSurvivor] Create called');
        
        // 1. 실제 캔버스 크기 가져오기
        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        // 2. 계산기 컨테이너를 실제 중앙에 배치
        this.keypadContainer = this.add.container(centerX, centerY);

        // 3. 리사이즈 이벤트 처리
        this.scale.on('resize', this.handleResize, this);
        
        // 게임 초기 상태 설정 - 게임 시작시 항상 살아있는 상태로 초기화하는 코드 제거
        // 대신 init()에서 설정된 playerAlive 값을 유지하도록 함
        console.log('[NumberSurvivor] Create - Player alive status:', this.playerAlive);
        
        // 씬이 다시 시작될 때 이전 상태 정리
        this.cleanupTimer();
        
        // 살아있는 플레이어만 버튼 활성화
        if (this.playerAlive) {
            this.enableNumberButtons();
        } else {
            // 탈락한 플레이어는 버튼 비활성화 상태 유지
            this.completelyDisableButtons(true);
        }
        
        // [서비스용] 서버 연결 시도
        this.tryConnectToServer();
        
        // [서비스용] 게임 UI 생성
        this.createGameUI();
        
        // [서비스용] 이벤트 리스너 설정
        this.events.on('shutdown', this.cleanupResources, this);
        
        // [서비스용] 주기적으로 WebSocket 상태 확인
        this.time.addEvent({
            delay: 5000,  // 5초마다
            callback: this.checkWebSocketStatus,
            callbackScope: this,
            loop: true
        });

        // 자동 게임 시작 타이머 설정
        this.setupAutoStartTimer();
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        if (this.keypadContainer) {
            this.keypadContainer.setPosition(
                gameSize.width / 2,
                gameSize.height / 2
            );
        }
        // 메시지, 타이머, 원도 중앙에 맞게 이동
        if (this.messageText) this.messageText.setX(gameSize.width / 2);
        if (this.timerText) this.timerText.setX(gameSize.width / 2);
        const timerBg = this.children.list.find(obj => (obj as any).type === 'Arc' && (obj as any).y === GAME_CONFIG.TIMER_Y) as Phaser.GameObjects.Arc | undefined;
        if (timerBg) timerBg.x = gameSize.width / 2;
        const messageBg = this.children.list.find(obj => (obj as any).type === 'Rectangle' && (obj as any).y === GAME_CONFIG.MESSAGE_Y) as Phaser.GameObjects.Rectangle | undefined;
        if (messageBg) messageBg.x = gameSize.width / 2;
    }

    // 자동 게임 시작 타이머 설정 - 더 이상 사용하지 않음 (서버 측에서 처리)
    private setupAutoStartTimer() {
        // 서버에서 타이머를 관리하므로 이 메서드는 필요하지 않음
        console.log('[NumberSurvivor] Auto start timer is now managed by server');
    }

    // [서비스용] WebSocket 이벤트 리스너 설정
    private setupWebSocketListeners(): void {
        // 이벤트 리스너 등록 전에 이전 리스너 제거
        numberSurvivorWebSocketManager.removeListener('ROUND_START', this.handleRoundStart);
        numberSurvivorWebSocketManager.removeListener('ROUND_RESULT', this.handleRoundResult);
        numberSurvivorWebSocketManager.removeListener('GAME_OVER', this.handleGameOver);
        numberSurvivorWebSocketManager.removeListener('WAITING', this.handleWaiting);
        
        // 새로운 메시지 타입 리스너 제거
        numberSurvivorWebSocketManager.removeListener('WAITING_COUNTDOWN', this.handleWaitingCountdown);
        numberSurvivorWebSocketManager.removeListener('PREPARE_START', this.handlePrepareStart);
        numberSurvivorWebSocketManager.removeListener('PREPARE_COUNTDOWN', this.handlePrepareCountdown);
        numberSurvivorWebSocketManager.removeListener('GAME_PREPARING', this.handleGamePreparing);
        numberSurvivorWebSocketManager.removeListener('GAME_IN_PROGRESS', this.handleGameInProgress);
        
        console.log('[NumberSurvivor] Setting up WebSocket listeners for userId:', this.userId);
        
        // 서버에서 보내는 메시지 타입으로 수신 (화살표 함수로 this 바인딩)
        numberSurvivorWebSocketManager.on('ROUND_START', (msg) => this.handleRoundStart(msg));
        numberSurvivorWebSocketManager.on('ROUND_RESULT', (msg) => this.handleRoundResult(msg));
        numberSurvivorWebSocketManager.on('GAME_OVER', (msg) => this.handleGameOver(msg));
        numberSurvivorWebSocketManager.on('WAITING', (msg) => this.handleWaiting(msg));
        
        // 새로운 메시지 타입 리스너 등록 (화살표 함수로 this 바인딩)
        numberSurvivorWebSocketManager.on('WAITING_COUNTDOWN', (msg) => this.handleWaitingCountdown(msg));
        numberSurvivorWebSocketManager.on('PREPARE_START', (msg) => this.handlePrepareStart(msg));
        numberSurvivorWebSocketManager.on('PREPARE_COUNTDOWN', (msg) => this.handlePrepareCountdown(msg));
        numberSurvivorWebSocketManager.on('GAME_PREPARING', (msg) => this.handleGamePreparing(msg));
        numberSurvivorWebSocketManager.on('GAME_IN_PROGRESS', (msg) => this.handleGameInProgress(msg));
        
        this.wsConnected = true;
        console.log('[NumberSurvivor] WebSocket listeners setup completed');
    }

    // [서비스용] 게임 UI 생성 함수
    private createGameUI() {
        // 배경 추가 (검은색 배경)
        this.add.rectangle(
            GAME_CONFIG.CENTER_X, 
            GAME_CONFIG.CENTER_Y, 
            GAME_CONFIG.WIDTH, 
            GAME_CONFIG.HEIGHT, 
            0x000000
        ).setAlpha(0.8);

        // 상단 메시지 텍스트 배경
        const messageBg = this.add.rectangle(
            this.scale.width / 2, // 중앙 X좌표
            GAME_CONFIG.MESSAGE_Y,
            GAME_CONFIG.WIDTH * 0.9, // 너비
            60, // 높이
            0x0a0a2a
        ).setAlpha(0.9).setDepth(9);

        // 메시지 텍스트
        this.messageText = this.add.text(
            this.scale.width / 2, // 중앙 X좌표
            GAME_CONFIG.MESSAGE_Y, 
            '게임 시작을 기다리는 중...', 
            {
                fontSize: '30px',
                color: '#ffffff',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(10);

        // 타이머 텍스트 배경
        const timerBg = this.add.circle(
            this.scale.width / 2, // 중앙 X좌표
            GAME_CONFIG.TIMER_Y,
            40,
            0x222266
        ).setAlpha(0.8).setDepth(9);

        // 타이머 텍스트
        this.timerText = this.add.text(
            this.scale.width / 2, // 중앙 X좌표
            GAME_CONFIG.TIMER_Y, 
            '', 
            {
                fontSize: '36px',
                color: '#ffff00',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(10);
        
        // 상태 메시지 컨테이너 생성 (탈락 메시지 및 라운드 정보용)
        this.statusMessageContainer = this.add.container(GAME_CONFIG.CENTER_X, GAME_CONFIG.CENTER_Y - 180).setDepth(15);
        
        // 탈락 메시지 (초기에는 보이지 않음)
        this.eliminatedMessage = this.add.text(
            0, 0, 
            '', 
            {
                fontSize: '36px',
                color: '#ff6666',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setAlpha(0);
        
        // 라운드 정보 메시지 (초기에는 보이지 않음)
        this.roundInfoText = this.add.text(
            0, 40, 
            '', 
            {
                fontSize: '24px',
                color: '#aaaaff',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setAlpha(0);
        
        // 컨테이너에 텍스트 추가
        this.statusMessageContainer.add([this.eliminatedMessage, this.roundInfoText]);

        // [서비스용] 숫자 입력 UI 생성
        this.createNumberInput();
    }

    // [서비스용] 숫자 입력 UI 생성
    private createNumberInput() {
        if (!this.keypadContainer) return;

        // 입력 표시 영역 (컨테이너 기준 상대 좌표)
        const inputBg = this.add.rectangle(
            0,          // x는 0 (컨테이너 중앙)
            -250,       // y는 위로 250px
            GAME_CONFIG.BUTTON_SIZE * 3,
            GAME_CONFIG.BUTTON_SIZE * 0.8,
            0x222266
        );

        const inputText = this.add.text(
            0, 
            -250, // 위치 조정
            '', 
            {
                fontSize: '50px',
                color: '#ffffff',
                align: 'center',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        this.keypadContainer.add([inputBg, inputText]);
        
        let currentInput = '';
        
        // 숫자 키패드 생성 - 시작 위치 조정
        const keypadY = -110; // 간격 조정
        const keypadWidth = GAME_CONFIG.BUTTON_SIZE * 3 + GAME_CONFIG.PADDING * 2;
        const keypadStartX = -keypadWidth/2 + GAME_CONFIG.BUTTON_SIZE/2;
        
        // 숫자 1-9 (3x3 그리드)
        for (let i = 1; i <= 9; i++) {
            const col = (i - 1) % 3;
            const row = Math.floor((i - 1) / 3);
            
            const x = keypadStartX + (col * (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING));
            const y = keypadY + (row * (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING));
            
            const button = this.add.container(x, y);
            
            const bg = this.add.rectangle(0, 0, GAME_CONFIG.BUTTON_SIZE, GAME_CONFIG.BUTTON_SIZE, 0x4444aa)
                .setStrokeStyle(3, 0x8888ff)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    bg.setFillStyle(0x5555bb);
                })
                .on('pointerout', () => {
                    bg.setFillStyle(0x4444aa);
                })
                .on('pointerdown', () => {
                    if (currentInput.length < 2) {
                        currentInput += i.toString();
                        inputText.setText(currentInput);
                    }
                });
            
            const text = this.add.text(0, 0, i.toString(), {
                fontSize: '46px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            
            button.add([bg, text]);
            this.keypadContainer.add(button);
            this.numberButtons.push(button);
        }
        
        // 숫자 0 버튼 (하단 중앙에 위치)
        const zeroY = keypadY + 3 * (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING);
        const zeroX = keypadStartX + (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING);
        
        const zeroButton = this.add.container(zeroX, zeroY);
        
        const zeroBg = this.add.rectangle(0, 0, GAME_CONFIG.BUTTON_SIZE, GAME_CONFIG.BUTTON_SIZE, 0x4444aa)
            .setStrokeStyle(3, 0x8888ff)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                zeroBg.setFillStyle(0x5555bb);
            })
            .on('pointerout', () => {
                zeroBg.setFillStyle(0x4444aa);
            })
            .on('pointerdown', () => {
                if (currentInput.length < 2) {
                    currentInput += "0";
                    inputText.setText(currentInput);
                }
            });
        
        const zeroText = this.add.text(0, 0, "0", {
            fontSize: '46px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        zeroButton.add([zeroBg, zeroText]);
        this.keypadContainer.add(zeroButton);
        this.numberButtons.push(zeroButton);
        
        // 지우기 버튼 (왼쪽)
        const clearX = keypadStartX;
        const clearY = zeroY;
        
        const clearButton = this.add.container(clearX, clearY);
        
        const clearBg = this.add.rectangle(0, 0, GAME_CONFIG.BUTTON_SIZE, GAME_CONFIG.BUTTON_SIZE, 0x884444)
            .setStrokeStyle(3, 0xff8888)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                clearBg.setFillStyle(0x995555);
            })
            .on('pointerout', () => {
                clearBg.setFillStyle(0x884444);
            })
            .on('pointerdown', () => {
                currentInput = '';
                inputText.setText(currentInput);
            });
        
        const clearText = this.add.text(0, 0, "지우기", {
            fontSize: '30px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        clearButton.add([clearBg, clearText]);
        this.keypadContainer.add(clearButton);
        this.numberButtons.push(clearButton);
        
        // 제출 버튼 (오른쪽)
        const submitX = keypadStartX + 2 * (GAME_CONFIG.BUTTON_SIZE + GAME_CONFIG.PADDING);
        const submitY = zeroY;
        
        const submitButton = this.add.container(submitX, submitY);
        
        const submitBg = this.add.rectangle(0, 0, GAME_CONFIG.BUTTON_SIZE, GAME_CONFIG.BUTTON_SIZE, 0x448844)
            .setStrokeStyle(3, 0x88ff88)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                submitBg.setFillStyle(0x559955);
            })
            .on('pointerout', () => {
                submitBg.setFillStyle(0x448844);
            })
            .on('pointerdown', () => {
                if (currentInput !== '') {
                    const num = parseInt(currentInput);
                    if (!isNaN(num) && num >= 1 && num <= this.maxNumber) {
                        this.handleNumberSelection(num);
                        inputText.setText('');
                        currentInput = '';
                    } else {
                        inputText.setText('⚠️');
                        this.time.delayedCall(500, () => {
                            inputText.setText(currentInput);
                        });
                    }
                }
            });
        
        const submitText = this.add.text(0, 0, "제출", {
            fontSize: '30px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        submitButton.add([submitBg, submitText]);
        this.keypadContainer.add(submitButton);
        this.numberButtons.push(submitButton);
    }

    // [서비스용] 숫자 선택 처리 함수
    private handleNumberSelection(number: number) {
        console.log(`[NumberSurvivor] Selected number: ${number}`);
        
        // 탈락 상태 확인 (추가 안전장치)
        const storageKey = `eliminatedPlayer_${this.userId}_${this.roomCode}`;
        const isEliminatedFromStorage = localStorage.getItem(storageKey);
        
        // 로컬 스토리지에 탈락 상태가 저장되어 있으면 강제로 업데이트
        if (isEliminatedFromStorage === 'true') {
            console.log('[NumberSurvivor] Player is eliminated according to localStorage');
            this.playerAlive = false;
        }
        
        // 탈락한 플레이어는 선택할 수 없도록 처리
        if (!this.playerAlive) {
            console.log('[NumberSurvivor] Player is eliminated. Selection ignored.');
            
            // 즉시 큰 탈락 메시지 표시하여 사용자에게 명확히 알림
            this.showEliminatedMessage(number.toString(), true);
            
            // 탈락 메시지에 애니메이션 효과 추가
            this.tweens.add({
                targets: this.children.getByName('eliminationMessage_' + Date.now()),
                alpha: 1,
                scale: 1,
                duration: 500,
                ease: 'Back.easeOut',
                onComplete: (tween, targets) => {
                    // 1.5초 후 사라짐
                    this.tweens.add({
                        targets: targets[0],
                        alpha: 0,
                        y: '-=50',
                        duration: 500,
                        delay: 1500,
                        ease: 'Power2',
                        onComplete: (tween, hideTargets) => {
                            hideTargets[0].destroy();
                        }
                    });
                }
            });
            
            if (this.messageText) {
                this.messageText.setText('이미 탈락했습니다. 관전 중입니다.');
                this.messageText.setColor('#ff6666');
                
                // 잠시 후 원래 메시지로 복귀
                this.time.delayedCall(2000, () => {
                    if (this.messageText) {
                        this.messageText.setText('다른 플레이어들의 게임 진행 중...');
                        this.messageText.setColor('#aaaaaa');
                    }
                });
            }
            
            // 버튼 다시 비활성화
            this.completelyDisableButtons(false);
            return;
        }
        
        // 간단한 선택 피드백
        this.showSimpleSelectionFeedback(number);
        
        // [서비스용] WebSocket을 통해 선택한 숫자 전송
        if (numberSurvivorWebSocketManager.isConnected()) {
            numberSurvivorWebSocketManager.sendNumberSelection(this.userId, this.roomCode, number);
        }
        
        // 버튼 비활성화
        this.disableNumberButtons();
        
        // 메시지 업데이트
        if (this.messageText) {
            this.messageText.setText(`${number}번을 선택했습니다!`);
        }
        
        // 타이머 중지
        this.cleanupTimer();
        
        // 결과를 기다리는 메시지 표시
        this.time.delayedCall(1500, () => {
            if (this.messageText && this.messageText.active) {
                this.messageText.setText('다른 플레이어와 결과를 기다리는 중...');
            }
        });
    }

    // [서비스용] 선택 피드백 표시 함수
    private showSimpleSelectionFeedback(number: number) {
        // 선택한 숫자를 표시
        const feedbackText = this.add.text(
            GAME_CONFIG.CENTER_X, 
            GAME_CONFIG.CENTER_Y, 
            number.toString(), 
            {
                fontSize: '100px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#4444ff',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(20);
        
        // 간단한 애니메이션 효과
        this.tweens.add({
            targets: feedbackText,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 1, to: 0 },
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                feedbackText.destroy();
            }
        });
    }

    // [서비스용] 버튼 비활성화 함수
    private disableNumberButtons() {
        this.numberButtons.forEach(button => {
            button.setAlpha(0.5);
            // 첫 번째 요소(배경)의 인터랙티브 비활성화
            const bg = button.list[0] as Phaser.GameObjects.Rectangle;
            if (bg && bg.input) {
                bg.disableInteractive();
            }
        });
    }

    // [서비스용] 버튼 활성화 함수
    private enableNumberButtons() {
        this.numberButtons.forEach(button => {
            button.setAlpha(1);
            // 첫 번째 요소(배경)의 인터랙티브 재활성화
            const bg = button.list[0] as Phaser.GameObjects.Rectangle;
            if (bg) {
                bg.setInteractive({ useHandCursor: true });
            }
        });
    }

    // [서비스용] 라운드 시작 처리 함수
    private handleRoundStart(message: RoundStartMessage) {
        console.log('[NumberSurvivor] Round start message received:', message);
        this.gameState = 'playing';
        
        this.cleanupTimer();
        
        // 서버에서 오는 maxNumber 값 사용
        this.maxNumber = message.maxNumber; 
        
        // 라운드 정보 업데이트 (모든 플레이어에게 표시)
        this.updateRoundInfo(message.round);
        
        // 로컬 스토리지에서 탈락 상태 명시적 확인 - 매 라운드마다 확인
        const storageKey = `eliminatedPlayer_${this.userId}_${this.roomCode}`;
        
        // 강제로 로컬 스토리지 다시 확인
        const isEliminatedFromStorage = localStorage.getItem(storageKey);
        console.log(`[NumberSurvivor] Checking localStorage for elimination status. Key: ${storageKey}, Value: ${isEliminatedFromStorage}`);
        
        // 로컬 스토리지에 탈락 상태가 있으면 강제로 playerAlive 업데이트
        if (isEliminatedFromStorage === 'true') {
            console.log('[NumberSurvivor] Player is eliminated (from localStorage) - setting playerAlive to false');
            this.playerAlive = false;
        }
        
        console.log(`[NumberSurvivor] Round ${message.round} - Player alive status: ${this.playerAlive}`);
        
        // 살아있는 플레이어만 버튼 활성화 및 메시지 표시
        if (this.playerAlive) {
            console.log('[NumberSurvivor] Player is alive - enabling buttons');
            this.enableNumberButtons();
            
            if (this.messageText) {
                // 더 눈에 띄는 메시지로 변경
                this.messageText.setText(`1부터 ${this.maxNumber}까지 숫자를 선택하세요!`);
                this.messageText.setColor('#ffff00'); // 노란색으로 변경하여 눈에 띄게
                this.messageText.setFontSize('30px'); // 기본 폰트 크기로 복원
                
                // 애니메이션 효과 추가
                this.tweens.add({
                    targets: this.messageText,
                    scale: { from: 1.2, to: 1 },
                    duration: 500,
                    ease: 'Bounce'
                });
            }
            
            // 살아있는 플레이어만 타이머 시작
            this.startTimer(message.timeLimit);
        } else {
            console.log('[NumberSurvivor] Player is eliminated - showing spectator mode');
            // 탈락한 플레이어는 즉시 화면에 큰 "탈락" 표시 추가
            const bigLabel = this.add.text(
                GAME_CONFIG.CENTER_X, 
                GAME_CONFIG.CENTER_Y - 150,
                '당신은 탈락했습니다 (관전 모드)',
                {
                    fontSize: '32px',
                    color: '#ff4444',
                    align: 'center',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 3,
                    backgroundColor: '#000000',
                    padding: { x: 20, y: 10 }
                }
            ).setOrigin(0.5).setDepth(30);
            
            // 간단한 애니메이션
            this.tweens.add({
                targets: bigLabel,
                scale: { from: 0.8, to: 1 },
                alpha: { from: 0, to: 1 },
                duration: 500,
                ease: 'Back.easeOut',
                onComplete: () => {
                    // 2초 후 사라짐
                    this.tweens.add({
                        targets: bigLabel,
                        alpha: 0,
                        y: bigLabel.y - 30,
                        duration: 1000,
                        delay: 2000,
                        ease: 'Power2',
                        onComplete: () => {
                            bigLabel.destroy();
                        }
                    });
                }
            });
            
            // 탈락한 플레이어는 버튼 비활성화 강화 - 완전 비활성화 함수 사용
            this.completelyDisableButtons(true); // 강제로 오버레이 표시
            
            // 탈락 메시지는 유지하고 메인 메시지는 현재 상태 표시
            if (this.messageText) {
                this.messageText.setText('다른 플레이어들의 게임 진행 중... (관전 모드)');
                this.messageText.setColor('#aaaaaa');
                
                // 탈락 상태 표시 갱신
                if (this.eliminatedMessage) {
                    this.eliminatedMessage.setText('탈락');
                    // 이미 표시되지 않은 경우에만 애니메이션
                    if (this.eliminatedMessage.alpha < 0.1) {
                        this.eliminatedMessage.setAlpha(0);
                        this.tweens.add({
                            targets: this.eliminatedMessage,
                            alpha: 1,
                            duration: 500,
                            ease: 'Sine.easeIn'
                        });
                    }
                }
            }

            // 탈락한 플레이어는 타이머 텍스트 숨기기
            if (this.timerText) {
                this.timerText.setVisible(false);
            }
        }
    }

    // 라운드 정보 업데이트 함수 (모든 플레이어 공통)
    private updateRoundInfo(round: number) {
        if (!this.roundInfoText || !this.statusMessageContainer) return;
        
        // 라운드 정보 표시
        this.roundInfoText.setText(`라운드 ${round}`);
        
        // 탈락 시에는 '관전 중' 표시 추가
        if (!this.playerAlive) {
            this.roundInfoText.setText(`라운드 ${round} (관전 중)`);
        }
        
        // 이미 표시 중이면 애니메이션 없이 업데이트만
        if (this.roundInfoText.alpha > 0) {
            return;
        }
        
        // 처음 표시되는 경우 애니메이션 효과
        this.roundInfoText.setAlpha(0);
        this.tweens.add({
            targets: this.roundInfoText,
            alpha: 1,
            y: { from: 50, to: 40 },
            duration: 500,
            ease: 'Back.easeOut'
        });
    }

    // [서비스용] 타이머 시작 함수
    private startTimer(seconds: number) {
        let timeLeft = seconds;
        
        if (this.timerText) {
            this.timerText.setText(`${timeLeft}`); // '초' 텍스트 제거
        }

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                timeLeft--;
                if (this.timerText) {
                    this.timerText.setText(`${timeLeft}`); // '초' 텍스트 제거
                    // 5초 이하로 남으면 빨간색으로 변경
                    if (timeLeft <= 5) {
                        this.timerText.setColor('#ff6666');
                    }
                }
                // 시간이 다 되면 자동으로 다음 단계로 넘어갑니다
                if (timeLeft <= 0) {
                    // 타이머가 끝났는데 숫자를 선택하지 않은 경우, 랜덤 숫자 선택
                    if (this.messageText && this.messageText.active) {
                        this.messageText.setText('시간이 종료되었습니다!');
                    }
                    
                    // 플레이어가 아직 살아있고, 버튼이 활성화되어 있다면 자동으로 랜덤 숫자 선택
                    const areButtonsActive = this.numberButtons.some(button => {
                        const bg = button.list[0] as Phaser.GameObjects.Rectangle;
                        return bg && bg.input && bg.input.enabled;
                    });
                    
                    if (this.playerAlive && areButtonsActive && numberSurvivorWebSocketManager.isConnected()) {
                        // 랜덤 숫자 선택 (1~maxNumber 사이)
                        const randomNumber = Math.floor(Math.random() * this.maxNumber) + 1;
                        console.log(`[NumberSurvivor] Time's up! Auto-selecting number: ${randomNumber}`);
                        
                        // 선택 처리
                        this.handleNumberSelection(randomNumber);
                    }
                }
            },
            repeat: seconds - 1
        });
    }

    // [서비스용] 라운드 결과 처리 함수
    private handleRoundResult(message: RoundResult) {
        console.log('[NumberSurvivor] 라운드 결과 메시지 수신 - 상세 정보:', JSON.stringify(message));
        console.log('[NumberSurvivor] 현재 플레이어 ID:', this.userId);
        console.log('[NumberSurvivor] 생존자 목록:', message.survivors.map(s => s.userId));
        console.log('[NumberSurvivor] 탈락자 목록:', message.eliminated.map(e => e.userId));
        
        // 타이머 중지
        this.cleanupTimer();
        
        // 내 결과 계산
        const myResult = this.calculateMyResult(message);
        const wasAliveBeforeResult = this.playerAlive; // 결과 전 생존 상태 저장
        
        // 플레이어 생존 상태 저장
        this.playerAlive = myResult.isAlive;
        
        // 디버깅용 - 라운드 결과 및 생존 여부 표시
        console.log(`[NumberSurvivor] Round ${message.round} result - Before: ${wasAliveBeforeResult}, After: ${this.playerAlive}`);
        console.log(`[NumberSurvivor] My result:`, myResult);
        
        // 탈락 시 즉시 로컬 스토리지에 상태 저장 - 탈락 시에만 저장
        if (!myResult.isAlive) {
            const storageKey = `eliminatedPlayer_${this.userId}_${this.roomCode}`;
            console.log(`[NumberSurvivor] 탈락 상태 저장 - userId: ${this.userId}, roomCode: ${this.roomCode}`);
            console.log(`[NumberSurvivor] Storing eliminated state in localStorage with key: ${storageKey}`);
            try {
                // 명시적으로 'true' 문자열로 저장
                localStorage.setItem(storageKey, 'true');
                
                // 정상적으로 저장되었는지 바로 확인
                const storedValue = localStorage.getItem(storageKey);
                console.log(`[NumberSurvivor] Successfully stored eliminated state. Key: ${storageKey}, Value: ${storedValue}`);
            } catch (error) {
                console.error('[NumberSurvivor] Failed to store eliminated state in localStorage:', error);
            }
        }
        
        // 결과 화면 표시
        if (this.messageText) {
            // 결과에 따른 메시지 표시 (생존자 수 정보는 메인 메시지에 표시)
            let mainMessage = '';
            
            if (myResult.isAlive) {
                // 생존 시 메시지
                mainMessage = `${myResult.mainMessage}\n남은 인원: ${message.survivors.length}명`;
                this.messageText.setColor('#88ff88');
            } else {
                // 탈락 시 메시지
                if (wasAliveBeforeResult) {
                    // 새로 탈락했을 때는 메시지를 눈에 띄게
                    mainMessage = `${myResult.mainMessage}\n관전 모드로 전환됩니다.`;
                    this.messageText.setColor('#ff6666');
                } else {
                    // 이미 탈락했던 경우
                    mainMessage = `라운드 ${message.round} 진행 중\n남은 인원: ${message.survivors.length}명`;
                    this.messageText.setColor('#aaaaaa');
                }
            }
            
            this.messageText.setText(mainMessage);
            
            // 결과 강조 효과
            this.tweens.add({
                targets: this.messageText,
                scale: { from: 1.3, to: 1 },
                duration: 700,
                ease: 'Elastic'
            });
        }
        
        // 생존 여부에 따른 시각적 효과
        if (myResult.isAlive) {
            this.showSurvivalEffect();
        } else {
            // 이번 라운드에 새롭게 탈락한 경우 (이전에는 살아있었지만 지금 탈락함)
            if (wasAliveBeforeResult) {
                console.log('[NumberSurvivor] Player was just eliminated - showing big effect');
                // 탈락 애니메이션 표시
                this.showBigEliminationAnimation();
                
                // 탈락 메시지 표시 및 버튼 비활성화
                this.showEliminatedMessage(myResult.detailMessage || '탈락했습니다', true);
                this.completelyDisableButtons(true); // 큰 효과 포함
            } else {
                console.log('[NumberSurvivor] Player was already eliminated - refreshing UI');
                // 이미 탈락한 플레이어는 작은 효과로 상태 갱신
                this.showEliminatedMessage(myResult.detailMessage || '탈락했습니다', false);
                // 이미 버튼이 비활성화되어 있더라도 갱신
                this.completelyDisableButtons(false); // 작은 효과만
            }
        }
        
        // 다음 라운드 준비를 위한 지연 시간
        const delayToNextRound = 3000; // 3초
        
        // 다음 라운드 메시지 표시 (또는 게임 종료 대기)
        this.time.delayedCall(delayToNextRound - 1000, () => {
            // 이미 탈락한 플레이어는 탈락 메시지를 계속 표시
            if (!myResult.isAlive) {
                if (this.messageText) {
                    // 탈락한 플레이어는 관전 중임을 명확히 표시
                    this.messageText.setText('다른 플레이어들의 게임 진행 중... (관전 모드)');
                    this.messageText.setColor('#aaaaaa');
                }
                return;
            }
            
            // 생존한 플레이어만 다음 라운드 메시지 표시
            if (this.messageText && this.messageText.active) {
                this.messageText.setText('다음 라운드 준비 중...');
                this.messageText.setColor('#ffffff');
            }
        });
        
        // 생존한 경우에만 다음 라운드를 위해 버튼 재활성화
        if (myResult.isAlive) {
            this.time.delayedCall(delayToNextRound, () => {
                this.enableNumberButtons();
            });
        }
    }
    
    // [서비스용] 탈락 메시지 표시 함수
    private showEliminatedMessage(detail: string = '탈락했습니다', bigEffect: boolean = true) {
        console.log(`[NumberSurvivor] Showing eliminated message: ${detail}, bigEffect: ${bigEffect}`);
        
        // 기존 메시지가 있으면 제거
        if (this.eliminatedMessage) {
            this.eliminatedMessage.destroy();
        }
        
        // 화면 상단에 "탈락" 메시지 표시 - 더 명확하게
        this.eliminatedMessage = this.add.text(
            GAME_CONFIG.CENTER_X, 
            60, 
            '탈락!!', 
            {
                fontSize: '36px',
                fontStyle: 'bold',
                color: '#ff6666',
                stroke: '#000000',
                strokeThickness: 5,
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(10);
        
        // 상세 탈락 이유 메시지 (다른 플레이어와 같은 번호 선택 등)
        const detailText = this.add.text(
            GAME_CONFIG.CENTER_X,
            this.eliminatedMessage.y + 50,
            detail,
            {
                fontSize: '24px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center',
                backgroundColor: '#aa0000',
                padding: { x: 10, y: 8 }
            }
        ).setOrigin(0.5).setDepth(10);
        
        // 메시지 애니메이션 효과
        if (bigEffect) {
            this.tweens.add({
                targets: [this.eliminatedMessage, detailText],
                scale: { from: 1.5, to: 1 },
                alpha: { from: 0, to: 1 },
                duration: 800,
                ease: 'Elastic.Out',
                onComplete: () => {
                    // 상세 메시지는 5초 후 서서히 사라지게
                    this.tweens.add({
                        targets: detailText,
                        alpha: 0,
                        delay: 5000,
                        duration: 1000,
                        onComplete: () => {
                            detailText.destroy();
                        }
                    });
                }
            });
        } else {
            // 작은 효과의 경우 단순히 알파값만 변경
            this.eliminatedMessage.setAlpha(0);
            detailText.setAlpha(0);
            
            this.tweens.add({
                targets: [this.eliminatedMessage, detailText],
                alpha: 1,
                duration: 500,
                onComplete: () => {
                    // 상세 메시지는 3초 후 서서히 사라지게
                    this.tweens.add({
                        targets: detailText,
                        alpha: 0,
                        delay: 3000,
                        duration: 1000,
                        onComplete: () => {
                            detailText.destroy();
                        }
                    });
                }
            });
        }
    }
    
    // [서비스용] 큰 탈락 애니메이션 (화면 전체 효과)
    private showBigEliminationAnimation() {
        console.log('[NumberSurvivor] Showing big elimination animation');
        
        // 전체 화면 빨간색 플래시
        const fullScreenFlash = this.add.rectangle(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.CENTER_Y,
            GAME_CONFIG.WIDTH,
            GAME_CONFIG.HEIGHT,
            0xff0000
        ).setAlpha(0).setDepth(25);
        
        // 큰 X 표시
        const bigX = this.add.container(GAME_CONFIG.CENTER_X, GAME_CONFIG.CENTER_Y).setDepth(30);
        
        // X 표시 (굵은 선)
        const line1 = this.add.rectangle(0, 0, 200, 30, 0xff3333).setRotation(Math.PI / 4);
        const line2 = this.add.rectangle(0, 0, 200, 30, 0xff3333).setRotation(-Math.PI / 4);
        
        // 테두리 효과
        const outline1 = this.add.rectangle(0, 0, 210, 40, 0x000000).setRotation(Math.PI / 4);
        const outline2 = this.add.rectangle(0, 0, 210, 40, 0x000000).setRotation(-Math.PI / 4);
        
        bigX.add([outline1, outline2, line1, line2]);
        bigX.setAlpha(0);
        
        // 플래시 애니메이션
        this.tweens.add({
            targets: fullScreenFlash,
            alpha: { from: 0, to: 0.5 },
            yoyo: true,
            duration: 500,
            ease: 'Sine.easeOut',
            onComplete: () => {
                fullScreenFlash.destroy();
            }
        });
        
        // X 표시 애니메이션
        this.tweens.add({
            targets: bigX,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                // 2초 후 사라짐
                this.tweens.add({
                    targets: bigX,
                    alpha: 0,
                    scale: 1.2,
                    duration: 1000,
                    delay: 2000,
                    onComplete: () => {
                        bigX.destroy();
                    }
                });
            }
        });
        
        // 화면 흔들림 효과
        this.cameras.main.shake(500, 0.01);
    }
    
    // [서비스용] 버튼 완전 비활성화 함수
    private completelyDisableButtons(showOverlay: boolean = true) {
        this.numberButtons.forEach(button => {
            button.setAlpha(0.3); // 더 투명하게
            
            // 첫 번째 요소(배경)의 인터랙티브 비활성화 및 색상 변경
            const bg = button.list[0] as Phaser.GameObjects.Rectangle;
            if (bg) {
                bg.disableInteractive();
                bg.setFillStyle(0x666666); // 어두운 회색으로 변경
                bg.setStrokeStyle(2, 0x888888); // 테두리 색상 변경
            }
            
            // 텍스트 색상도 변경
            const text = button.list[1] as Phaser.GameObjects.Text;
            if (text) {
                text.setColor('#888888');
            }
        });
        
        // 이미 관전 모드 오버레이가 있는지 확인
        const existingOverlay = this.children.getByName('spectatorOverlay') as Phaser.GameObjects.Container;
        if (existingOverlay) {
            // 이미 존재하면 가시성만 확실히 함
            existingOverlay.setAlpha(1);
            return;
        }
        
        if (!showOverlay) return;
        
        // 추가적인 시각적 표시 - "관전 모드" 오버레이
        const spectatorOverlay = this.add.container(GAME_CONFIG.CENTER_X, GAME_CONFIG.CENTER_Y - 50)
            .setDepth(20)
            .setName('spectatorOverlay'); // 이름 지정하여 중복 생성 방지
        
        // 반투명 배경
        const overlayBg = this.add.rectangle(
            0, 0,
            GAME_CONFIG.WIDTH * 0.8,
            100,
            0x333366
        ).setAlpha(0.8);
        
        // 텍스트
        const overlayText = this.add.text(
            0, 0,
            "관전 모드 (탈락)",
            {
                fontSize: '30px',
                color: '#aaaaff',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5);
        
        spectatorOverlay.add([overlayBg, overlayText]);
        spectatorOverlay.setAlpha(0);
        
        // 애니메이션으로 표시
        this.tweens.add({
            targets: spectatorOverlay,
            alpha: 1,
            y: spectatorOverlay.y - 30,
            duration: 800,
            ease: 'Back.easeOut',
            delay: 1000
        });
    }
    
    // [서비스용] 생존 효과 표시 함수
    private showSurvivalEffect() {
        // 간단한 원형 효과
        const circle = this.add.circle(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.CENTER_Y,
            100,
            0x88ff88,
            0.5
        ).setDepth(15);
        
        // 확장 애니메이션
        this.tweens.add({
            targets: circle,
            radius: 300,
            alpha: 0,
            duration: 800,
            ease: 'Sine.easeOut',
            onComplete: () => {
                circle.destroy();
            }
        });
    }

    // [서비스용] 오류 표시 함수
    private showError(message: string) {
        if (this.messageText) {
            this.messageText.setText(message);
            this.messageText.setColor('#ff5555');
        }
    }

    // [서비스용] 타이머 정리 함수
    private cleanupTimer() {
        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = undefined;
        }
        // 타이머 텍스트 초기화 - 오류 방지를 위한 null 체크 추가
        if (this.timerText && this.timerText.active) {
            this.timerText.setText('');
            this.timerText.setColor('#ffff00'); // 색상 초기화
        }
    }

    // [서비스용] 리소스 정리 함수
    private cleanupResources() {
        console.log('[NumberSurvivor] Cleaning up resources...');
        
        // 1. 모든 타이머 정리
        this.cleanupTimer();
        
        // 2. 모든 이벤트 리스너 제거
        this.input.keyboard?.removeAllListeners();
        this.input.removeAllListeners();
        
        // 3. 모든 텍스트 객체 제거
        if (this.messageText) this.messageText.destroy();
        if (this.eliminatedMessage) this.eliminatedMessage.destroy();
        if (this.roundInfoText) this.roundInfoText.destroy();
        
        // 4. 모든 버튼 비활성화 및 제거
        this.disableNumberButtons();
        this.numberButtons.forEach(button => {
            if (button) button.destroy();
        });
        this.numberButtons = [];
        
        // 5. 게임 상태 초기화
        this.gameState = 'gameover';
        this.playerAlive = true;
        
        console.log('[NumberSurvivor] Resources cleaned up successfully');
    }

    // [서비스용] 서버 연결 시도 함수
    private tryConnectToServer() {
        console.log('[NumberSurvivor] Attempting to connect WebSocket...');
        
        // 이미 연결되어 있는지 확인
        if (!numberSurvivorWebSocketManager.isConnected()) {
            // 연결 시도
            numberSurvivorWebSocketManager.connect();
            
            // 연결 상태 확인 후 JOIN 메시지 전송
            this.time.delayedCall(1000, () => {
                if (numberSurvivorWebSocketManager.isConnected()) {
                    console.log('[NumberSurvivor] WebSocket connected, sending join message');
                    
                    // JOIN 메시지 전송
                    numberSurvivorWebSocketManager.sendJoin(this.userId, this.roomCode, this.nickname);
                    
                    // 웹소켓 이벤트 리스너 등록
                    this.setupWebSocketListeners();
                } else {
                    console.log('[NumberSurvivor] WebSocket connection failed');
                }
            });
        } else {
            console.log('[NumberSurvivor] WebSocket already connected');
        }
    }
    
    // [서비스용] WebSocket 상태 확인 함수
    private checkWebSocketStatus() {
        const isConnected = numberSurvivorWebSocketManager.isConnected();
        console.log(`[NumberSurvivor] WebSocket status check: ${isConnected ? 'Connected' : 'Not connected'}`);
        
        if (!isConnected && this.wsConnected) {
            // 연결이 끊어진 경우 재연결 시도
            console.log('[NumberSurvivor] WebSocket disconnected, trying to reconnect...');
            numberSurvivorWebSocketManager.connect();
            
            // 연결 상태 표시
            if (this.messageText) {
                this.messageText.setText('서버와 재연결 중...');
            }
        }
    }

    // [서비스용] 대기 메시지 처리 함수 추가
    private handleWaiting(message: WaitingMessage) {
        if (this.messageText) {
            this.messageText.setText(`${message.message} (현재 ${message.currentPlayers}명)`);
        }
    }

    // [서비스용] 대기 단계 카운트다운 처리 함수
    private handleWaitingCountdown(message: any) {
        console.log('[NumberSurvivor] Waiting countdown received:', message);
        this.gameState = 'waiting';
        
        // 자동 타이머가 실행 중이면 중지
        if (this.autoStartTimer) {
            this.autoStartTimer.destroy();
            this.autoStartTimer = undefined;
        }
        
        // UI 업데이트
        if (this.messageText) {
            this.messageText.setText(`다른 플레이어를 기다리는 중... (${message.currentPlayers}명 참가)`);
            this.messageText.setColor('#ffffff');
        }
        
        // 타이머 표시
        if (this.timerText) {
            this.timerText.setText(`${message.timeLeft}`);
            this.timerText.setColor('#ffff00');
        }
    }
    
    // [서비스용] 게임 준비 시작 처리 함수
    private handlePrepareStart(message: any) {
        console.log('[NumberSurvivor] Prepare start received:', message);
        this.gameState = 'preparing';
        
        // UI 업데이트
        if (this.messageText) {
            this.messageText.setText(`게임 시작 준비 중... (${message.currentPlayers}명 참가)`);
            this.messageText.setColor('#88ff88');
            
            // 애니메이션 효과 추가
            this.tweens.add({
                targets: this.messageText,
                scale: { from: 1.2, to: 1 },
                duration: 500,
                ease: 'Elastic'
            });
        }
        
        // 타이머 표시
        if (this.timerText) {
            this.timerText.setText(`${message.timeLeft}`);
            this.timerText.setColor('#ffff00');
        }
        
        // 준비 효과 표시
        this.showPrepareEffect();
    }
    
    // [서비스용] 준비 효과 표시 함수
    private showPrepareEffect() {
        // 화면 전체에 효과 표시
        const flash = this.add.rectangle(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.CENTER_Y,
            600,
            800,
            0x88ff88
        ).setAlpha(0.3).setDepth(15);
        
        // 페이드아웃 효과
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    // [서비스용] 게임 준비 카운트다운 처리 함수
    private handlePrepareCountdown(message: any) {
        console.log('[NumberSurvivor] Prepare countdown received:', message);
        this.gameState = 'preparing';
        
        // UI 업데이트
        if (this.messageText) {
            this.messageText.setText(`게임이 ${message.timeLeft}초 후 시작됩니다! (${message.currentPlayers}명 참가)`);
            this.messageText.setColor('#ffff00');
        }
        
        // 타이머 표시
        if (this.timerText) {
            this.timerText.setText(`${message.timeLeft}`);
            
            // 3초 이하로 남으면 빨간색으로 변경
            if (message.timeLeft <= 3) {
                this.timerText.setColor('#ff6666');
                
                // 크기 애니메이션 추가
                this.tweens.add({
                    targets: this.timerText,
                    scale: { from: 1.3, to: 1 },
                    duration: 500,
                    ease: 'Bounce'
                });
            } else {
                this.timerText.setColor('#ffff00');
            }
        }
    }
    
    // [서비스용] 게임 준비 중 메시지 처리 함수 (늦게 들어온 플레이어용)
    private handleGamePreparing(message: any) {
        console.log('[NumberSurvivor] Game preparing received:', message);
        this.gameState = 'preparing';
        
        // UI 업데이트
        if (this.messageText) {
            this.messageText.setText(`게임 시작 준비 중입니다. 잠시 후 게임이 시작됩니다. (${message.currentPlayers}명 참가)`);
            this.messageText.setColor('#ffff00');
        }
        
        // 숫자 버튼 비활성화
        this.disableNumberButtons();
    }
    
    // [서비스용] 게임 진행 중 메시지 처리 함수 (늦게 들어온 플레이어용)
    private handleGameInProgress(message: any) {
        console.log('[NumberSurvivor] Game in progress received:', message);
        this.gameState = 'playing';
        
        // UI 업데이트
        if (this.messageText) {
            this.messageText.setText(`게임이 이미 진행 중입니다. 다음 게임을 기다려주세요.`);
            this.messageText.setColor('#ff8888');
        }
        
        // 숫자 버튼 비활성화
        this.disableNumberButtons();
    }

    // [서비스용] 게임 종료 처리 함수
    private async handleGameOver(message: GameOverMessage) {
        console.log('[NumberSurvivor] Game Over received:', message);
        console.log('[NumberSurvivor] Winners:', message.winners);
        console.log('[NumberSurvivor] Current userId:', this.userId);
        
        // 게임 상태 즉시 변경
        this.gameState = 'gameover';
        
        // 1. 즉시 UI 비활성화
        this.disableNumberButtons();
        this.cleanupTimer();
        
        // 2. 상태 메시지 초기화
        if (this.eliminatedMessage && this.roundInfoText) {
            this.eliminatedMessage.setAlpha(0);
            this.roundInfoText.setAlpha(0);
        }
        
        // 3. 로컬 스토리지 정리
        try {
            const storageKey = `eliminatedPlayer_${this.userId}_${this.roomCode}`;
            localStorage.removeItem(storageKey);
            console.log(`[NumberSurvivor] Removed elimination state from localStorage on game over, key: ${storageKey}`);
            this.playerAlive = true;
        } catch (error) {
            console.error('[NumberSurvivor] Error clearing elimination state on game over:', error);
        }
        
        // 4. 우승자 정보 처리
        const winnerNames = message.winners.map(w => w.nickname).join(', ');
        const isWinner = message.winners.some(w => String(w.userId) === String(this.userId));
        console.log(`[NumberSurvivor] Am I winner? ${isWinner}, my userId: ${this.userId}`);
        
        // 5. 게임 종료 UI 표시
        this.showGameOverBackground();
        
        if (this.messageText) {
            const congratsMessage = isWinner 
                ? `축하합니다! 당신이 우승했습니다!` 
                : `게임 종료! 우승자: ${winnerNames}`;
                
            this.messageText.setText(congratsMessage);
            this.messageText.setFontSize('36px');
            
            // 우승/패배 효과
            if (isWinner) {
                this.messageText.setColor('#ffdd00');
                this.showWinnerEffect();
            } else {
                this.messageText.setColor('#88ff88');
                this.showLoserEffect();
            }
        }
        
        // 6. POTG 녹화 시작
        try {
            if (message.roundResults && message.roundResults.length > 0) {
                console.log('[NumberSurvivor] Starting POTG recording...');
                await numberSurvivorPOTGService.startRecording(message.roundResults);
                console.log('[NumberSurvivor] POTG recording completed');
            } else {
                console.warn('[NumberSurvivor] No round results available for POTG recording');
            }
        } catch (error) {
            console.error('[NumberSurvivor] Error during POTG recording:', error);
        }
        
        // 7. 점수 계산
        const score = isWinner ? 100 : 0;

        // 8. 씬 전환 준비 (POTG 녹화 완료 후)
        this.time.delayedCall(3000, () => {
            try {
                // 모든 리소스 정리
                this.cleanupResources();
                
                // GameOver 씬으로 전환
                this.scene.start('GameOver', {
                    score: score,
                    gameType: 'NumberSurvivor',
                });
                
                // 현재 씬 정리
                this.scene.stop();
            } catch (error) {
                console.error('[NumberSurvivor] Error during scene transition:', error);
                // 에러 발생 시에도 씬 전환 시도
                this.scene.start('GameOver', {
                    score: score,
                    gameType: 'NumberSurvivor',
                    error: true
                });
            }
        });
    }
    
    // 게임 종료 배경 효과
    private showGameOverBackground() {
        // 전체 화면에 어두운 배경 효과 추가
        const darkOverlay = this.add.rectangle(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.CENTER_Y,
            GAME_CONFIG.WIDTH,
            GAME_CONFIG.HEIGHT,
            0x000000
        ).setDepth(5).setAlpha(0);
        
        // 점진적으로 어두워지는 효과
        this.tweens.add({
            targets: darkOverlay,
            alpha: 0.7,
            duration: 1000,
            ease: 'Sine.easeIn'
        });
        
        // "GAME OVER" 텍스트 추가
        const gameOverText = this.add.text(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.HEIGHT - 150,
            'GAME OVER',
            {
                fontSize: '48px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#880000',
                strokeThickness: 6
            }
        ).setOrigin(0.5).setDepth(6).setAlpha(0);
        
        // 게임 오버 텍스트 애니메이션
        this.tweens.add({
            targets: gameOverText,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 1000,
            delay: 500,
            ease: 'Back.easeOut'
        });
    }
    
    // 패배자 효과 표시 함수
    private showLoserEffect() {
        // 화면 하단에 메시지 표시
        const loserText = this.add.text(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.CENTER_Y + 100,
            '다음 게임에 도전해보세요!',
            {
                fontSize: '28px',
                color: '#aaaaff',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(15).setAlpha(0);
        
        // 천천히 나타나는 애니메이션
        this.tweens.add({
            targets: loserText,
            alpha: 1,
            y: { from: GAME_CONFIG.CENTER_Y + 120, to: GAME_CONFIG.CENTER_Y + 100 },
            duration: 1000,
            delay: 1000,
            ease: 'Power2'
        });
    }
    
    // 우승자 효과 표시 함수
    private showWinnerEffect() {
        // 화면 중앙에 트로피 아이콘 표시
        const winnerText = this.add.text(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.CENTER_Y - 100,
            '🏆',
            {
                fontSize: '120px',
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(15);
        
        // 승리 메시지 추가
        const victoryText = this.add.text(
            GAME_CONFIG.CENTER_X,
            GAME_CONFIG.CENTER_Y + 100,
            '최후의 생존자!',
            {
                fontSize: '32px',
                color: '#ffdd00',
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(15).setAlpha(0);
        
        // 메시지 애니메이션
        this.tweens.add({
            targets: victoryText,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 1000,
            delay: 800,
            ease: 'Back.easeOut'
        });
        
        // 트로피 애니메이션
        this.tweens.add({
            targets: winnerText,
            scale: { from: 0.5, to: 1.2 },
            duration: 1000,
            ease: 'Elastic',
            yoyo: true,
            repeat: 2
        });
    }
    
    // [서비스용] 라운드 결과에서 나의 결과 계산
    private calculateMyResult(result: RoundResult): { message: string, mainMessage: string, detailMessage: string, isAlive: boolean } {
        console.log('[NumberSurvivor] calculateMyResult 함수 실행 시작');
        console.log('[NumberSurvivor] 수신한 라운드 결과:', JSON.stringify(result));
        
        const userId = this.userId;
        console.log(`[NumberSurvivor] calculateMyResult - processing for userId: ${userId}`);
        
        // survivors 배열에 내 userId가 포함되어 있는지 확인
        // 타입 불일치 문제를 방지하기 위해 문자열로 변환 후 비교
        const survivors = result.survivors.map(survivor => String(survivor.userId));
        const isAlive = survivors.includes(String(userId));
        
        console.log(`[NumberSurvivor] calculateMyResult - survivors:`, survivors);
        console.log(`[NumberSurvivor] calculateMyResult - my userId (string):`, String(userId));
        console.log(`[NumberSurvivor] calculateMyResult - isAlive:`, isAlive);
        
        // 결과에 따른 메시지 생성
        let mainMessage = '';
        let detailMessage = '';
        
        // 선택한 숫자 찾기
        let myNumber: number | undefined;
        for (const [num, players] of Object.entries(result.numberSelections)) {
            // 타입 불일치 문제를 방지하기 위해 문자열로 변환 후 비교
            if (players.some(player => String(player.userId) === String(userId))) {
                myNumber = parseInt(num);
                break;
            }
        }
        
        console.log(`[NumberSurvivor] calculateMyResult - myNumber:`, myNumber);
        
        // 숫자가 선택되지 않은 경우
        if (myNumber === undefined) {
            console.log('[NumberSurvivor] calculateMyResult - No number selected, player is eliminated');
            return { 
                message: '시간 내에 숫자를 선택하지 않았습니다! 탈락하셨습니다.', 
                mainMessage: '시간 내에 숫자를 선택하지 않았습니다!',
                detailMessage: '시간 초과로 탈락',
                isAlive: false 
            };
        }
        
        // 선택한 숫자를 선택한 플레이어 수 계산
        const playersWithSameNumber = result.numberSelections[myNumber]?.length || 0;
        console.log(`[NumberSurvivor] calculateMyResult - playersWithSameNumber for ${myNumber}:`, playersWithSameNumber);
        
        if (isAlive) {
            // 혼자 선택한 경우에만 생존할 수 있음
            mainMessage = `${myNumber}번을 혼자 선택해서 생존했습니다!`;
            detailMessage = '생존';
            console.log('[NumberSurvivor] calculateMyResult - Player survived');
        } else {
            console.log('[NumberSurvivor] calculateMyResult - Player is eliminated');
            if (playersWithSameNumber > 1) {
                // 같은 숫자를 선택한 플레이어 정보 가져오기
                const sameNumberPlayers = result.numberSelections[myNumber]
                    .map(player => player.nickname)
                    .filter(nickname => nickname !== this.nickname); // 자신 제외
                
                console.log(`[NumberSurvivor] calculateMyResult - sameNumberPlayers:`, sameNumberPlayers);
                
                // 메인 메시지는 간결하게
                mainMessage = `${myNumber}번을 ${playersWithSameNumber}명이 선택해서 탈락했습니다!`;
                
                // 상세 메시지에 다른 플레이어 정보 포함
                if (sameNumberPlayers.length > 0 && sameNumberPlayers.length < 10) {
                    detailMessage = `${sameNumberPlayers.join(', ')}님과 함께 ${myNumber}번 선택`;
                } else {
                    detailMessage = `다른 플레이어들과 함께 ${myNumber}번 선택`;
                }
            } else {
                // 혼자 선택했는데 탈락한 경우 (이론적으로는 발생하지 않아야 함)
                mainMessage = `${myNumber}번을 선택했지만 탈락했습니다!`;
                detailMessage = '알 수 없는 이유로 탈락';
                console.log('[NumberSurvivor] calculateMyResult - Unusual case: Player selected number alone but eliminated');
            }
        }
        
        console.log(`[NumberSurvivor] calculateMyResult - Final result:`, { 
            message: mainMessage, 
            mainMessage, 
            detailMessage, 
            isAlive 
        });
        
        return { 
            message: mainMessage, 
            mainMessage, 
            detailMessage, 
            isAlive 
        };
    }
}