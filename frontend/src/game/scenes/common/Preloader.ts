import Phaser from 'phaser';
import webSocketManager from '../../../modules/WebSocketManager';

interface GameInfo {
  nextGame: string;
  rouletteGames: {
    name: string;
    key: string;
    color: number;
  }[];
}

export class Preloader extends Phaser.Scene {
  private TOTAL_PLAYERS: number = 10; // 총 참가자 수
  private waitingText?: Phaser.GameObjects.Text;
  private userCountText?: Phaser.GameObjects.Text;
  private clickText?: Phaser.GameObjects.Text;
  private clickZone?: Phaser.GameObjects.Rectangle;
  private mockUserCount: number = 1;
  private readyToStart: boolean = false;
  private updateTimer?: Phaser.Time.TimerEvent;
  private mockGameInfo: GameInfo = {
    nextGame: 'Reaction',
    rouletteGames: [
      { name: '반응속도 게임', key: 'Reaction', color: 0x2ed573 },
      { name: '클리커 게임', key: 'Clicker', color: 0xff4757 },
      { name: '메모리 게임', key: 'Memory', color: 0x1e90ff },
      { name: '퍼즐 게임', key: 'Puzzle', color: 0xffa502 },
      { name: '리듬 게임', key: 'Rhythm', color: 0xe84393 },
      { name: '타이핑 게임', key: 'Typing', color: 0xa8e6cf },
      { name: '카드 매칭', key: 'Cards', color: 0x3742fa },
      { name: '미로 찾기', key: 'Maze', color: 0x2f3542 },
      { name: '색상 맞추기', key: 'Color', color: 0x7bed9f },
      { name: '숫자 게임', key: 'Number', color: 0xfed330 }
    ]
  };

  constructor() {
    super({ key: 'Preloader' });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      this.showWaitingMessage();
    });
    
    this.load.image('bg', 'assets/bg.png');
    this.load.image('logo', 'assets/logo.png');
    this.load.image('star', 'assets/star.png');
  }

  private updateUserCount() {
    // 랜덤하게 접속자 수 변동
    const prevCount = this.mockUserCount;
    const change = Phaser.Math.Between(1, 3);
    this.mockUserCount = Phaser.Math.Clamp(this.mockUserCount + change, 1, this.TOTAL_PLAYERS);

    if (this.userCountText) {
      this.userCountText.setText(`현재 접속자: ${this.mockUserCount}/${this.TOTAL_PLAYERS}명`);
      
      // 숫자가 변경될 때 텍스트 효과
      if (prevCount !== this.mockUserCount) {
        this.tweens.add({
          targets: this.userCountText,
          scale: { from: 1.2, to: 1 },
          duration: 200
        });
      }
    }

    // 모든 플레이어가 모이면 시작 가능 상태로 변경
    if (this.mockUserCount === this.TOTAL_PLAYERS && !this.readyToStart) {
      this.readyToStart = true;
      if (this.waitingText) {
        this.waitingText.setText('모든 유저가 접속했습니다!');
      }
      if (this.clickText) {
        this.tweens.add({
          targets: this.clickText,
          alpha: 1,
          duration: 500,
          ease: 'Power2'
        });
      }
      // 지금은 임시로 클릭으로 했지만 나중에 통신 코드 추가 해야함
    }
    // 인원이 부족하면 다시 대기 상태로
    else if (this.mockUserCount < this.TOTAL_PLAYERS && this.readyToStart) {
      this.readyToStart = false;
      if (this.clickText) {
        this.clickText.setAlpha(0);
      }
    }
  }

  private showWaitingMessage() {
    const { width, height } = this.cameras.main;
    
    this.waitingText = this.add.text(width / 2, height / 2 - 50, '다른 유저를 기다리는 중입니다...', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.userCountText = this.add.text(width / 2, height / 2, `현재 접속자: 1/${this.TOTAL_PLAYERS}명`, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#7bed9f',
      align: 'center'
    }).setOrigin(0.5);

    // this.clickText = this.add.text(width / 2, height / 2 + 50, '클릭하여 게임 시작', {
    //   fontFamily: 'Arial',
    //   fontSize: '32px',
    //   color: '#ffd700',
    //   align: 'center'
    // }).setOrigin(0.5).setAlpha(0);

    // 점 애니메이션
    let dots = '';
    this.time.addEvent({
      delay: 500,
      callback: () => {
        dots = dots.length >= 3 ? '' : dots + '.';
        if (this.waitingText && !this.readyToStart) {
          this.waitingText.setText('다른 유저를 기다리는 중입니다' + dots);
        }
      },
      loop: true
    });

    // 접속자 수 주기적 업데이트 (1초마다)
    this.updateTimer = this.time.addEvent({
      delay: 1000,
      callback: this.updateUserCount,
      callbackScope: this,
      loop: true
    });

    // 클릭 영역을 클래스 멤버 변수로 저장
    // this.clickZone = this.add.rectangle(0, 0, width, height, 0xffffff, 0)
    //   .setOrigin(0)
    //   .setInteractive()
    //   .setDepth(1000) // 다른 UI 요소보다 위에 오도록 설정
    //   .on('pointerdown', () => {
    //     console.log('Clicked', this.readyToStart); // 디버깅용
    //     if (this.readyToStart) {
    //       this.moveToRoulette();
    //     }
    //   });

    // UI 요소들의 depth 설정
    this.waitingText?.setDepth(100);
    this.userCountText?.setDepth(100);
    this.clickText?.setDepth(100);
  }

  private moveToRoulette() {

    this.clickZone?.destroy();

    // 타이머 정지
    this.updateTimer?.destroy();
    
    // 텍스트 제거
    this.waitingText?.destroy();
    this.userCountText?.destroy();
    this.clickText?.destroy();

    this.scene.start('Roulette', {
      games: this.mockGameInfo.rouletteGames,
      nextGame: this.mockGameInfo.nextGame,
      onComplete: () => {
        this.scene.stop('Roulette');
        this.scene.start(this.mockGameInfo.nextGame);
      }
    });
  }

  create() {
    // 메시지 타입별 리스너 등록
  
    webSocketManager.on('WAIT', (data) => {
      this.readyToStart = true;
      if (data) {
        this.mockGameInfo.nextGame = data.gameType;
      }
      this.moveToRoulette();
    });
  
    webSocketManager.on('error', (error) => {
      console.error('WebSocket Error:', error);
      if (this.waitingText) {
        this.waitingText.setText('서버 연결 오류가 발생했습니다');
      }
    });
  
    // 일반 메시지 리스너 (디버깅용)
    webSocketManager.on('message', (data) => {
      console.log('Received message:', data);
    });
  }
}