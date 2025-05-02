import { Scene } from 'phaser';

interface RouletteConfig {
    games: {
      name: string;
      key: string;
      color: number;
    }[];
    nextGame: string;
    onComplete: () => void;
  }
  

interface GameItem {
  name: string;
  key: string;
  color: number;
}

export class Roulette extends Scene {
  private wheel: Phaser.GameObjects.Container;
  private games: GameItem[];
  private nextGame: string;
  private onComplete: () => void;
  private isSpinning: boolean = false;

  constructor() {
    super('Roulette');
  }

  init(data: RouletteConfig) {
    this.games = data.games;
    this.nextGame = data.nextGame;
    this.onComplete = data.onComplete;
  }

  create() {
    const { width, height } = this.cameras.main;
    
    // 전체 화면 배경 그라데이션
    this.add.graphics()
      .fillGradientStyle(0x192a56, 0x192a56, 0x273c75, 0x273c75)
      .fillRect(0, 0, width, height);

    // 룰렛 컨테이너 생성
    this.wheel = this.add.container(width / 2, height / 2);

    const wheelRadius = Math.min(width, height) * 0.35;
    const sliceAngle = (Math.PI * 2) / this.games.length;

    // 게임 항목 추가
    this.games.forEach((game, index) => {
      const graphics = this.add.graphics();
      const startAngle = sliceAngle * index;
      const endAngle = startAngle + sliceAngle;
      
      // 섹션 그리기
      graphics.beginPath();
      graphics.lineStyle(2, 0xffffff, 0.5);
      graphics.fillStyle(game.color, 0.7);
      graphics.moveTo(0, 0);
      graphics.arc(0, 0, wheelRadius, startAngle, endAngle);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      
      this.wheel.add(graphics);
      
      // 게임 이름 추가
      const textAngle = startAngle + sliceAngle / 2;
      const text = this.add.text(
        Math.cos(textAngle) * (wheelRadius * 0.7),
        Math.sin(textAngle) * (wheelRadius * 0.7),
        game.name,
        {
          fontSize: '24px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4
        }
      ).setOrigin(0.5);
      
      text.setRotation(textAngle + Math.PI / 2);
      this.wheel.add(text);
    });

    // 화살표를 가운데 위쪽으로 이동 (아래 방향)
    this.add.triangle(
      width / 2 + 20,
      height / 2 - wheelRadius - 20,
      0, -20,    // 첫 번째 점 (꼭지점)
      20, 0,     // 두 번째 점 (오른쪽)
      -20, 0,    // 세 번째 점 (왼쪽)
      0xffffff
    ).setOrigin(0.5);

    // 씬 생성 후 바로 룰렛 회전 시작
    this.time.delayedCall(500, () => this.spinWheel());
  }

  spinWheel() {
    if (this.isSpinning) return;
    this.isSpinning = true;

    const targetIndex = this.games.findIndex(game => game.key === this.nextGame);

    if (targetIndex === -1) {
      console.error(`Game ${this.nextGame} not found in the wheel`);
      return;
    }

    const sliceAngle = (Math.PI * 2) / this.games.length;
    const targetAngle = -((sliceAngle * targetIndex) + (Math.PI / 2)) - 0.175; // 0.175 라디안 = 10도
    const totalAngle = (Math.PI * 2 * 5) + targetAngle;

    this.tweens.add({
      targets: this.wheel,
      rotation: totalAngle,
      duration: 3000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.isSpinning = false;
        
        // 모달 배경 추가
        const modalBg = this.add.graphics();
        modalBg.fillStyle(0x000000, 0.7);
        modalBg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        
        // 모달 컨테이너
        const modalContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY);
        
        // 모달 배경
        const modalBox = this.add.graphics();
        modalBox.fillStyle(this.games[targetIndex].color, 1);
        modalBox.fillRoundedRect(-200, -150, 400, 300, 20);
        modalContainer.add(modalBox);

        // 선택된 게임 제목
        const titleText = this.add.text(0, -80, '선택된 게임', {
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        modalContainer.add(titleText);

        // 게임 이름
        const gameNameText = this.add.text(0, 0, this.games[targetIndex].name, {
          fontSize: '48px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
          align: 'center',
          wordWrap: { width: 380 }
        }).setOrigin(0.5);
        modalContainer.add(gameNameText);

        // 모달 페이드인 효과
        modalContainer.setAlpha(0);
        this.tweens.add({
          targets: [modalBg, modalContainer],
          alpha: { from: 0, to: 1 },
          duration: 500,
          onComplete: () => {
            // 2초 후 다음 씬으로
            this.time.delayedCall(2000, this.onComplete);
          }
        });
      }
    });
  }
}