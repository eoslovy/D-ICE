import Phaser from 'phaser';
import potgManager from '../../../modules/POTGManager';
import { v7 as uuidv7 } from 'uuid';
import { userStore } from '../../../stores/userStore';
import userWebSocketManager from '../../../modules/UserWebSocketManager';
import { UICountdown } from '../../../modules/gameutils/UICountdown';

// Add interface for scene data
interface GameOverSceneData {
  score?: number;
  gameType?: string;
}

export class GameOver extends Phaser.Scene {
  private roundScore: number = 0;
  private gameType: string = '';
  private backendResponse: AggregatedUserMessage | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private uploadStatus: Phaser.GameObjects.Text | null = null;
  private countdown?: UICountdown;
  private nextButton?: Phaser.GameObjects.Text;
  private isLastRound: boolean = false;
  
  constructor() {
    super({ key: 'GameOver' });
  }
  
  init(data: GameOverSceneData) {
    this.roundScore = data.score || 0;
    this.gameType = data.gameType || '';
    
    console.log('[GameOver] Scene initialized with data:', {
      score: this.roundScore,
      gameType: this.gameType
    });
    
    // 초기 화면 표시
    this.showInitialScreen();
    
    // Get user data from store
    const userId = userStore.getState().userId;
    const roomCode = userStore.getState().roomCode;
    console.log('[GameOver] User ID:', userId);
    console.log('[GameOver] Room Code:', roomCode);

    // Send score to backend
    this.sendScoreToBackend(userId, roomCode);

    // WebSocket 응답 리스너 설정
    userWebSocketManager.on('AGGREGATED_USER', (payload: AggregatedUserMessage) => {
      this.backendResponse = payload;
      this.isLastRound = payload.currentRound === payload.totalRound;
      this.updateUI();

      // 집계 UI 및 분기 처리
      if (payload.videoUploadUrl) {
        this.handleVideoUpload().then(() => {
          this.showCountdownAndNext();
        });
      } else {
        this.showCountdownAndNext();
      }
    });
  }

  private showCountdownAndNext() {
    // UICountdown 표시
    if (!this.countdown) {
      this.countdown = new UICountdown(this, this.cameras.main.centerX, this.cameras.main.centerY + 120);
    }
    this.countdown.startCountdown(10);

    // "다음" 버튼
    if (this.nextButton) this.nextButton.destroy();
    this.nextButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 200, '다음 게임', {
      fontSize: '36px', color: '#fff', backgroundColor: '#222', padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive();

    let finished = false;
    const goNext = () => {
      if (finished) return;
      finished = true;
      this.countdown?.stopCountdown(false);
      this.nextButton?.destroy();
      if (this.isLastRound) {
        this.EndGame();
      } else {
        this.scene.start('Preloader');
      }
    };

    this.nextButton.on('pointerdown', goNext);
    this.events.once('countdownFinished', goNext);
  }
  
  private showInitialScreen() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0);

