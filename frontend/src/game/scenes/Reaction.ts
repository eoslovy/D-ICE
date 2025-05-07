import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class Reaction extends Phaser.Scene {
  private state: 'waiting' | 'ready' | 'clicked' = 'waiting';
  private infoText!: Phaser.GameObjects.Text;
  private reactionTimes: number[] = [];
  private startTime = 0;
  private timerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super('Reaction');
  }

  create() {
    this.state = 'waiting';
    this.reactionTimes = []; // 배열 초기화 추가
    this.startTime = 0;
    
    this.cameras.main.setBackgroundColor('#2b87d1'); // 파란색 배경색
    this.infoText = this.add.text(this.scale.width / 2, this.scale.height / 2, '클릭해서 시작하세요', {
      fontSize: '48px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.input.once('pointerdown', this.startWaiting, this);

    EventBus.emit('current-scene-ready', this);
  }

  startWaiting() {
    if (this.reactionTimes.length >= 5) {
      this.calculateAverage();
      return;
    }

    this.state = 'waiting';
    this.cameras.main.setBackgroundColor('#c82535'); // 빨간색 배경
    this.infoText.setText('초록색이 되면 클릭!');
    const delay = Phaser.Math.Between(1500, 5000); // 1.5~5초 랜덤 대기
    this.timerEvent = this.time.delayedCall(delay, this.turnGreen, [], this);

    this.input.once('pointerdown', this.tooSoon, this);
  }

  turnGreen() {
    this.state = 'ready';
    this.cameras.main.setBackgroundColor('#4bda6a'); // 초록색 배경
    this.infoText.setText('지금 클릭!');
    this.startTime = this.time.now;

    this.input.once('pointerdown', this.recordReaction, this);
  }

  tooSoon() {
    if (this.state === 'waiting') {
      this.timerEvent?.remove();
      this.state = 'clicked';
      this.cameras.main.setBackgroundColor('#2b87d1'); // 파란색 배경
      this.infoText.setText('너무 빨랐어요!\n클릭해서 다시 시작');
      this.input.once('pointerdown', this.startWaiting, this);
    }
  }

  recordReaction() {
    if (this.state === 'ready') {
      this.state = 'clicked';
      const reactionTime = Math.round(this.time.now - this.startTime);
      this.reactionTimes.push(reactionTime);

      this.cameras.main.setBackgroundColor('#2b87d1'); // 파란색 배경

      if (this.reactionTimes.length < 5) {
        this.infoText.setText(
          `반응속도: ${reactionTime}ms\n(${this.reactionTimes.length}/5)\n클릭해서 다시 시작`
        );
        this.input.once('pointerdown', this.startWaiting, this);
      } else {
        this.infoText.setText(
          `반응속도: ${reactionTime}ms\n(${this.reactionTimes.length}/5)\n게임 종료`
        );
        this.input.once('pointerdown', this.calculateAverage, this);
      }
    }
  }

  calculateAverage() {
    const average =
      this.reactionTimes.reduce((sum, time) => sum + time, 0) / this.reactionTimes.length;
    this.cameras.main.setBackgroundColor('#2b87d1'); // 어두운 배경
    const score = Math.round(average);
    this.showGraph();
    
    this.infoText.setText(
      `평균 반응속도: ${score}ms\n\n메인 메뉴로`
    );
    
    // 클릭 시 GameOver 씬으로 이동
    this.input.once('pointerdown', () => {
      this.scene.start('GameOver', {score : score, gameType: 'Reaction'});
    });
  }

  showGraph() {
    const graph = this.add.graphics();
    const graphWidth = this.scale.width - 100; // 그래프 너비
    const graphHeight = 200; // 그래프 높이
    const graphX = 50; // 그래프 시작 X 좌표
    const graphY = 300; // 그래프 시작 Y 좌표
  
    graph.clear();
    graph.fillStyle(0x4bda6a, 0.5); // 초록색 반투명 영역 
    graph.lineStyle(2, 0xffffff, 1); // 흰색 선 
  
    const points: { x: number; y: number }[] = []; // 꼭지점 좌표 저장
  
    const maxTime = Math.max(...this.reactionTimes);
    const stepX = graphWidth / (this.reactionTimes.length - 1); // 점 간격
  
    this.reactionTimes.forEach((time, index) => {
      const x = graphX + index * stepX;
      const y = graphY + graphHeight - (time / maxTime) * graphHeight;
  
      points.push({ x, y });
  
      // 각 점 위에 반응 속도 표시
      this.add.text(x, y - 20, `${time}ms`, {
        fontSize: '24px',
        color: '#ffffff', // 흰색 텍스트 (채도 낮춤)
      }).setOrigin(0.5);
    });
  
    // 영역 그래프 그리기
    graph.beginPath();
    graph.moveTo(points[0].x, graphY + graphHeight); // 시작점 (아래쪽)
    points.forEach((point) => {
      graph.lineTo(point.x, point.y); // 꼭지점 연결
    });
    graph.lineTo(points[points.length - 1].x, graphY + graphHeight); // 마지막 점에서 아래로
    graph.closePath();
    graph.fillPath(); // 영역 채우기
  
    // 선 그리기
    graph.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        graph.moveTo(point.x, point.y);
      } else {
        graph.lineTo(point.x, point.y);
      }
    });
    graph.strokePath();
  
    // 꼭지점에 원형 점 그리기
    points.forEach((point) => {
      graph.fillStyle(0xffffff, 1); // 흰색 점
      graph.fillCircle(point.x, point.y, 10); // 반지름 5px의 원
    });
  }
}