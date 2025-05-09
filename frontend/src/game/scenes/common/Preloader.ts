import Phaser from 'phaser';
import userWebSocketManager from '../../../modules/UserWebSocketManager';
import { LoadManifestFromJSON } from '../../../modules/gameutils/LoadSpritesManifest';


interface GameInfo {
  nextGame: string;
  rouletteGames: {
    name: string;
    key: string;
    color: number;
  }[];
}

export class Preloader extends Phaser.Scene {
  private waitingText?: Phaser.GameObjects.Text;
  private readyToStart: boolean = false;
  private mockNextGame: string = "Dye";
  private mockGameInfo: GameInfo = {
    nextGame: 'PerfectCircle',
    rouletteGames: [
      { name: '반응속도 게임', key: 'Reaction', color: 0x2ed573 },
      { name: '클리커 게임', key: 'Clicker', color: 0xff4757 },
      { name: '원 그리기 게임', key: 'PerfectCircle', color: 0x1e90ff },
      { name: '퍼즐 게임', key: 'Puzzle', color: 0xffa502 },
      { name: '리듬 게임', key: 'Rhythm', color: 0xe84393 },
      { name: '타이핑 게임', key: 'Typing', color: 0xa8e6cf },
      { name: '카드 매칭', key: 'Cards', color: 0x3742fa },
      { name: '미로 찾기', key: 'Maze', color: 0x2f3542 },
      { name: '색상 맞추기', key: 'Color', color: 0x7bed9f },
      { name: '숫자 게임', key: 'Number', color: 0xfed330 },
      { name: '무궁화', key: 'Mugungwha', color: 0xff6348 },
      { name: '줄타기', key: 'Wirewalk', color: 0x1dd1a1 },
      { name: '요세푸스', key: 'Josephus', color: 0xff6b81 },
      { name: '염색', key: 'Dye', color: 0xff9f43 },
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
    LoadManifestFromJSON(this, 'assets/manifest.json');
  }

  private showWaitingMessage() {
    const { width, height } = this.cameras.main;
    
    this.waitingText = this.add.text(width / 2, height / 2 - 50, '다른 유저를 기다리는 중입니다...', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

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

  }

  private moveToRoulette() {

    // 텍스트 제거
    this.waitingText?.destroy();

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
    console.log("WAIT 이벤트 리스너 등록");
    userWebSocketManager.on("WAIT", (payload: WaitMessage) => {
      console.log("WAIT 응답 성공:", payload);
      this.readyToStart = true;
      if (payload) {
        //this.mockGameInfo.nextGame = this.mockNextGame;
        this.mockGameInfo.nextGame = payload.gameType;
      }
      this.moveToRoulette();
    });
  
  }

}