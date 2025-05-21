import Phaser from 'phaser';
import POTGManager from '../../modules/POTGManager';

interface Point {
  x: number;
  y: number;
}

export class PerfectCircle extends Phaser.Scene {
  private drawing = false;
  private points: Point[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private sceneStartTime!: number;
  private timerText!: Phaser.GameObjects.Text;
  private roundTimeLimit = 10; // 10초로 변경
  private score: number = 0;
  private guideCenterX!: number;
  private guideCenterY!: number;
  private guideRadius!: number;

  
  constructor() {
    super('PerfectCircle');
  }

  init() {
    // 씬이 시작될 때 시간 초기화
    this.sceneStartTime = 0;  // 0부터 시작
  }

  create() {
    // 1. 배경 그라데이션
    const bg = this.add.graphics();
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    bg.fillGradientStyle(0x1e90ff, 0x00bfff, 0x1e90ff, 0x00bfff, 1);
    bg.fillRect(0, 0, width, height);
  
    // 2. 그래픽스 객체 생성 (검정색 선, 두께 8px)
    this.graphics = this.add.graphics({ lineStyle: { width: 8, color: 0x000000 } });
  
    // ⭐ 가이드라인 원 그리기
    const guide = this.add.graphics();
    guide.lineStyle(4, 0xffffff, 0.3);
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const radius = Math.min(centerX, centerY) * 0.6; // 화면 크기에 맞춰서 적당히
    guide.strokeCircle(centerX, centerY, radius);

    // 3. 제한 시간 텍스트 표시
    this.timerText = this.add.text(20, 20, `남은 시간: ${this.roundTimeLimit}`, {
      fontFamily: 'Jua',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
    });
  
    // 4. 포인터(마우스/터치) 이벤트 등록
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.drawing = true;
      this.points = [];
      this.graphics.clear();
  
      // 원 그리기 시작할 때 녹화 시작
      this.startRecording();
  
      // ⭐ 시작점 지정
      this.graphics.beginPath();
      this.graphics.moveTo(pointer.x, pointer.y);
    });
  
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.drawing) return;
      const { x, y } = pointer;
      this.points.push({ x, y });
  
      this.graphics.lineTo(x, y);
      this.graphics.strokePath();
    });
  
    this.input.on('pointerup', () => {
      if (!this.drawing) return;
      this.drawing = false;
      this.graphics.closePath(); // ⭐ 선 그리기 종료
      this.evaluateCircle();
    });
  
    // 5. 1초마다 제한시간 체크
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.sceneStartTime += 1;  // 1초씩 증가
        const remaining = Math.max(0, this.roundTimeLimit - this.sceneStartTime);
        this.timerText.setText(`남은 시간: ${remaining}`);
  
        if (remaining <= 0) {
          this.drawing = false;
          this.graphics.closePath();
          this.evaluateCircle();
        }
      }
    });

    // 타이틀
    this.add.text(width / 2, height * 0.08, '원 그리기 게임', {
      fontFamily: 'Jua',
      fontSize: '40px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
    }).setOrigin(0.5);

    // 안내문구
    this.add.text(width / 2, height * 0.18, '가이드 원을 따라 최대한 정확하게 그려보세요!', {
      fontFamily: 'Jua',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.guideCenterX = centerX;
    this.guideCenterY = centerY;
    this.guideRadius = radius;
  }
  
  evaluateCircle() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 아무것도 그리지 않은 경우 0점 처리
    if (!this.points || this.points.length <= 1) {
      this.score = 0;
      this.add.text(width/2, height*0.7, '선을 그려주세요! (0점)', {
        fontSize: '32px',
        color: '#ff0000',
        fontFamily: 'Jua',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      this.time.delayedCall(2000, () => {
        this.stopRecording();
        this.scene.start('GameOver', {
          score: this.score,
          gameType: 'PerfectCircle'
        });
      });
      this.points = [];
      this.graphics.clear();
      this.drawing = false;
      return;
    }

    // 최소 포인트 개수
    if (this.points.length < 30) {
      this.add.text(width/2, height*0.7, '조금 더 길게 그려주세요!', {
        fontSize: '32px',
        color: '#ff0000',
        fontFamily: 'Jua',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      // 초기화
      this.points = [];
      this.graphics.clear();
      this.drawing = false;
      return;
    }

    // 1) 그린 길이 계산
    let strokeLength = 0;
    for (let i = 1; i < this.points.length; i++) {
      const p0 = this.points[i-1], p1 = this.points[i];
      strokeLength += Phaser.Math.Distance.Between(p0.x, p0.y, p1.x, p1.y);
    }
    const guideCirc = 2 * Math.PI * this.guideRadius;
    if (strokeLength < guideCirc * 0.6) {
      this.add.text(width/2, height*0.7, '원 한 바퀴 이상 그려주세요!', {
        fontSize: '32px',
        color: '#ff0000',
        fontFamily: 'Jua',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      // 초기화
      this.points = [];
      this.graphics.clear();
      this.drawing = false;
      return;
    }

    const center = { x: this.guideCenterX, y: this.guideCenterY };
    // 2) 각도 커버리지 계산
    const angles = this.points.map(p => Math.atan2(p.y - center.y, p.x - center.x));
    let minA = Math.min(...angles), maxA = Math.max(...angles);
    let span = maxA - minA;
    if (span < 0) span += Math.PI * 2;
    const angleRatio = span / (Math.PI * 2);
    if (angleRatio < 0.5) {
      this.add.text(width/2, height*0.7, '최소 절반 이상 그려주세요!', {
        fontSize: '32px',
        color: '#ff0000',
        fontFamily: 'Jua',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      // 초기화
      this.points = [];
      this.graphics.clear();
      this.drawing = false;
      return;
    }

    // 3) 시작점-끝점 거리로 완성도
    const start = this.points[0], end = this.points[this.points.length-1];
    const completionDist = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const completionScore = Math.max(0, 100 - completionDist * 2);

    // 4) 반지름 정확도
    const dists = this.points.map(p =>
      Phaser.Math.Distance.Between(p.x, p.y, center.x, center.y)
    );
    const avgR = dists.reduce((s, d) => s + d, 0) / dists.length;
    const radiusScore = Math.max(0, 100 - Math.abs(avgR - this.guideRadius) * 3);

    // 5) 형태 일관성
    const devs = dists.map(d => Math.abs(d - avgR));
    const stdDev = Math.sqrt(devs.reduce((s, d) => s + d*d, 0) / devs.length);
    const shapeScore = Math.max(0, 100 - stdDev * 5);

    // 6) 최종 점수
    const rawScore = (completionScore * 0.3 + radiusScore * 0.4 + shapeScore * 0.3);
    const finalScore = Math.round(rawScore * 100) / 100;
    this.score = finalScore;

    // 7) 분류
    let resultLabel: string;
    if (angleRatio >= 0.95 && finalScore >= 80) {
      resultLabel = '🌟 완벽한 원!';
    } else if (angleRatio >= 0.7) {
      resultLabel = '👍 어설픈 원';
    } else {
      resultLabel = '❌ 원도 아닌 것';
    }

    // 결과 표시
    const resultBg = this.add.graphics();
    resultBg.fillStyle(0x000000, 0.5);
    resultBg.fillRoundedRect(width/2-180, height*0.8-50, 360, 100, 20);

    this.add.text(width/2, height*0.8 - 20, resultLabel, {
      fontFamily: 'Jua',
      fontSize: '40px',
      color: '#00ffd0',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(width/2, height*0.8 + 30, `정확도: ${finalScore}%`, {
      fontFamily: 'Jua',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // 3초 후 GameOver
    this.time.delayedCall(3000, () => {
      this.stopRecording();
      this.scene.start('GameOver', {
        score: this.score,
        gameType: 'PerfectCircle'
      });
    });
  }

  // 녹화 시작 함수 수정
  private async startRecording() {
    try {
      const started = await POTGManager.startCanvasRecording();
      if (started) {
        console.log('[PerfectCircle] 녹화가 시작되었습니다!');
      }
    } catch (error) {
      console.error('[PerfectCircle] 녹화 시작 중 오류:', error);
    }
  }

  // 녹화 중지 함수 수정
  private stopRecording() {
    POTGManager.stopRecording();
  }
}
