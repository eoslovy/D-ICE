import Phaser from 'phaser';
import { userStore } from '../../../stores/userStore';
import { addBackgroundImage } from './addBackgroundImage';
import userWebSocketManager from '../../../modules/UserWebSocketManager';

interface EndGameSceneData {
    totalScore: number;
    rankRecord: string;
    overallRank: number;
    totalPlayerCount: number;
}

export class EndGame extends Phaser.Scene {
    constructor() {
        super({ key: "EndGame" });
    }

    init(data: EndGameSceneData) {
        const { totalScore, rankRecord, overallRank, totalPlayerCount } = data;

        console.log("[EndGame] Scene initialized with data:", {
            totalScore,
            rankRecord,
            overallRank,
        });

        //배경
        addBackgroundImage(this);

        this.showFinalResults(
            totalScore,
            rankRecord,
            overallRank,
            totalPlayerCount
        );

        console.log("웹소켓 연결 종료");
        userWebSocketManager.disconnect();
    }
    private showFinalResults(
        totalScore: number,
        rankRecord: string,
        overallRank: number,
        totalPlayerCount: number,
    ) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Title
        this.add
            .text(width / 2, height * 0.12, "🏆 최종 결과 🏆", {
                fontSize: "48px",
                color: "#ffffff",
                align: "center",
                fontFamily: "Jua",
            })
            .setOrigin(0.5);

        //
        this.add
            .text(
                width / 2,
                height * 0.12 + 60,
                "모든 게임이 종료되었습니다!",
                {
                    fontSize: "32px",
                    color: "#ffffff",
                    align: "center",
                    fontFamily: "Jua",
                }
            )
            .setOrigin(0.5);

        // 점수 정보 박스
        const scoreBoxWidth = 420;
        const scoreBoxHeight = 70;
        const scoreBox = this.add.graphics();
        scoreBox.fillStyle(0x1a223a, 0.85);
        scoreBox.fillRoundedRect(
            width / 2 - scoreBoxWidth / 2,
            height * 0.22,
            scoreBoxWidth,
            scoreBoxHeight,
            18
        );

        this.add
            .text(
                width / 2,
                height * 0.22 + scoreBoxHeight / 2,
                `총 점수: ${totalScore}`,
                {
                    fontFamily: "Jua",
                    fontSize: "28px",
                    color: "#ffe066",
                    align: "center",
                }
            )
            .setOrigin(0.5);

        // 순위 정보 박스
        const rankBoxWidth = 420;
        const rankBoxHeight = 100;
        const rankBox = this.add.graphics();
        rankBox.fillStyle(0x1a223a, 0.85);
        rankBox.fillRoundedRect(
            width / 2 - rankBoxWidth / 2,
            height * 0.32,
            rankBoxWidth,
            rankBoxHeight,
            18
        );

        this.add
            .text(
                width / 2,
                height * 0.32 + rankBoxHeight / 2,
                `전체 ${totalPlayerCount}명\n최종 순위: ${overallRank}위`,
                {
                    fontFamily: "Jua",
                    fontSize: "28px",
                    color: "#42cafd",
                    align: "center",
                }
            )
            .setOrigin(0.5);
        this.add
            .text(
                width / 2,
                height * 0.4 + rankBoxHeight / 2,
                `라운드 별 순위`,
                {
                    fontFamily: "Jua",
                    fontSize: "32px",
                    color: "#ffe066",
                    align: "center",
                }
            )
            .setOrigin(0.5);

        // 라운드별 순위 테이블
        this.createFinalRankTable(width / 2, height * 0.45, rankRecord);

        // Main Menu Button
        this.createMenuButton(width / 2, height * 0.9);
    }

    private createFinalRankTable(x: number, y: number, rankRecord: string) {
        // rankRecord: "2|1|3|2|1" 형태라고 가정
        const ranks = rankRecord.split("|").map(Number);
        const tableWidth = 320;
        const rowHeight = 44;

        // 테이블 배경
        const bg = this.add.graphics();
        bg.fillStyle(0x222a3a, 0.7);
        bg.fillRoundedRect(
            x - tableWidth / 2,
            y,
            tableWidth,
            rowHeight * (ranks.length + 1),
            16
        );

        // 헤더
        const headerStyle = {
            fontSize: "32px",
            color: "#ffe066",
            fontFamily: "Jua",
            fontStyle: "bold",
        };
        this.add
            .text(
                x - tableWidth / 2 + 60,
                y + rowHeight / 2,
                "라운드",
                headerStyle
            )
            .setOrigin(0.5);
        this.add
            .text(
                x + tableWidth / 2 - 60,
                y + rowHeight / 2,
                "순위",
                headerStyle
            )
            .setOrigin(0.5);

        // 각 라운드별 순위
        for (let i = 0; i < ranks.length; i++) {
            const round = i + 1;
            const rank = ranks[i];
            const textStyle = {
                fontSize: "28px",
                color:
                    rank === 1
                        ? "#ffd700"
                        : rank === 2
                        ? "#c0c0c0"
                        : rank === 3
                        ? "#cd7f32"
                        : "#ffffff",
                fontFamily: "Jua",
            };
            this.add
                .text(
                    x - tableWidth / 2 + 60,
                    y + rowHeight * (i + 1) + rowHeight / 2,
                    `R${round}`,
                    textStyle
                )
                .setOrigin(0.5);
            this.add
                .text(
                    x + tableWidth / 2 - 60,
                    y + rowHeight * (i + 1) + rowHeight / 2,
                    `${rank}위`,
                    textStyle
                )
                .setOrigin(0.5);
        }
    }

    private createMenuButton(x: number, y: number) {
        const buttonWidth = 200;
        const buttonHeight = 50;

        const button = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x4a4a4a, 1);
        bg.fillRoundedRect(
            -buttonWidth / 2,
            -buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            16
        );

        const text = this.add
            .text(0, 0, "게임 종료", {
                fontSize: "24px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        button.add([bg, text]);
        button.setSize(buttonWidth, buttonHeight);
        button.setInteractive();

        // 임시로 '/select'로 이동하도록 설정

        button.on("pointerdown", () => {
            userStore.getState().reset(); // zustand 상태 초기화
            localStorage.removeItem("userStore"); // userStore 제거

            window.location.href = "/select";
        });
    }
}