import Phaser from "phaser";
import { userStore } from "../../../stores/userStore";
import { addBackgroundImage } from "./addBackgroundImage";
import userWebSocketManager from "../../../modules/UserWebSocketManager";

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
        totalPlayerCount: number
    ) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 각 요소의 높이와 간격 정의
        const titleFontSize = 48;
        const subTitleFontSize = 32;
        const boxHeight = 70;
        const rankBoxHeight = 100;
        const sectionGap = 24; // 요소 간 기본 간격(px)

        // 1. 타이틀
        let currentY = height * 0.1; // 시작 Y좌표 (상단에서 10% 아래)
        const title = this.add
            .text(width / 2, currentY, "🏆 최종 결과 🏆", {
                fontSize: `${titleFontSize}px`,
                color: "#ffffff",
                align: "center",
                fontFamily: "Jua",
            })
            .setOrigin(0.5);

        // 2. 서브 타이틀
        currentY += titleFontSize + sectionGap;
        const subTitle = this.add
            .text(width / 2, currentY, "모든 게임이 종료되었습니다!", {
                fontSize: `${subTitleFontSize}px`,
                color: "#ffffff",
                align: "center",
                fontFamily: "Jua",
            })
            .setOrigin(0.5);

        // 3. 점수 정보 박스
        currentY += subTitleFontSize + sectionGap;
        const scoreBoxWidth = 420;
        const scoreBox = this.add.graphics();
        scoreBox.fillStyle(0x1a223a, 0.85);
        scoreBox.fillRoundedRect(
            width / 2 - scoreBoxWidth / 2,
            currentY,
            scoreBoxWidth,
            boxHeight,
            18
        );
        const scoreText = this.add
            .text(
                width / 2,
                currentY + boxHeight / 2,
                `총 점수: ${totalScore}`,
                {
                    fontFamily: "Jua",
                    fontSize: "28px",
                    color: "#ffe066",
                    align: "center",
                }
            )
            .setOrigin(0.5);

        // 4. 순위 정보 박스
        currentY += boxHeight + sectionGap;
        const rankBoxWidth = 420;
        const rankBox = this.add.graphics();
        rankBox.fillStyle(0x1a223a, 0.85);
        rankBox.fillRoundedRect(
            width / 2 - rankBoxWidth / 2,
            currentY,
            rankBoxWidth,
            rankBoxHeight,
            18
        );
        const rankText = this.add
            .text(
                width / 2,
                currentY + rankBoxHeight / 2,
                `전체 ${totalPlayerCount}명\n최종 순위: ${overallRank}위`,
                {
                    fontFamily: "Jua",
                    fontSize: "28px",
                    color: "#42cafd",
                    align: "center",
                }
            )
            .setOrigin(0.5);

        // 5. 라운드별 순위 타이틀
        currentY += rankBoxHeight + sectionGap;
        const roundTitle = this.add
            .text(width / 2, currentY, `라운드 별 순위`, {
                fontFamily: "Jua",
                fontSize: "32px",
                color: "#ffe066",
                align: "center",
            })
            .setOrigin(0.5);

        // 6. 라운드별 순위 테이블
        currentY += sectionGap;
        this.createFinalRankTable(width / 2, currentY, rankRecord);

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

            const rankText = rank === 0 ? "-" : rank.toString();
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
                    `${rankText}위`,
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

