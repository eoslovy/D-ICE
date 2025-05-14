import Phaser from 'phaser';
import { NumberSurvivorPOTGScene } from './NumberSurvivorPOTGScene';
import potgManager from './POTGManager';
import { POTGConfig, POTG_DEFAULT_CONFIG, RoundResult, logger } from '../types/potg';

class NumberSurvivorPOTGService {
  private offscreenContainer: HTMLDivElement;
  private offscreenGame: Phaser.Game | null = null;
  private isRecording: boolean = false;
  private abortController: AbortController | null = null;
  private config: POTGConfig;

  constructor(config: Partial<POTGConfig> = {}) {
    this.config = { ...POTG_DEFAULT_CONFIG, ...config };
    this.offscreenContainer = document.createElement('div');
    this.offscreenContainer.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      width: ${this.config.width}px;
      height: ${this.config.height}px;
      visibility: hidden;
    `;
    document.body.appendChild(this.offscreenContainer);
  }

  // 오프스크린 씬을 시작하여 시각화 애니메이션을 녹화합니다.
  async startRecording(roundResults: RoundResult[]): Promise<void> {
    if (this.isRecording) {
      return;
    }
    this.abortController = new AbortController();
    try {
      this.isRecording = true;
      await this.cleanupExistingGame();
      await this.initializeGame();
      await this.startRecordingProcess(roundResults);
    } catch (error: unknown) {
      logger.error('POTG 녹화 실패', error);
      if (error instanceof Error && error.name === 'AbortError') {
        // 필요시만 info
      }
      throw error;
    } finally {
      this.cleanup();
    }
  }

  private async cleanupExistingGame(): Promise<void> {
    if (this.offscreenGame) {
      try {
        this.offscreenGame.destroy(true);
      } catch (error) {
        logger.error('기존 게임 인스턴스 정리 중 오류', error);
      }
      this.offscreenGame = null;
    }
  }

  private async initializeGame(): Promise<void> {
    this.offscreenGame = new Phaser.Game({
      type: Phaser.AUTO,
      width: this.config.width,
      height: this.config.height,
      parent: this.offscreenContainer,
      scene: [NumberSurvivorPOTGScene],
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      transparent: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });

    // 게임 인스턴스 초기화 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async startRecordingProcess(roundResults: RoundResult[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 오프스크린 Phaser 인스턴스의 canvas를 찾음
        const canvas = this.offscreenContainer.querySelector('canvas');
        if (!canvas) {
          const err = new Error('오프스크린 canvas를 찾을 수 없습니다.');
          logger.error('오프스크린 canvas를 찾을 수 없습니다.', err);
          reject(err);
          return;
        }

        potgManager.startOffscreenCanvasRecording(canvas, this.config.fps)
          .then((success) => {
            if (success) {
              if (this.abortController) {
                this.abortController.signal.addEventListener('abort', () => {
                  potgManager.stopRecording()
                    .then(() => {
                      reject(new Error('녹화가 중단되었습니다.'));
                    })
                    .catch(error => {
                      logger.error('녹화 중단 중 오류', error);
                      reject(error);
                    });
                });
              }

              this.offscreenGame?.scene.start('NumberSurvivorPOTG', {
                roundData: roundResults,
                onFinish: async () => {
                  try {
                    await potgManager.stopRecording();
                    resolve();
                  } catch (error) {
                    logger.error('녹화 종료 중 오류', error);
                    reject(error);
                  }
                }
              });
            } else {
              const err = new Error('오프스크린 녹화 시작 실패');
              logger.error('오프스크린 녹화 시작 실패', err);
              reject(err);
            }
          })
          .catch(error => {
            logger.error('오프스크린 녹화 시작 중 오류', error);
            reject(error);
          });
      } catch (error) {
        logger.error('녹화 프로세스 초기화 중 오류', error);
        reject(error);
      }
    });
  }

  abortRecording(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.cleanupExistingGame();
    this.isRecording = false;
    this.abortController = null;
  }

  // 서비스 사용이 끝난 후 호출하여 DOM 요소를 정리합니다.
  destroy(): void {
    try {
      this.cleanup();
      if (this.offscreenContainer?.parentNode) {
        this.offscreenContainer.remove();
      }
    } catch (error) {
      logger.error('destroy 중 오류:', error);
    }
  }
}

// 싱글톤 인스턴스 export
const numberSurvivorPOTGService = new NumberSurvivorPOTGService();
export default numberSurvivorPOTGService;