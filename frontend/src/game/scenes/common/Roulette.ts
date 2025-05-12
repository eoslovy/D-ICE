import { Scene } from 'phaser';
import { GAME_TYPES } from './GameType';

interface RouletteConfig {
  nextGame: string;
  onComplete: () => void;
}

export class Roulette extends Scene {
  private wheel!: Phaser.GameObjects.Container;
  private nextGame!: string;
  private onComplete!: () => void;
  private isSpinning: boolean = false;
  private sliceHeight: number = 0;
  private spinVelocity: number = 0;
  private spinPhase: 'idle' | 'spinning' | 'slowing' | 'stopping' = 'idle';
  private stopTargetIndex: number = 0;
  private stopTargetY: number = 0;
  private totalItems: number = 0;
  private visibleCount: number = 3; // 보여지는 텍스트 개수

  constructor() {
    super('Roulette');
  }

  init(data: RouletteConfig) {
    this.nextGame = data.nextGame;
    this.onComplete = data.onComplete;
  }

  create() {
    const { width, height } = this.cameras.main;
    this.sliceHeight = height * 0.13; // 3개만 보이게 영역 조정
    this.totalItems = GAME_TYPES.length * 3;

    // 배경
    this.createAnimatedBackground(width, height);

    // 룰렛 컨테이너
    this.wheel = this.add.container(width / 2, height / 2);

    // 아이템 생성
    for (let i = 0; i < this.totalItems; i++) {
      const game = GAME_TYPES[i % GAME_TYPES.length];
      const y = (i - Math.floor(this.totalItems / 2)) * this.sliceHeight;
      this.wheel.add(this.createWheelItem(game.name, y));
    }

    // 마스크: wheel 컨테이너 기준 중앙 3개만 보이게
    const maskWidth = width * 0.7;
    const maskHeight = this.sliceHeight * this.visibleCount;
    const maskShape = this.add.graphics();
    maskShape.fillRect(
      width / 2 - maskWidth / 2,
      height / 2 - maskHeight / 2,
      maskWidth,
      maskHeight
    );
    maskShape.setVisible(false);
    this.wheel.setMask(maskShape.createGeometryMask());

    // 바깥 테두리(황금색)
    const border = this.add.graphics();
    border.lineStyle(12, 0xffd700, 1);
    border.strokeRoundedRect(
      width / 2 - maskWidth / 2 - 8,
      height / 2 - maskHeight / 2 - 8,
      maskWidth + 16,
      maskHeight + 16,
      40
    );
    // 안쪽 테두리(짙은 갈색)
    border.lineStyle(6, 0x6d4c1b, 1);
    border.strokeRoundedRect(
      width / 2 - maskWidth / 2,
      height / 2 - maskHeight / 2,
      maskWidth,
      maskHeight,
      32
    );
    // 중앙 강조선(살짝 밝은색)
    border.lineStyle(4, 0xfff6d3, 0.7);
    border.strokeRoundedRect(
      width / 2 - maskWidth / 2 + 12,
      height / 2 - this.sliceHeight / 2,
      maskWidth - 24,
      this.sliceHeight,
      24
    );
    // 양옆 포인터
    this.createSidePointers(width, height, maskWidth);

    // 1초 후 자동 스핀
    this.time.delayedCall(1000, () => this.spinWheel());

    // update 등록
    this.events.on('update', this.update, this);
  }

