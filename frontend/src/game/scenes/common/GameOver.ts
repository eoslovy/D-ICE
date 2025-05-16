import Phaser from "phaser";
import potgManager from "../../../modules/POTGManager";
import { v7 as uuidv7 } from "uuid";
import { userStore } from "../../../stores/userStore";
import userWebSocketManager from "../../../modules/UserWebSocketManager";
import { UICountdown } from "../../../modules/gameutils/UICountdown";
import { addBackgroundImage } from "./addBackgroundImage";
import { GAME_TYPES } from "./GameType";
// Add interface for scene data
interface GameOverSceneData {
    score?: number;
    gameType?: string;
}

export class GameOver extends Phaser.Scene {
    private roundScore: number = 0;
    private gameType: string = "";
    private backendResponse: AggregatedUserMessage | null = null;
    private uploadStatus: Phaser.GameObjects.Text | null = null;
    private initialGameOverText: Phaser.GameObjects.Text | null = null;
    private initialScoreText: Phaser.GameObjects.Text | null = null;
    private initialLoadingText: Phaser.GameObjects.Text | null = null;
    private initialLoadingTween: Phaser.Tweens.Tween | null = null;
    private countdown?: UICountdown;
    private isLastRound: boolean = false;
    private needVideoUpload: boolean = false; // 업로드 필요 여부 상태 추가
    private gameTypeName: string = "";

    constructor() {
        super({ key: "GameOver" });
    }

    init(data: GameOverSceneData) {
        this.roundScore = data.score || 0;
        this.gameType = data.gameType || "";

        console.log("[GameOver] Scene initialized with data:", {
            score: this.roundScore,
            gameType: this.gameType,
        });

        this.gameTypeName =
            GAME_TYPES.find((type) => type.key === this.gameType)?.name ||
            this.gameType;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // UICountdown 인스턴스 생성
        if (!this.countdown) {
            this.countdown = new UICountdown(this, width / 2, height * 0.8, 64);
        }
        // 초기 화면 표시
        addBackgroundImage(this);
        this.showInitialScreen();
        // Get user data from store
        const userId = userStore.getState().userId;
        const roomCode = userStore.getState().roomCode;
        console.log("[GameOver] User ID:", userId);
        console.log("[GameOver] Room Code:", roomCode);

        // Send score to backend
        this.sendScoreToBackend(userId, roomCode);
        let aggregatedResolved = false;
        const TIMEOUT_DURATION = 40000;

        console.log("[GameOver] 타임아웃 타이머 설정 시작");
        const timeoutId = this.time.delayedCall(TIMEOUT_DURATION, () => {
            console.warn("[GameOver] 타임아웃 트리거됨");
            if (!aggregatedResolved) {
                console.warn(
                    "[GameOver] AGGREGATED_USER 메시지 타임아웃, 다음 Scene으로 이동"
                );
                this.scene.start("Preloader");
            } else {
                console.log("[GameOver] 이미 메시지 받아 처리함");
            }
        });

        // WebSocket 응답 리스너 설정
        console.log("AGGREGATED_USER 이벤트 리스너 등록");
        userWebSocketManager.on(
            "AGGREGATED_USER",
            (payload: AggregatedUserMessage) => {
                console.log("[GameOver] AGGREGATED_USER 메시지 수신");
                if (aggregatedResolved) {
                    console.log("[GameOver] 이미 처리됨. 무시");
                    return;
                }
                aggregatedResolved = true;
                timeoutId.remove(false); // 타임아웃 제거
                console.log("[GameOver] 타임아웃 제거");

                this.backendResponse = payload;
                this.isLastRound = payload.currentRound === payload.totalRound;
                this.needVideoUpload = !!payload.videoUploadUrl;
                this.updateUI();

                if (this.needVideoUpload) {
                    this.handleVideoUpload().then(() => {
                        this.showCountdownAndNext();
                    });
                } else {
                    this.showCountdownAndNext();
                }
            }
        );

        userWebSocketManager.on("ERROR", (payload: ErrorMessage) => {
            console.warn(`[GameOver] ${payload.message}`);
            this.scene.start("Preloader");
        });

        this.events.on("shutdown", () => {
            userWebSocketManager.off("AGGREGATED_USER");
            console.log("AGGREGATED_USER 이벤트 리스너 해제");
            userWebSocketManager.off("ERROR");
        });
    }

