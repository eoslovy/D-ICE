import Phaser from 'phaser';
import { Player, RoundResult, logger } from '../types/potg';

export class NumberSurvivorPOTGScene extends Phaser.Scene {
  private roundData: RoundResult[] = [];
  private allPlayers: Player[] = [];
  private shuffledOrder: Player[] = [];
  private objectPool: {
    cards: Phaser.GameObjects.Rectangle[];
    texts: Phaser.GameObjects.Text[];
    containers: Phaser.GameObjects.Container[];
    graphics: Phaser.GameObjects.Graphics[];
  } = { cards: [], texts: [], containers: [], graphics: [] };

  constructor() {
    super('NumberSurvivorPOTG');
  }

  preload() {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Jua&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  init(data: { roundData?: RoundResult[] }) {
    logger.info('=== POTG 씬 초기화 ===');
    logger.info('받은 데이터:', JSON.stringify(data, null, 2));
    
    try {
      this.initializePlayerData(data);
      logger.info('플레이어 데이터 초기화 완료:', {
        총플레이어: this.allPlayers.length,
        라운드수: this.roundData.length
      });
    } catch (error) {
      logger.error('초기화 중 오류:', error);
      this.showErrorUI('초기화 실패');
    }
  }

  private initializePlayerData(data: { roundData?: RoundResult[] }) {
    const playerMap = new Map<string, string>();
    
    (data.roundData || []).forEach(round => {
      [...(round.survivors || []), ...(round.eliminated || [])].forEach(player => {
        playerMap.set(player.userId, player.nickname);
      });
    });

    this.allPlayers = Array.from(playerMap.entries()).map(([userId, nickname]) => ({
      userId,
      nickname
    }));
    
    this.roundData = data.roundData || [];
    this.shuffledOrder = this.shuffle([...this.allPlayers]);
  }

  async create() {
    logger.info('=== POTG 씬 생성 시작 ===');
    try {
      for (let i = 0; i < this.roundData.length; i++) {
        logger.info(`라운드 ${i + 1}/${this.roundData.length} 시각화 시작`);
        await this.visualizeRound(this.roundData[i], i + 1);
        await this.sleep(1200);
        
        if (i < this.roundData.length - 1) {
          logger.info(`라운드 ${i + 1} → ${i + 2} 전환`);
          await this.transitionToNextRound();
        } else {
          logger.info('마지막 라운드 완료, 대기 중...');
          await this.sleep(2000);
        }
      }

      logger.info('=== POTG 씬 시각화 완료 ===');
      this.handleVisualizationComplete();
    } catch (error) {
      logger.error('시각화 중 오류:', error);
      this.showErrorUI('시각화 실패');
    }
  }

  private async visualizeRound(round: RoundResult, roundNum: number) {
    logger.info(`라운드 ${roundNum} 시각화 시작:`, {
      생존자: round.survivors.length,
      탈락자: round.eliminated.length
    });
    
    this.cleanupObjects();
    
    try {
      const { width, height } = this.cameras.main;
      this.createBackground(width, height);
      this.createRoundLabel(roundNum, width, height);
      this.createPlayerGrid(round, width, height);
      logger.info(`라운드 ${roundNum} 시각화 완료`);
    } catch (error) {
      logger.error(`라운드 ${roundNum} 시각화 중 오류:`, error);
      this.showErrorUI(`라운드 ${roundNum} 시각화 실패`);
    }
  }

  private createBackground(width: number, height: number) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e90ff, 0x00bfff, 0x1e90ff, 0x00bfff, 1);
    bg.fillRect(0, 0, width, height);
    this.objectPool.graphics.push(bg);
  }

  private createRoundLabel(roundNum: number, width: number, height: number) {
    const roundLabel = roundNum === this.roundData.length ? '우승자!!' : `ROUND ${roundNum}`;
    const text = this.add.text(width / 2, height * 0.12, roundLabel, {
      fontSize: `${Math.round(height * 0.05)}px`,
      color: '#fff',
      fontFamily: 'Jua',
      stroke: '#000',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 6, fill: true }
    }).setOrigin(0.5);
    this.objectPool.texts.push(text);
  }

  private createPlayerGrid(round: RoundResult, width: number, height: number) {
    const gridConfig = this.calculateGridConfig(width, height);
    const survivorIds = new Set(round.survivors.map(p => p.userId));
    const eliminatedIds = new Set(round.eliminated.map(p => p.userId));

    this.shuffledOrder.forEach((player, idx) => {
      const { x, y } = this.calculatePlayerPosition(idx, gridConfig);
      this.createPlayerCard(player, x, y, gridConfig, {
        isSurvivor: survivorIds.has(player.userId),
        isEliminated: eliminatedIds.has(player.userId),
        isWinner: round === this.roundData[this.roundData.length - 1] && survivorIds.has(player.userId)
      });
    });
  }

  private calculateGridConfig(width: number, height: number) {
    const cols = 5;
    const rows = 2;
    const marginX = width * 0.02;
    const marginY = height * 0.03;
    const cardW = width / (cols + 1.8);
    const cardH = height / 8;
    
    return {
      cols, rows, marginX, marginY, cardW, cardH,
      startX: (width - (cols * cardW + (cols - 1) * marginX)) / 2 + cardW / 2,
      startY: height * 0.22
    };
  }

  private calculatePlayerPosition(idx: number, config: ReturnType<typeof this.calculateGridConfig>) {
    const col = idx % config.cols;
    const row = Math.floor(idx / config.cols);
    if (row >= config.rows) return { x: 0, y: 0 };

    return {
      x: config.startX + col * (config.cardW + config.marginX),
      y: config.startY + row * (config.cardH + config.marginY)
    };
  }

  private createPlayerCard(
    player: Player,
    x: number,
    y: number,
    config: ReturnType<typeof this.calculateGridConfig>,
    status: { isSurvivor: boolean; isEliminated: boolean; isWinner: boolean }
  ) {
    const container = this.add.container(x, y);
    this.objectPool.containers.push(container);

    const card = this.add.rectangle(0, 0, config.cardW, config.cardH, 
      status.isSurvivor ? 0x00ff00 : status.isEliminated ? 0xff3333 : 0x888888
    ).setOrigin(0.5);
    this.objectPool.cards.push(card);

    const nameText = this.add.text(0, 0, player.nickname, {
      fontSize: '20px',
      color: '#000',
      fontFamily: 'Jua'
    }).setOrigin(0.5);
    this.objectPool.texts.push(nameText);

    container.add([card, nameText]);

    if (status.isEliminated) {
      this.tweens.add({
        targets: [card, nameText],
        alpha: 0.2,
        duration: 800,
        delay: 200
      });
    }

    if (status.isWinner) {
      this.addWinnerEffects(container, config);
    }
  }

  private addWinnerEffects(container: Phaser.GameObjects.Container, config: ReturnType<typeof this.calculateGridConfig>) {
    const border = this.add.rectangle(0, 0, config.cardW + 10, config.cardH + 10)
      .setStrokeStyle(5, 0xffd700)
      .setOrigin(0.5);
    this.objectPool.cards.push(border);

    const crown = this.add.text(0, -config.cardH / 2 - 18, '👑', {
      fontSize: `${Math.round(config.cardH * 0.6)}px`,
      color: '#ffd700',
      fontFamily: 'Jua'
    }).setOrigin(0.5);
    this.objectPool.texts.push(crown);

    container.add([border, crown]);
  }

  private async transitionToNextRound() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    await this.sleep(400);
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private handleVisualizationComplete() {
    if ((this.scene.settings.data as any)?.onFinish) {
      (this.scene.settings.data as any).onFinish();
    }
  }

  private showErrorUI(message: string) {
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      message,
      {
        fontSize: '32px',
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5);
    this.objectPool.texts.push(text);
  }

  private cleanupObjects() {
    this.objectPool.cards.forEach(card => card.destroy());
    this.objectPool.texts.forEach(text => text.destroy());
    this.objectPool.containers.forEach(container => container.destroy());
    this.objectPool.graphics.forEach(graphic => graphic.destroy());
    this.objectPool = { 
      cards: [], 
      texts: [], 
      containers: [], 
      graphics: [] 
    };
    this.children.removeAll();
  }

  shutdown() {
    this.cleanupObjects();
  }

  private shuffle(array: Player[]): Player[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}