    // 게임 오버 텍스트
    this.add.text(width / 2, height * 0.3, 
      '게임 종료!', 
      {
        fontSize: '48px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 최종 점수
    this.add.text(width / 2, height * 0.4, 
      `최종 점수: ${this.roundScore}`, 
      {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 로딩 텍스트
    this.loadingText = this.add.text(width / 2, height * 0.5, 
      '결과를 불러오는 중...', 
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 로딩 애니메이션
    this.tweens.add({
      targets: this.loadingText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // 다음 게임 버튼
    this.createPreloaderButton(width / 2, height * 0.9);
  }

  private updateUI() {
    if (!this.backendResponse) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 기존 UI 요소들 제거
    this.children.removeAll();

    // 배경
    this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0);

    // 제목
    this.add.text(width / 2, height * 0.15, 
      '게임 종료!', 
      {
        fontSize: '48px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 라운드 정보
    this.add.text(width / 2, height * 0.25,
      `현재 라운드: ${this.backendResponse.currentRound}/${this.backendResponse.totalRound}`,
      {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 점수 정보
    const scoreInfo = this.add.container(width / 2, height * 0.35);
    
    const scoreText = this.add.text(0, 0,
      `이번 라운드 점수: ${this.backendResponse.currentScore}\n` +
      `총 점수: ${this.backendResponse.totalScore}`,
      {
        fontSize: '28px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    scoreInfo.add(scoreText);

    // 순위 정보
    this.add.text(width / 2, height * 0.45,
      `이번 라운드 순위: ${this.backendResponse.roundRank}위\n` +
      `전체 순위: ${this.backendResponse.overallRank}위`,
      {
        fontSize: '28px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 라운드별 순위 그래프
    this.createRankGraph(width / 2, height * 0.65);

    // 업로드 상태 텍스트 생성 (handleVideoUpload 메서드 내에서)
    this.uploadStatus = this.add.text(width / 2, height * 0.85,
      '게임 영상 업로드 중...', 
      {
        fontSize: '20px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    // 다음 게임 버튼
    this.createPreloaderButton(width / 2, height * 0.95);

  }

  private createRankGraph(x: number, y: number) {
    const ranks = this.backendResponse!.rankRecord.split('|').map(Number);
    const graphWidth = 400;
    const graphHeight = 200;
    const padding = 40;
    
    // 그래프 배경
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x666666);
    
    // Y축 (순위는 위아래가 반대)
    graphics.beginPath();
    graphics.moveTo(x - graphWidth/2, y - graphHeight/2);
    graphics.lineTo(x - graphWidth/2, y + graphHeight/2);
    graphics.strokePath();
    
    // X축
    graphics.beginPath();
    graphics.moveTo(x - graphWidth/2, y + graphHeight/2);
    graphics.lineTo(x + graphWidth/2, y + graphHeight/2);
    graphics.strokePath();

    // 순위 선 그리기
    graphics.lineStyle(3, 0x00ff00);
    graphics.beginPath();
    
    const stepX = (graphWidth - padding * 2) / (ranks.length - 1);
    const stepY = (graphHeight - padding * 2) / 4; // 1~5위

    ranks.forEach((rank, index) => {
      const pointX = x - graphWidth/2 + padding + (stepX * index);
      const pointY = y - graphHeight/2 + padding + (stepY * (rank - 1));
      
      if (index === 0) {
        graphics.moveTo(pointX, pointY);
      } else {
        graphics.lineTo(pointX, pointY);
      }

      // 포인트 마커
      this.add.circle(pointX, pointY, 5, 0x00ff00);
      
      // X축 라벨 (라운드 번호)
      this.add.text(pointX, y + graphHeight/2 + 10, 
        `R${index + 1}`, 
        {
          fontSize: '16px',
          color: '#ffffff'
        }
      ).setOrigin(0.5, 0);
    });
    
    graphics.strokePath();

    // Y축 라벨 (순위)
    for (let i = 1; i <= 5; i++) {
      const labelY = y - graphHeight/2 + padding + (stepY * (i - 1));
      this.add.text(x - graphWidth/2 - 10, labelY,
        `${i}위`,
        {
          fontSize: '16px',
          color: '#ffffff'
        }
      ).setOrigin(1, 0.5);
    }

    // 그래프 제목
    this.add.text(x, y - graphHeight/2 - 20,
      '라운드별 순위 변화',
      {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);
  }

  private async handleVideoUpload() {
    if (!this.backendResponse?.videoUploadUrl) {
      console.log('[GameOver] No video upload URL provided');
      return;
    }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 업로드 시작 전에 '업로드 중' 상태 표시
    if (this.uploadStatus) {
      this.uploadStatus.destroy();
      this.uploadStatus = null;
    }
    this.uploadStatus = this.add.text(width / 2, height * 0.8,
      '게임 영상 업로드 중...', 
      {
        fontSize: '20px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5);

    try {
      console.log('[GameOver] Starting video upload...');
      
      // 타임아웃 처리를 위한 Promise.race 사용
      const uploadWithTimeout = Promise.race([
        potgManager.uploadRecording(this.backendResponse.videoUploadUrl),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout')), 10000) // 10초 타임아웃
        )
      ]);

      const success = await uploadWithTimeout;
      
      // 기존 업로드 상태 메시지 제거
      if (this.uploadStatus) {
        this.uploadStatus.destroy();
        this.uploadStatus = null;
      }

      if (success) {
        this.uploadStatus = this.add.text(width / 2, height * 0.8,
          '게임 영상 업로드 완료!',
          {
            fontSize: '20px',
            color: '#00ff00',
            align: 'center'
          }
        ).setOrigin(0.5);
        // 3초 후 텍스트 페이드 아웃
        this.time.delayedCall(3000, () => {
          if (this.uploadStatus) {
            this.tweens.add({
              targets: this.uploadStatus,
              alpha: 0,
              duration: 1000,
              onComplete: () => {
                if (this.uploadStatus) {
                  this.uploadStatus.destroy();
                  this.uploadStatus = null;
                }
              }
            });
          }
        });
      } else {
        this.uploadStatus = this.add.text(width / 2, height * 0.8,
          '게임 영상 업로드 실패',
          {
            fontSize: '20px',
            color: '#ff0000',
            align: 'center'
          }
        ).setOrigin(0.5);
      }
    } catch (error) {
      console.error('[GameOver] Video upload error:', error);
      if (this.uploadStatus) {
        this.uploadStatus.destroy();
        this.uploadStatus = null;
      }
      
      // 에러 메시지 구체화
      let errorMessage = '게임 영상 업로드 실패';
      if (error instanceof Error) {
        if (error.message === 'Upload timeout') {
          errorMessage = '업로드 시간 초과';
        } else if (error.message.includes('No recording available')) {
          errorMessage = '녹화된 영상 없음';
        }
      }

      this.uploadStatus = this.add.text(width / 2, height * 0.8,
        errorMessage,
        {
          fontSize: '20px',
          color: '#ff0000',
          align: 'center'
        }
      ).setOrigin(0.5);
    }
  }
  private EndGame() {
    if (!this.backendResponse) {
        console.error('[GameOver] No backend response available to end the game.');
        return;
    }

    // Pass totalScore, rankRecord, and overallRank to the EndGame scene
    this.scene.start('EndGame', {
        totalScore: this.backendResponse.totalScore,
        rankRecord: this.backendResponse.rankRecord,
        overallRank: this.backendResponse.overallRank
    });
  }

  private createPreloaderButton(x: number, y: number) {
    const buttonWidth = 200;
    const buttonHeight = 50;

    const button = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x4a4a4a, 1);
    bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 16);
    
    const text = this.add.text(0, 0, '다음 게임', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    button.add([bg, text]);
    button.setSize(buttonWidth, buttonHeight);
    button.setInteractive();
    
    button.on('pointerup', () => {
      this.scene.start('Preloader');
    });
}
  
  private sendScoreToBackend(userId: string | null, roomCode: string | null) {
    if (userId==null || roomCode==null) {
      console.error('[GameOver] Missing userId or roomCode from store');
      return;
    }

    const message = {
      type: 'SUBMIT',
      requestId: uuidv7(),
      userId,
      score: this.roundScore,
      gameType: this.gameType
    };

    console.log('[GameOver] Sending score to backend:', message);
    const success = userWebSocketManager.send(message);
    console.log('[GameOver] Score send result:', success ? 'Success' : 'Failed');
  }
}