    private clearInitialScreen() {
        // 텍스트 오브젝트 파괴
        if (this.initialGameOverText) {
            this.initialGameOverText.destroy();
            this.initialGameOverText = null;
        }
        if (this.initialScoreText) {
            this.initialScoreText.destroy();
            this.initialScoreText = null;
        }
        if (this.initialLoadingText) {
            this.initialLoadingText.destroy();
            this.initialLoadingText = null;
        }
        // 트윈(애니메이션) 중지 및 제거
        if (this.initialLoadingTween) {
            this.initialLoadingTween.stop();
            this.initialLoadingTween.remove();
            this.initialLoadingTween = null;
        }
    }

    private showCountdownAndNext() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // UICountdown 표시
        this.countdown?.startCountdown(15);

        // "다음 게임" 버튼 표시
        let preloaderButton: Phaser.GameObjects.Container | undefined;
        const removeButton = () => {
            if (preloaderButton) {
                preloaderButton.destroy();
                preloaderButton = undefined;
            }
        };
        preloaderButton = this.createPreloaderButton(width / 2, height * 0.9);

        let finished = false;
        const goNext = () => {
            if (finished) return;
            finished = true;
            this.countdown?.stopCountdown(false);
            removeButton();
            if (this.isLastRound) {
                this.EndGame();
            } else {
                this.scene.start("Preloader");
            }
        };

