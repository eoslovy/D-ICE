export interface POTGConfig {
    width: number;
    height: number;
    fps: number;
    quality: number;
  }
  
  export interface Player {
    userId: string;
    nickname: string;
  }
  
  export interface RoundResult {
    round: number;
    survivors: Player[];
    eliminated: Player[];
    numberSelections?: { [key: number]: Player[] };
  }
  
  export const POTG_DEFAULT_CONFIG: POTGConfig = {
    width: 720,
    height: 1280,
    fps: 30,
    quality: 0.8
  };
  
  // 로깅 유틸리티
  export const logger = {
    info: (message: string, ...args: any[]) => {
      console.log(`[POTG] ${message}`, ...args);
    },
    error: (message: string, error: any) => {
      console.error(`[POTG] ${message}`, error);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[POTG] ${message}`, ...args);
    }
  };