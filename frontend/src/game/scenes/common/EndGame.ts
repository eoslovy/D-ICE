import Phaser from 'phaser';
import { userStore } from '../../../stores/userStore';
import { addBackgroundImage } from './addBackgroundImage';

interface EndGameSceneData {
    totalScore: number;
    rankRecord: string;
    overallRank: number;
}

export class EndGame extends Phaser.Scene {
    constructor() {
        super({ key: 'EndGame' });
    }

    init(data: EndGameSceneData) {
        const { totalScore, rankRecord, overallRank } = data;

        console.log('[EndGame] Scene initialized with data:', {
            totalScore,
            rankRecord,
            overallRank
        });

        //배경
        addBackgroundImage(this);

        this.showFinalResults(totalScore, rankRecord, overallRank);
    }

    private showFinalResults(totalScore: number, rankRecord: string, overallRank: number) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Title
        this.add.text(width / 2, height * 0.2, '최종 결과', {
            fontSize: '48px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Total Score
        this.add.text(width / 2, height * 0.35, `총 점수: ${totalScore}`, {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Overall Rank
        this.add.text(width / 2, height * 0.45, `최종 순위: ${overallRank}위`, {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Rank Record Graph
        this.createRankGraph(width / 2, height * 0.6, rankRecord);

        // Main Menu Button
        this.createMenuButton(width / 2, height * 0.85);
    }

    private createRankGraph(x: number, y: number, rankRecord: string) {
        const ranks = rankRecord.split('|').map(Number);
        const graphWidth = 400;
        const graphHeight = 200;
        const padding = 40;

        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x666666);

        // Y-axis
        graphics.beginPath();
        graphics.moveTo(x - graphWidth / 2, y - graphHeight / 2);
        graphics.lineTo(x - graphWidth / 2, y + graphHeight / 2);
        graphics.strokePath();

        // X-axis
        graphics.beginPath();
        graphics.moveTo(x - graphWidth / 2, y + graphHeight / 2);
        graphics.lineTo(x + graphWidth / 2, y + graphHeight / 2);
        graphics.strokePath();

        // Rank Line
        graphics.lineStyle(3, 0x00ff00);
        graphics.beginPath();

        const stepX = (graphWidth - padding * 2) / (ranks.length - 1);
        const stepY = (graphHeight - padding * 2) / 4; // 1~5위

        ranks.forEach((rank, index) => {
            const pointX = x - graphWidth / 2 + padding + stepX * index;
            const pointY = y - graphHeight / 2 + padding + stepY * (rank - 1);

            if (index === 0) {
                graphics.moveTo(pointX, pointY);
            } else {
                graphics.lineTo(pointX, pointY);
            }

            // Point Marker
            this.add.circle(pointX, pointY, 5, 0x00ff00);

            // X-axis Label (Round Number)
            this.add.text(pointX, y + graphHeight / 2 + 10, `R${index + 1}`, {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0.5, 0);
        });

        graphics.strokePath();

        // Y-axis Labels (Rank)
        for (let i = 1; i <= 5; i++) {
            const labelY = y - graphHeight / 2 + padding + stepY * (i - 1);
            this.add.text(x - graphWidth / 2 - 10, labelY, `${i}위`, {
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(1, 0.5);
        }

        // Graph Title
        this.add.text(x, y - graphHeight / 2 - 20, '라운드별 순위 변화', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }

    private createMenuButton(x: number, y: number) {
        const buttonWidth = 200;
        const buttonHeight = 50;

        const button = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x4a4a4a, 1);
        bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 16);

        const text = this.add.text(0, 0, '게임 종료', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        button.add([bg, text]);
        button.setSize(buttonWidth, buttonHeight);
        button.setInteractive();

        // 임시로 '/select'로 이동하도록 설정
        
        button.on('pointerup', () => {
            userStore.getState().reset(); // zustand 상태 초기화
            localStorage.removeItem('userStore'); // userStore 제거
            window.location.href = '/select';
        });
    }
}