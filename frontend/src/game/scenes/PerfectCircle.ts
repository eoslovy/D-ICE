import Phaser from 'phaser';

interface Point {
  x: number;
  y: number;
}

export class PerfectCircle extends Phaser.Scene {
  private drawing = false;
  private points: Point[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private startTime!: number;
  private timerText!: Phaser.GameObjects.Text;
  private roundTimeLimit = 5; // 초 단위
  private score: number = 0;
  private guideCenterX!: number;
  private guideCenterY!: number;
  private guideRadius!: number;

  constructor() {
    super('PerfectCircle');
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
      this.startTime = this.time.now;
  
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
        if (this.drawing) {
          const elapsedSeconds = (this.time.now - this.startTime) / 1000;
          const remaining = Math.max(0, this.roundTimeLimit - Math.floor(elapsedSeconds));
          this.timerText.setText(`남은 시간: ${remaining}`);
  
          if (remaining <= 0) {
            this.drawing = false;
            this.graphics.closePath(); // ⭐ 남은시간 초과 시 선 닫기
            this.evaluateCircle();
          }
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

    if (this.points.length < 10) {
      this.add.text(width/2, height*0.7, '조금 더 길게 그려주세요!', {
        fontSize: '32px',
        color: '#ff0000',
        fontFamily: 'Jua',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      return;
    }
  
    const distances = this.points.map(p =>
      Math.abs(Phaser.Math.Distance.Between(p.x, p.y, this.guideCenterX, this.guideCenterY) - this.guideRadius)
    );
    const avgDist = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDist, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    let score = Math.max(0, 100 - stdDev * 2);
    score = Math.round(score * 100) / 100;
    this.score = score;
  
    const resultBg = this.add.graphics();
    resultBg.fillStyle(0x000000, 0.5);
    resultBg.fillRoundedRect(width/2-160, height*0.8-40, 320, 80, 20);

    const resultText = this.add.text(width / 2, height * 0.8, `정확도: ${score}%`, {
      fontFamily: 'Jua',
      fontSize: '48px',
      color: '#00ffd0',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);
    this.tweens.add({ targets: resultText, alpha: { from: 0, to: 1 }, duration: 500 });
  
    // 3초 후 GameOver 씬으로
    this.time.delayedCall(3000, () => {
      this.scene.start('GameOver', { 
        score: this.score,
        gameType: 'PerfectCircle'
      });
    });
  }
}