        preloaderButton.on("pointerdown", goNext);
        this.events.once("countdownFinished", goNext);
    }

    private showInitialScreen() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 게임 오버 텍스트
        this.initialGameOverText = this.add
            .text(width / 2, height * 0.3, "게임 종료!", {
                fontFamily: "Jua",
                fontSize: "48px",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // 내 점수
        this.initialScoreText = this.add
            .text(width / 2, height * 0.4, `내 점수: ${this.roundScore}`, {
                fontFamily: "Jua",
                fontSize: "32px",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // 로딩 텍스트
        this.initialLoadingText = this.add
            .text(width / 2, height * 0.5, "통계를 불러오는 중...", {
                fontFamily: "Jua",
                fontSize: "24px",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // 로딩 애니메이션 (트윈도 변수에 저장)
        this.initialLoadingTween = this.tweens.add({
            targets: this.initialLoadingText,
            alpha: 0.5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
        });
    }

    private updateUI() {
        if (!this.backendResponse) return;

        this.clearInitialScreen();

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 제목
        this.add
            .text(width / 2, height * 0.15, `${this.gameTypeName}`, {
                fontFamily: "Jua",
                fontSize: "48px",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        // 라운드 정보
        this.add
            .text(
                width / 2,
                height * 0.25,
                `현재 라운드: ${this.backendResponse.currentRound}/${this.backendResponse.totalRound}`,
                {
                    fontFamily: "Jua",
                    fontSize: "32px",
                    color: "#ffffff",
                    align: "center",
                }
            )
            .setOrigin(0.5);

        // 점수 정보 (가독성 개선)
        const scoreBox = this.add.graphics();
        const scoreBoxWidth = 420;
        const scoreBoxHeight = 70;
        scoreBox.fillStyle(0x1a223a, 0.85);
        scoreBox.fillRoundedRect(
            width / 2 - scoreBoxWidth / 2,
            height * 0.33,
            scoreBoxWidth,
            scoreBoxHeight,
            18
        );

        const text = `라운드가 지날 수록 배점이 올라가요!!`;
        this.add
            .text(width / 2, height * 0.33 - 40, text, {
                fontFamily: "Jua",
                fontSize: "32px",
                color: "#FFFFFF",
                align: "center",
            })
            .setOrigin(0.5);

        const scoreText = `라운드 점수: ${this.backendResponse.currentScore}    전체 점수: ${this.backendResponse.totalScore}`;
        this.add
            .text(width / 2, height * 0.33 + scoreBoxHeight / 2, scoreText, {
                fontFamily: "Jua",
                fontSize: "26px",
                color: "#ffe066",
                align: "center",
            })
            .setOrigin(0.5);

        // 순위 정보 (가독성 개선)
        const rankBox = this.add.graphics();
        const rankBoxWidth = 420;
        const rankBoxHeight = 70;
        rankBox.fillStyle(0x1a223a, 0.85);
        rankBox.fillRoundedRect(
            width / 2 - rankBoxWidth / 2,
            height * 0.43,
            rankBoxWidth,
            rankBoxHeight,
            18
        );

        const rankText = `라운드 순위: ${this.backendResponse.roundRank}위    전체 순위: ${this.backendResponse.overallRank}위`;
        this.add
            .text(width / 2, height * 0.43 + rankBoxHeight / 2, rankText, {
                fontFamily: "Jua",
                fontSize: "26px",
                color: "#42cafd",
                align: "center",
            })
            .setOrigin(0.5);

        // 라운드별 순위 그래프
        this.createRankTable(width / 2, height * 0.55);

        // 업로드 상태 텍스트 생성 (handleVideoUpload 메서드 내에서)
        if (this.needVideoUpload) {
            this.uploadStatus = this.add
                .text(width / 2, height * 0.85, "게임 영상 업로드 중...", {
                    fontFamily: "Jua",
                    fontSize: "20px",
                    color: "#ffffff",
                    align: "center",
                })
                .setOrigin(0.5);
        }
    }

    private createRankTable(x: number, y: number) {
        if (!this.backendResponse || !this.backendResponse.roundRanking) return;

        // roundRanking: [{ nickname: string, score: number }, ...] 형태라고 가정
        const roundRanking = this.backendResponse.roundRanking as {
            nickname: string;
            score: number;
        }[];
        const tableWidth = 400;
        const rowHeight = 48;
        const colWidths = [60, 200, 120]; // 순위, 닉네임, 점수

        // 테이블 배경
        const bg = this.add.graphics();
        bg.fillStyle(0x222a3a, 0.7);
        bg.fillRoundedRect(
            x - tableWidth / 2,
            y,
            tableWidth,
            rowHeight * 4,
            16
        );

        // 헤더
        const headerStyle = {
            fontSize: "22px",
            color: "#ffe066",
            fontFamily: "Jua",
            fontStyle: "bold",
        };
        this.add
            .text(
                x - tableWidth / 2 + colWidths[0] / 2,
                y + rowHeight / 2,
                "순위",
                headerStyle
            )
            .setOrigin(0.5);
        this.add
            .text(
                x - tableWidth / 2 + colWidths[0] + colWidths[1] / 2,
                y + rowHeight / 2,
                "닉네임",
                headerStyle
            )
            .setOrigin(0.5);
        this.add
            .text(
                x -
                    tableWidth / 2 +
                    colWidths[0] +
                    colWidths[1] +
                    colWidths[2] / 2,
                y + rowHeight / 2,
                "점수",
                headerStyle
            )
            .setOrigin(0.5);

        // 상위 3등만 표시
        for (let i = 0; i < 3; i++) {
            const entry = roundRanking[i];
            const rowY = y + rowHeight * (i + 1) + rowHeight / 2;
            const textStyle = {
                fontSize: "20px",
                color:
                    i === 0
                        ? "#ffd700"
                        : i === 1
                        ? "#c0c0c0"
                        : i === 2
                        ? "#cd7f32"
                        : "#fff",
                fontFamily: "Jua",
            };

            this.add
                .text(
                    x - tableWidth / 2 + colWidths[0] / 2,
                    rowY,
                    `${i + 1}`,
                    textStyle
                )
                .setOrigin(0.5);
            this.add
                .text(
                    x - tableWidth / 2 + colWidths[0] + colWidths[1] / 2,
                    rowY,
                    entry?.nickname ?? "-",
                    textStyle
                )
                .setOrigin(0.5);
            this.add
                .text(
                    x -
                        tableWidth / 2 +
                        colWidths[0] +
                        colWidths[1] +
                        colWidths[2] / 2,
                    rowY,
                    entry?.score !== undefined ? String(entry.score) : "-",
                    textStyle
                )
                .setOrigin(0.5);
        }
    }

    private async handleVideoUpload() {
        if (!this.needVideoUpload || !this.backendResponse?.videoUploadUrl) {
            console.log("[GameOver] No video upload URL provided");
            return;
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 업로드 시작 전에 '업로드 중' 상태 표시
        if (this.uploadStatus) {
            this.uploadStatus.destroy();
            this.uploadStatus = null;
        }
        this.uploadStatus = this.add
            .text(width / 2, height * 0.7, "게임 영상 업로드 중...", {
                fontFamily: "Jua",
                fontSize: "20px",
                color: "#ffffff",
                align: "center",
            })
            .setOrigin(0.5);

        try {
            console.log("[GameOver] Starting video upload...");

            // 타임아웃 처리를 위한 Promise.race 사용
            const uploadWithTimeout = Promise.race([
                potgManager.uploadRecording(
                    this.backendResponse.videoUploadUrl
                ),
                new Promise(
                    (_, reject) =>
                        setTimeout(
                            () => reject(new Error("Upload timeout")),
                            10000
                        ) // 10초 타임아웃
                ),
            ]);

            const success = await uploadWithTimeout;

            // 기존 업로드 상태 메시지 제거
            if (this.uploadStatus) {
                this.uploadStatus.destroy();
                this.uploadStatus = null;
            }

            if (success) {
                this.uploadStatus = this.add
                    .text(width / 2, height * 0.7, "게임 영상 업로드 완료!", {
                        fontFamily: "Jua",
                        fontSize: "20px",
                        color: "#00ff00",
                        align: "center",
                    })
                    .setOrigin(0.5);
                // 3초 후 텍스트 페이드 아웃
                this.time.delayedCall(3000, () => {
                    if (this.uploadStatus) {
                        this.tweens.add({
                            targets: this.uploadStatus,
                            alpha: 0,
                            duration: 1000,
                            onComplete: () => {
                                if (this.uploadStatus) {
                                    this.uploadStatus.destroy();
                                    this.uploadStatus = null;
                                }
                            },
                        });
                    }
                });
            } else {
                this.uploadStatus = this.add
                    .text(width / 2, height * 0.7, "게임 영상 업로드 실패", {
                        fontFamily: "Jua",
                        fontSize: "20px",
                        color: "#ff0000",
                        align: "center",
                    })
                    .setOrigin(0.5);
            }
        } catch (error) {
            console.error("[GameOver] Video upload error:", error);
            if (this.uploadStatus) {
                this.uploadStatus.destroy();
                this.uploadStatus = null;
            }

            // 에러 메시지 구체화
            let errorMessage = "게임 영상 업로드 실패";
            if (error instanceof Error) {
                if (error.message === "Upload timeout") {
                    errorMessage = "업로드 시간 초과";
                } else if (error.message.includes("No recording available")) {
                    errorMessage = "녹화된 영상 없음";
                }
            }

            this.uploadStatus = this.add
                .text(width / 2, height * 0.7, errorMessage, {
                    fontFamily: "Jua",
                    fontSize: "20px",
                    color: "#ff0000",
                    align: "center",
                })
                .setOrigin(0.5);
        }
    }
    private EndGame() {
        if (!this.backendResponse) {
            console.error(
                "[GameOver] No backend response available to end the game."
            );
            return;
        }

        // Pass totalScore, rankRecord, and overallRank to the EndGame scene
        this.scene.start("EndGame", {
            totalScore: this.backendResponse.totalScore,
            rankRecord: this.backendResponse.rankRecord,
            overallRank: this.backendResponse.overallRank,
            totalPlayerCount: this.backendResponse.totalPlayerCount,
        });
    }

    private createPreloaderButton(x: number, y: number) {
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
            .text(0, 0, "다음 게임", {
                fontFamily: "Jua",
                fontSize: "24px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        button.add([bg, text]);
        button.setSize(buttonWidth, buttonHeight);
        button.setInteractive();

        return button;
    }

    private sendScoreToBackend(userId: string | null, roomCode: string | null) {
        if (userId == null || roomCode == null) {
            console.error("[GameOver] Missing userId or roomCode from store");
            return;
        }

        const message = {
            type: "SUBMIT",
            requestId: uuidv7(),
            userId,
            score: this.roundScore,
            gameType: this.gameType,
        };

        console.log("[GameOver] Sending score to backend:", message);
        const success = userWebSocketManager.send(message);
        console.log(
            "[GameOver] Score send result:",
            success ? "Success" : "Failed"
        );
    }
}