  private createAnimatedBackground(width: number, height: number) {
    const bg = this.add.graphics();
    bg.setDepth(-100);

    let t = 0;
    this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        t += 0.01;
        const color1 = Phaser.Display.Color.Interpolate.ColorWithColor(
          new Phaser.Display.Color(25, 42, 86),
          new Phaser.Display.Color(39, 60, 117),
          100,
          Math.abs(Math.sin(t)) * 100
        );
        const color2 = Phaser.Display.Color.Interpolate.ColorWithColor(
          new Phaser.Display.Color(39, 60, 117),
          new Phaser.Display.Color(25, 42, 86),
          100,
          Math.abs(Math.cos(t)) * 100
        );
        bg.clear();
        bg.fillGradientStyle(
          Phaser.Display.Color.GetColor(color1.r, color1.g, color1.b),
          Phaser.Display.Color.GetColor(color1.r, color1.g, color1.b),
          Phaser.Display.Color.GetColor(color2.r, color2.g, color2.b),
          Phaser.Display.Color.GetColor(color2.r, color2.g, color2.b)
        );
        bg.fillRect(0, 0, width, height);
      }
    });
  }

  private createWheelItem(text: string, y: number) {
    const container = this.add.container(0, y);

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.16);
    bg.fillRoundedRect(-180, -this.sliceHeight / 2, 360, this.sliceHeight - 8, 16);

    // 텍스트
    const textObj = this.add.text(0, 0, text, {
      fontSize: '32px',
      color: '#fff',
      fontStyle: 'bold',
      fontFamily: 'Arial',
      stroke: '#222',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    container.add([bg, textObj]);
    return container;
  }

  // 양옆에서 가리키는 포인터
  private createSidePointers(width: number, height: number, maskWidth: number) {
    const centerY = height / 2;
    const pointerSize = 36;
    // 왼쪽 포인터
    const leftPointer = this.add.triangle(
      width / 2 - maskWidth / 2 - pointerSize / 2, centerY,
      0, pointerSize / 2,
      pointerSize, 0,
      pointerSize, pointerSize,
      0xffd700
    ).setOrigin(0.5);
    // 오른쪽 포인터
    const rightPointer = this.add.triangle(
      width / 2 + maskWidth / 2 + pointerSize / 2, centerY,
      pointerSize, pointerSize / 2,
      0, 0,
      0, pointerSize,
      0xffd700
    ).setOrigin(0.5);

    // 애니메이션
    this.tweens.add({
      targets: [leftPointer, rightPointer],
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  spinWheel() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.spinPhase = 'spinning';

    // 목표 인덱스
    const targetIndex = GAME_TYPES.findIndex(g => g.key === this.nextGame);
    if (targetIndex === -1) {
      console.error('nextGame not found:', this.nextGame);
      return;
    }
    this.stopTargetIndex = targetIndex;

    // 중앙에 nextGame이 오도록 stopTargetY 계산
    // 중앙에 오는 아이템 인덱스
    const centerIndex = Math.floor(this.totalItems / 2);
    // 현재 중앙에 있는 게임의 인덱스
    const currentCenterGameIdx = (centerIndex) % GAME_TYPES.length;
    // nextGame이 중앙에 오도록 wheel.y를 이동
    const diff = ((targetIndex - currentCenterGameIdx + GAME_TYPES.length) % GAME_TYPES.length);
    const rounds = 5;
    const stopIndex = centerIndex + diff + rounds * GAME_TYPES.length;
    this.stopTargetY = -((stopIndex) * this.sliceHeight) - 20;

    // 초기 속도
    this.spinVelocity = 55;
  }

  update(time: number, delta: number) {
    if (!this.isSpinning) return;

    // 무한 스크롤 효과
    for (let i = 0; i < this.wheel.length; i++) {
      const item = this.wheel.getAt(i) as Phaser.GameObjects.Container;
      if (!item) continue;
      // 화면 위로 완전히 사라지면 아래로 내림
      if (item.y + this.wheel.y < -this.sliceHeight * 2) {
        item.y += this.sliceHeight * GAME_TYPES.length * 3;
      }
      // 화면 아래로 완전히 사라지면 위로 올림
      if (item.y + this.wheel.y > this.cameras.main.height + this.sliceHeight * 2) {
        item.y -= this.sliceHeight * GAME_TYPES.length * 3;
      }
    }

    // 델타타임 기반 프레임 독립적 이동
    const deltaFactor = delta / 16;

    if (this.spinPhase === 'spinning') {
      this.wheel.y -= this.spinVelocity * deltaFactor;

      // 초기 감속 커브 조정
      if (this.spinVelocity > 15) {
        this.spinVelocity *= 0.982;
      } else {
        this.spinPhase = 'slowing';
      }
    }
    else if (this.spinPhase === 'slowing') {
      this.wheel.y -= this.spinVelocity * deltaFactor;
      this.spinVelocity *= 0.965;

      // 종료 조건
      const diff = Math.abs(this.wheel.y - this.stopTargetY);
      const shouldStop = diff < this.sliceHeight * 2.5 || this.spinVelocity < 3;

      if (shouldStop) {
        this.spinPhase = 'stopping';
        this.tweens.add({
          targets: this.wheel,
          y: this.stopTargetY,
          duration: 1200,
          ease: 'Elastic.easeOut',
          onComplete: () => {
            this.handleSpinComplete();
          }
        });
      }
    }
  }

  private handleSpinComplete() {
    this.isSpinning = false;
    this.spinPhase = 'idle';

    // 0.5초 후 모달 표시
    this.time.delayedCall(500, () => {
      this.showResultModal();
    });
  }

  private showResultModal() {
    const { width, height } = this.cameras.main;
    const targetGame = GAME_TYPES[this.stopTargetIndex];

    // 반투명 배경
    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x000000, 0.7);
    modalBg.fillRect(0, 0, width, height);

    // 모달 컨테이너
    const modalContainer = this.add.container(width / 2, height / 2);

    // 모달 박스
    const modalBox = this.add.graphics();
    modalBox.fillStyle(0xffffff, 0.95);
    modalBox.fillRoundedRect(-200, -120, 400, 240, 24);
    modalContainer.add(modalBox);

    // 타이틀
    const titleText = this.add.text(0, -60, '다음 게임', {
      fontSize: '28px',
      color: '#273c75',
      fontStyle: 'bold',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    modalContainer.add(titleText);

    // 게임 이름
    const gameNameText = this.add.text(0, 18, targetGame.name, {
      fontSize: '48px',
      color: '#192a56',
      fontStyle: 'bold',
      fontFamily: 'Arial',
      stroke: '#fff',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: 340 }
    }).setOrigin(0.5);
    modalContainer.add(gameNameText);

    // 모달 페이드인
    modalContainer.setAlpha(0);
    modalBg.setAlpha(0);
    this.tweens.add({
      targets: [modalBg, modalContainer],
      alpha: 1,
      duration: 500,
      onComplete: () => {
        // 2초 후 다음 씬으로
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: [modalBg, modalContainer],
            alpha: 0,
            duration: 500,
            onComplete: () => {
              modalBg.destroy();
              modalContainer.destroy();
              this.scene.start('GameInstruction', {
                nextGame: this.nextGame,
                gameName: targetGame.name,
                onComplete: () => {
                  console.log("GameInstruction Scene Stop");
                  this.scene.stop('GameInstruction');
                  this.onComplete();
                }
              });
            }
          });
        });
      }
    });
  }
}
