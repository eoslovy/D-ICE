import { Scene } from 'phaser';
import { UICountdown } from '../../../modules/gameutils/UICountdown';
interface InstructionConfig {
  nextGame: string;
  gameName: string;
  onComplete: () => void;
}

export class GameInstruction extends Scene {
  private nextGame: string;
  private gameName: string;
  private onComplete: () => void;
  private countTime: number = 10;
  private countdown: UICountdown;

  constructor() {
    super('GameInstruction');
  }

  init(data: InstructionConfig) {
    this.nextGame = data.nextGame;
    this.gameName = data.gameName;
    this.onComplete = data.onComplete;
  }

  preload() {
    // 게임별 설명 이미지 로드
    this.load.image('instruction-' + this.nextGame.toLowerCase(), `assets/instructions/${this.nextGame.toLowerCase()}.png`);
  }

  create() {
    const { width, height } = this.cameras.main;
    this.countdown = new UICountdown(this, width / 2, height - 100);

    // 배경 그라데이션
    this.add.graphics()
      .fillGradientStyle(0x192a56, 0x192a56, 0x273c75, 0x273c75)
      .fillRect(0, 0, width, height);

    // 게임 제목
    this.add.text(width / 2, 50, this.gameName, {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 설명 이미지
    const instruction = this.add.image(width / 2, height / 2, 'instruction-' + this.nextGame.toLowerCase())
      .setOrigin(0.5);

    // 이미지 크기 조정
    const scale = Math.min(
      (width * 0.8) / instruction.width,
      (height * 0.6) / instruction.height
    );
    instruction.setScale(scale);

    // 카운트다운 시작
    this.countdown.startCountdown(this.countTime);
    
    this.events.once("countdownFinished", () => {
      if (this.onComplete) {
        this.onComplete();
      } else {
        console.warn('onComplete is undefined!');
      }
    });
  }
}